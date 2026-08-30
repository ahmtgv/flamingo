/** Живость без базы: здоровье, зависящее от базы, врёт диагнозом при её падении. */
export const onRequestGet = ({ env }) =>
  new Response(JSON.stringify({
    ok: true,
    livekit: Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_SECRET),
  }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
