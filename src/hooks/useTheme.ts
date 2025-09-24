import { theme, themeClasses, combineThemeClasses } from '@/lib/theme';

export function useTheme() {
  return {
    theme,
    classes: themeClasses,
    combine: combineThemeClasses,

    // Pre-built component classes
    page: themeClasses.bgPage,
    card: `${themeClasses.bgCard} rounded-2xl shadow-lg p-6`,
    cardBorder: themeClasses.borderLight,

    button: {
      primary: `${themeClasses.btnPrimary} py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`,
      secondary: `${themeClasses.btnSecondary} py-2 px-4 rounded-lg transition-colors`,
      danger: `${themeClasses.btnDanger} py-2 px-4 rounded-lg transition-colors`,
    },

    input: `w-full px-3 py-2 rounded-lg transition-colors ${themeClasses.input}`,

    text: {
      heading: `font-bold ${themeClasses.textPrimary}`,
      body: themeClasses.textPrimary,
      muted: themeClasses.textMuted,
      label: `text-sm font-medium ${themeClasses.textPrimary}`,
    },

    icon: {
      primary: `${theme.gradient.icon} rounded-full flex items-center justify-center`,
      small: 'w-4 h-4',
      medium: 'w-5 h-5',
      large: 'w-8 h-8',
    },

    table: {
      default: `${theme.components.table.default} cursor-move select-none min-w-[140px]`,
      dragging: `${theme.components.table.dragging} z-10`,
      dropTarget: theme.components.table.dropTarget,
      full: theme.components.table.full,
    },
  };
}