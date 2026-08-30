/**
 * Подпись токена LiveKit — функция Cloudflare Pages.
 *
 * Тот же путь, что `backend/room/views.py`, и те же слова в отказах: комната — это код,
 * участник — имя, которое он сам себе написал. Разница одна: здесь нет сервера вовсе.
 * Django остаётся для разработки; на боевом за один этот путь платить машиной не за что,
 * а сервер 82.147.71.204 решением владельца не трогается.
 *
 * Секреты живут в переменных окружения проекта Pages и в репозиторий не попадают:
 *   LIVEKIT_URL · LIVEKIT_API_KEY · LIVEKIT_API_SECRET
 */

const ROOM_CODE = /^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$/;
const NAME_MAX = 40;
const TTL_HOURS = 6;

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signJwt(payload, secret) {
  const enc = new TextEncoder();
  const head = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const data = head + '.' + body;
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return data + '.' + b64url(new Uint8Array(sig));
}

/** Отказ называет причину словами. «Что-то пошло не так» запрещено. */
const bad = (reason, status = 400) =>
  new Response(JSON.stringify({ error: reason }), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

async function mint({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return bad('Запрос не разобран: ожидался JSON.');
  }

  const room = String(body.room ?? '').trim().toLowerCase();
  const name = String(body.name ?? '').split(/\s+/).filter(Boolean).join(' ').slice(0, NAME_MAX);

  if (!ROOM_CODE.test(room)) return bad('Код комнаты не похож на код: ждём три группы по четыре знака.');
  if (!name) return bad('Не сказано, как вас зовут.');

  const url = env.LIVEKIT_URL, apiKey = env.LIVEKIT_API_KEY, secret = env.LIVEKIT_API_SECRET;
  if (!url || !secret) {
    // Молчаливая выдача токена, который LiveKit отклонит, — худший вид отказа:
    // человек видит «подключаемся» и не узнаёт, что подключаться некуда.
    return bad('Медиасервер не настроен: у страницы пустые LIVEKIT_*.', 503);
  }

  // Опознаватель уникален в комнате, имя — нет: двух Ань никто не запрещал.
  const rnd = new Uint8Array(9);
  crypto.getRandomValues(rnd);
  const identity = b64url(rnd);

  const now = Math.floor(Date.now() / 1000);
  const token = await signJwt({
    iss: apiKey || 'devkey',
    sub: identity,
    name,
    nbf: now,
    iat: now,
    exp: now + TTL_HOURS * 3600,
    video: { room, roomJoin: true, canPublish: true, canSubscribe: true, hidden: false },
  }, secret);

  return new Response(JSON.stringify({ token, url, identity, name }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/* 🔴 Замер на предпросмотре 30.08: GET на этот путь отдавал 200 и HTML-страницу.
   Ожидалось 405. Причина: Pages вызывает файл функции только если для метода есть
   обработчик; для остальных методов путь проваливается в статику и ловится
   SPA-правилом `/* /index.html 200` из `public/_redirects`. То есть служебный путь
   врал: на запрос не тем методом он отвечал «всё хорошо» и присылал страницу.

   Поэтому здесь один ловящий все методы `onRequest`, который сам разбирает метод. */
export const onRequest = (ctx) =>
  ctx.request.method === 'POST'
    ? mint(ctx)
    : bad('Этот путь отвечает только на POST.', 405);
