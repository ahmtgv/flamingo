import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark';
/** 'kids' applies the age-adapted token overrides (grades 1–4 / junior). */
export type AgeMode = 'default' | 'kids';

export const THEME_STORAGE_KEY = 'flamingo.theme';

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export interface UiState {
  theme: Theme;
  ageMode: AgeMode;
}

const initialState: UiState = {
  theme: initialTheme(),
  ageMode: 'default',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    setAgeMode(state, action: PayloadAction<AgeMode>) {
      state.ageMode = action.payload;
    },
  },
});

export const { toggleTheme, setAgeMode } = uiSlice.actions;
export default uiSlice.reducer;
