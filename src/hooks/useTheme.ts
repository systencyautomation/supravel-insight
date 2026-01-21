import { useThemeContext } from '@/contexts/ThemeContext';

// Re-exporta o hook do context para manter compatibilidade com código existente
export function useTheme() {
  return useThemeContext();
}
