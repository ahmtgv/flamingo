import { createContext, useContext } from 'react';

/**
 * How the room hands its switchers to the frame (atlas sheet D1).
 *
 * Sheet D1, owner edit 14.08: «Переключатели окон и раскладки класса подняты в неё — отдельной
 * строки над сценой больше не существует.» So the strip has to draw controls that belong to the
 * lesson, and the frame must not know what a «Методичка» is to do it — a frame that did would
 * need changing every time the lesson gains a window.
 *
 * 🔴 ПЕРЕДЕЛАНО НА ПОРТАЛ (аудит 17.08). Прежняя версия отдавала раме `ReactNode` через
 * `setControls`, и её не вызывал НИ ОДИН экран: `useFrameControls` был экспортирован и мёртв,
 * `DesktopFrame` рисовал `controls`, которых всегда `null`, а комната продолжала рисовать свою
 * строку над сценой — то есть ровно то, что лист отменил.
 *
 * Причина, по которой её так и не подключили, видна из подписи: узел надо было положить в
 * состояние рамы, а он пересобирается на каждый рендер комнаты — эффект, зависящий от узла,
 * зацикливается, а эффект, зависящий от «дешёвого ключа», публикует устаревший узел. Портал
 * снимает выбор: рама объявляет МЕСТО, комната рисует в него своим деревом, обновления идут
 * сами.
 */

/** Куда рама пускает управление урока. `null` — рамы нет (вкладка браузера) или урок не идёт. */
export const ControlsContext = createContext<HTMLElement | null>(null);

/**
 * Место в полосе состояния, куда комната кладёт переключатели окон.
 *
 * `null` значит «класть некуда» — и это не отказ, а разрешение нарисовать их у себя: в браузере
 * рамы нет вовсе, а вне урока полосы состояния нет по решению владельца («пустая строка с
 * прочерками это шум»).
 */
export function useFrameControls(): HTMLElement | null {
  return useContext(ControlsContext);
}
