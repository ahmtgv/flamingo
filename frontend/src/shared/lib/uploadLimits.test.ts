import { describe, expect, it } from 'vitest';

import { acceptAttribute, formatBytes, kindKeys, refuse } from './uploadLimits';

/**
 * Ограничения загрузки — находка владельца 15.08, п.3: «скажи их человеку ДО попытки, а не
 * после». Проверяется именно это: отказ случается на выборе файла, называет число, и не
 * случается там, где решать должен сервер.
 */

const MB = 1024 * 1024;
const MATERIAL = {
  maxBytes: 500 * MB,
  contentTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ],
};

const file = (over: Partial<{ name: string; size: number; type: string }> = {}) => ({
  name: 'lesson.mp4',
  size: 40 * MB,
  type: 'video/mp4',
  ...over,
});

describe('что можно загрузить', () => {
  it('🔴 видео проходит — ради этого правка и делалась', () => {
    expect(refuse(file(), MATERIAL)).toBeNull();
  });

  it('слишком большой файл отбивается ДО загрузки и с числами', () => {
    const refusal = refuse(file({ size: 600 * MB }), MATERIAL);
    expect(refusal).toEqual({ reason: 'too-large', size: 600 * MB, max: 500 * MB });
  });

  it('ровно потолок — это ещё можно: порог не «меньше», а «не больше»', () => {
    expect(refuse(file({ size: 500 * MB }), MATERIAL)).toBeNull();
  });

  it('чужой тип назван типом, а не общей фразой', () => {
    expect(refuse(file({ name: 'x.exe', type: 'application/x-msdownload' }), MATERIAL)).toEqual({
      reason: 'bad-type',
      type: 'application/x-msdownload',
    });
  });

  it('браузер не узнал тип — решает сервер, а не мы наугад', () => {
    // Пустой `type` — это «не знаю», а не «запрещено». Запретить по незнанию значит не пустить
    // человека с файлом, который на самом деле в порядке.
    expect(refuse(file({ name: 'notes', type: '' }), MATERIAL)).toBeNull();
  });

  it('политика ещё не приехала — не запрещаем', () => {
    expect(refuse(file({ size: 900 * MB }), null)).toBeNull();
  });
});

describe('как правила выглядят словами', () => {
  it('типы сворачиваются в семейства, а не в список MIME', () => {
    // «video/mp4, video/webm, video/quicktime» на экране — это отписка, а не помощь.
    expect(kindKeys(MATERIAL.contentTypes)).toEqual(['video', 'image', 'pdf', 'text']);
  });

  it('неизвестное семейство не проглатывается молча', () => {
    expect(kindKeys(['application/zip'])).toEqual(['other']);
  });

  it('размер читается человеком', () => {
    expect(formatBytes(500 * MB)).toBe('500 МБ');
    expect(formatBytes(Math.round(2.1 * MB))).toBe('2,1 МБ');
    expect(formatBytes(800 * 1024)).toBe('800 КБ');
  });

  it('accept собирается из той же политики — диалог и текст не расходятся', () => {
    expect(acceptAttribute(['video/mp4', 'application/pdf'])).toBe('video/mp4,application/pdf');
  });
});
