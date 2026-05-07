import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'repronig-theme-mode-v2';
const LEGACY_STORAGE_KEY = 'repronig-theme-mode';

function readPersistedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  return 'light';
}

function applyThemeToDom(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('dark-mode', theme === 'dark');
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

interface UiState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readPersistedTheme(),
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, theme);
      applyThemeToDom(theme);
    }
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

if (typeof document !== 'undefined') {
  applyThemeToDom(useUiStore.getState().theme);
}
