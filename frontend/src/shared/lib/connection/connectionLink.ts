import { ApolloLink, Observable } from '@apollo/client';

import { observeRequest } from './connectionStore';

/**
 * Одна ссылка — и связь наблюдается во всём продукте.
 *
 * 🔴 ПОЧЕМУ ЗДЕСЬ, А НЕ НА ЭКРАНАХ. Наряд требует ОДИН механизм на весь продукт. Экранов
 * десятки, и «добавить проверку связи» на каждый — это гарантия, что на половине её забудут,
 * а на второй половине она будет разной. Через сеть проходит всё, что продукт делает;
 * измерять надо здесь.
 *
 * ⚠️ Различаем «не дошло» и «дошло и отказали». Отказ сервера — это РАБОТАЮЩАЯ связь; красить
 * канал в «нет сети» из-за отказа в правах значит врать человеку о его вайфае. Ровно это
 * различение уже сделано в `requestFailure.ts`, и слова здесь те же.
 */
export const connectionLink = new ApolloLink((operation, forward) => {
  const started = Date.now();
  return new Observable((observer) => {
    const subscription = forward(operation).subscribe({
      next: (result) => {
        observeRequest({ reached: true, ms: Date.now() - started });
        observer.next(result);
      },
      error: (error: unknown) => {
        const networkError = (error as { networkError?: unknown } | null)?.networkError;
        observeRequest({ reached: !networkError, ms: Date.now() - started });
        observer.error(error);
      },
      complete: () => observer.complete(),
    });
    return () => subscription.unsubscribe();
  });
});
