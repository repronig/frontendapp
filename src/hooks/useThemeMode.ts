import { useUiStore } from '@/store/ui.store';
import type { ThemeMode } from '@/store/ui.store';

export type { ThemeMode };

/**
 * Theme is owned by {@link useUiStore} so layout and future UI can share one source of truth.
 * This hook is a thin selector + stable API for existing callers.
 */
export function useThemeMode() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  return { theme, setTheme, toggleTheme };
}
