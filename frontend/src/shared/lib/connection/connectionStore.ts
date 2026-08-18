import { useSyncExternalStore } from 'react';

import { type ConnectionWord, type Observation, WINDOW, connectionWord, settle } from './connection';

/**
 * Одно место, куда стекаются наблюдения о связи, и одно, откуда их читают экраны.
 *
 * 🔴 ПОЧЕМУ НЕ REDUX. Сюда пишет ссылка Apollo — слой сети, не компонент. Тащить в него
 * `dispatch` значило бы связать сетевой слой с хранилищем экранов ради одного флага. Это не
 * состояние интерфейса и не серверные данные (§6 CLAUDE.md), это наблюдение за средой; тот
 * же приём уже применён для сессии (`shared/lib/session.ts`) и для маяка приложения.
 */

let state: { word: ConnectionWord; since: number } = { word: 'unmeasured', since: 0 };
let recent: Observation[] = [];
const listeners = new Set<() => void>();

/** ⚠️ Ссылка обязана быть стабильной между изменениями, иначе `useSyncExternalStore` зациклится. */
let snapshot: ConnectionSnapshot = { word: 'unmeasured', since: 0 };

export interface ConnectionSnapshot {
  word: ConnectionWord;
  /** С какого момента слово держится, мс эпохи. 0 — «всегда». */
  since: number;
}

function browserOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function recompute(now: number): void {
  const next = settle(state, connectionWord({ browserOnline: browserOnline(), recent }), now);
  if (next.word === state.word && next.since === state.since) return;
  state = next;
  snapshot = { word: next.word, since: next.since };
  for (const listener of listeners) listener();
}

/**
 * Записать наблюдение. Зовётся из сетевой ссылки на КАЖДЫЙ запрос — это и делает механизм
 * общим для всего продукта, без единой строчки на экранах.
 */
export function observeRequest(observation: Observation, now = Date.now()): void {
  recent = [...recent, observation].slice(-WINDOW);
  recompute(now);
}

/** События браузера: `offline` — единственный источник, которому верим сразу. */
export function watchBrowserNetwork(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onChange = () => recompute(Date.now());
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function subscribeConnection(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getConnection(): ConnectionSnapshot {
  return snapshot;
}

/** Только для тестов: вернуть прибор в исходное. */
export function resetConnection(): void {
  state = { word: 'unmeasured', since: 0 };
  recent = [];
  snapshot = { word: 'unmeasured', since: 0 };
  for (const listener of listeners) listener();
}

export function useConnection(): ConnectionSnapshot {
  return useSyncExternalStore(subscribeConnection, getConnection, getConnection);
}

/**
 * КТО ГОВОРИТ О СВЯЗИ ПРЯМО СЕЙЧАС.
 *
 * Механизм один, но мест, где он показан, два: тихая строка в раме (все экраны) и заметная
 * в уроке. Обе сразу — это две строки об одном и том же в одном окне; владелец просил ОДНУ.
 * Пока урок держит громкую, рама молчит.
 */
let loudClaims = 0;
const loudListeners = new Set<() => void>();

export function claimLoudConnection(): () => void {
  loudClaims += 1;
  for (const l of loudListeners) l();
  return () => {
    loudClaims -= 1;
    for (const l of loudListeners) l();
  };
}

export function useLoudConnectionClaimed(): boolean {
  return useSyncExternalStore(
    (listener) => {
      loudListeners.add(listener);
      return () => loudListeners.delete(listener);
    },
    () => loudClaims > 0,
    () => false,
  );
}
