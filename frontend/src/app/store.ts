import { configureStore } from '@reduxjs/toolkit';

import uiReducer, { THEME_STORAGE_KEY } from './uiSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
  },
});

// Persist the theme choice across sessions (UI-only state).
store.subscribe(() => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, store.getState().ui.theme);
  } catch {
    /* storage unavailable */
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
