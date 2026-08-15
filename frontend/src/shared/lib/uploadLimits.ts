/**
 * Правила загрузки — словами и числами, ДО попытки (находка владельца 15.08, п.3).
 *
 * 🔴 Что чинится: правила жили только на сервере и срабатывали ПОСЛЕ выбора файла. Человек
 * выбирал ролик, ждал, и получал отказ — да ещё английской строкой из сервиса. Про видео он
 * при этом не мог узнать заранее ничего: список типов был только в атрибуте `accept`, который
 * молча прячет файлы в диалоге и ничего не объясняет.
 *
 * Числа приходят с сервера (`uploadPolicy`) и не дублируются здесь константой: дубль разошёлся
 * бы с политикой в первый же раз, когда потолок подняли, и разошёлся бы молча.
 */

/** Мегабайт — та же единица, в которой считает сервер (1024·1024), чтобы числа сходились. */
const MB = 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes >= MB) {
    const mb = bytes / MB;
    // «500 МБ», но «2,1 МБ» — целые числа без хвоста читаются как порог, дробные как размер.
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace('.', ',')} МБ`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}

/**
 * Семейства типов — для человека, а не список MIME.
 *
 * «video/mp4, video/webm, video/quicktime» на экране формы — это не помощь, это отписка.
 * Порядок фиксированный: список не должен менять форму от того, в каком порядке сервер
 * перечислил типы.
 */
const FAMILIES: { key: string; test: (ct: string) => boolean }[] = [
  { key: 'video', test: (ct) => ct.startsWith('video/') },
  { key: 'audio', test: (ct) => ct.startsWith('audio/') },
  { key: 'image', test: (ct) => ct.startsWith('image/') },
  { key: 'pdf', test: (ct) => ct === 'application/pdf' },
  { key: 'text', test: (ct) => ct.startsWith('text/') },
];

export function kindKeys(contentTypes: readonly string[]): string[] {
  const keys = FAMILIES.filter((f) => contentTypes.some(f.test)).map((f) => f.key);
  const covered = new Set(
    contentTypes.filter((ct) => FAMILIES.some((f) => f.test(ct))),
  );
  if (covered.size < contentTypes.length) keys.push('other');
  return keys;
}

export type UploadRefusal =
  | { reason: 'too-large'; size: number; max: number }
  | { reason: 'bad-type'; type: string }
  | null;

/**
 * Можно ли грузить этот файл — решается ЗДЕСЬ, до запроса ссылки.
 *
 * Пустой `contentTypes` означает «политика ещё не приехала»: тогда не запрещаем — сервер
 * проверит сам. Запретить по незнанию хуже, чем пропустить и получить честный отказ.
 */
export function refuse(
  file: { name: string; size: number; type: string },
  policy: { maxBytes: number; contentTypes: readonly string[] } | null,
): UploadRefusal {
  if (!policy) return null;
  if (policy.maxBytes > 0 && file.size > policy.maxBytes) {
    return { reason: 'too-large', size: file.size, max: policy.maxBytes };
  }
  // Пустой `type` даёт браузер, когда не узнал файл по расширению. Это не «запрещённый тип» —
  // это «не знаю»; пусть решает сервер, который смотрит на сам объект.
  if (file.type && policy.contentTypes.length > 0 && !policy.contentTypes.includes(file.type)) {
    return { reason: 'bad-type', type: file.type };
  }
  return null;
}

/** Значение для `accept` — из той же политики, чтобы диалог и текст не расходились. */
export function acceptAttribute(contentTypes: readonly string[]): string {
  return contentTypes.join(',');
}
