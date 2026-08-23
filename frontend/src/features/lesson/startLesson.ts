import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useStartSessionMutation } from '@/entities/graphql/generated';
import { failureText, serverMessage } from '@/shared/lib/requestFailure';

/**
 * Начать урок — ОДИН путь на весь продукт.
 *
 * 🔴 НАЙДЕНО НА ЖИВОЙ МАШИНЕ 23.08 (наряд 47 §1). Кнопка «Начать урок» на стартовой и
 * «Начать занятие» в кабинете делали только `navigate` в комнату. Мутацию `startSession`
 * не звал никто: занятие оставалось `SCHEDULED`, преподаватель попадал в комнату, где
 * написано «Занятие сейчас не идёт — эфир недоступен», а кнопки запуска внутри комнаты нет.
 * То есть нажатие выглядело сработавшим и не начинало урок.
 *
 * Правило теперь одно: **сначала ответ сервера, потом переход**. Перейти в комнату раньше
 * ответа — это снова показать человеку исправную на вид комнату, в которой ничего не идёт.
 *
 * Отказ произносится словами сервера, если он их дал: «занятие уже идёт», «это не ваше
 * занятие» лечатся по-разному, и общее «не получилось» отправило бы человека не туда.
 */
export function useStartLesson() {
  const navigate = useNavigate();
  const [startSession, { loading }] = useStartSessionMutation();
  const [failed, setFailed] = useState<string | null>(null);

  /**
   * @param sessionId занятие, которое начинаем
   * @param alreadyLive урок уже идёт — тогда мутацию не зовём, просто входим
   */
  async function start(sessionId: string, alreadyLive = false) {
    setFailed(null);
    if (alreadyLive) {
      navigate(`/sessions/${sessionId}/room`);
      return;
    }
    try {
      await startSession({ variables: { sessionId } });
      navigate(`/sessions/${sessionId}/room`);
    } catch (error) {
      // Остаёмся на месте: комната без начатого занятия — тупик, из которого человек
      // 23.08 выходил закрытием приложения.
      setFailed(serverMessage(error) ?? failureText(error));
    }
  }

  return { start, starting: loading, failed, clearFailure: () => setFailed(null) };
}
