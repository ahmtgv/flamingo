import { createContext, type ReactNode, useContext } from 'react';

/**
 * How the room hands its switchers to the frame (atlas sheet D1).
 *
 * Sheet D1, owner edit 14.08: «Переключатели окон и раскладки класса подняты в неё — отдельной
 * строки над сценой больше не существует.» So the strip has to draw controls that belong to the
 * lesson, and the frame must not know what a «Методичка» is to do it — a frame that did would
 * need changing every time the lesson gains a window.
 *
 * Context rather than props because the room sits several routes below the frame; threading a
 * ReactNode through the router would put the lesson's vocabulary into every layer in between.
 */
export interface FrameControls {
  controls: ReactNode;
  setControls: (node: ReactNode) => void;
}

export const ControlsContext = createContext<FrameControls | null>(null);

/** Publish the lesson's switchers into the status strip. A no-op in a browser tab. */
export function useFrameControls(): FrameControls['setControls'] {
  return useContext(ControlsContext)?.setControls ?? (() => {});
}
