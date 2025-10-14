// Centralized theme configuration
export const theme = {
  // Primary colors (gold/amber theme)
  primary: {
    50: 'bg-yellow-50',
    100: 'bg-yellow-100',
    200: 'bg-yellow-200',
    300: 'bg-yellow-300',
    400: 'bg-yellow-400',
    500: 'bg-yellow-500',
    600: 'bg-yellow-600',
    700: 'bg-yellow-700',
    800: 'bg-yellow-800',
    900: 'bg-yellow-900',
  },

  // Secondary colors (amber)
  secondary: {
    50: 'bg-amber-50',
    100: 'bg-amber-100',
    200: 'bg-amber-200',
    300: 'bg-amber-300',
    400: 'bg-amber-400',
    500: 'bg-amber-500',
    600: 'bg-amber-600',
    700: 'bg-amber-700',
    800: 'bg-amber-800',
    900: 'bg-amber-900',
  },

  // Text colors
  text: {
    primary: 'text-black',
    secondary: 'text-gray-600',
    muted: 'text-gray-500',
    white: 'text-white',
    onPrimary: 'text-black', // text color on primary backgrounds
  },

  // Border colors
  border: {
    primary: 'border-yellow-500',
    secondary: 'border-yellow-400',
    light: 'border-yellow-200',
    default: 'border-gray-300',
  },

  // Gradients
  gradient: {
    primary: 'bg-gradient-to-r from-yellow-500 to-amber-600',
    primaryHover: 'hover:from-yellow-600 hover:to-amber-700',
    background: 'bg-gradient-to-br from-yellow-50 via-white to-amber-50',
    icon: 'bg-gradient-to-br from-yellow-400 to-amber-600',
    card: 'bg-gradient-to-r from-yellow-50 to-amber-50',
  },

  // Focus states
  focus: {
    ring: 'focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500',
  },

  // Component specific styles
  components: {
    button: {
      primary: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-medium hover:from-yellow-600 hover:to-amber-700',
      secondary: 'bg-white border border-yellow-500 text-black hover:bg-yellow-50',
      danger: 'bg-red-500 text-white hover:bg-red-600',
    },
    card: {
      default: 'bg-white border border-yellow-200 shadow-lg',
      hover: 'hover:border-yellow-300',
    },
    input: {
      default: 'border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-black',
    },
    table: {
      default: 'bg-white border-2 border-yellow-500 shadow-lg',
      dragging: 'border-yellow-600 bg-yellow-50',
      dropTarget: 'border-green-400 bg-green-50',
      full: 'border-red-400 bg-red-50',
    },
  },
};

// Utility functions for dynamic theme application
export const getThemeClass = (category: keyof typeof theme, variant: string) => {
  const categoryObj = theme[category] as Record<string, string>;
  return categoryObj?.[variant] || '';
};

export const combineThemeClasses = (...classes: string[]) => {
  return classes.filter(Boolean).join(' ');
};

// Quick access to commonly used theme classes
export const themeClasses = {
  // Backgrounds
  bgPrimary: theme.gradient.primary,
  bgSecondary: theme.secondary[100],
  bgPage: theme.gradient.background,
  bgCard: theme.components.card.default,

  // Text
  textPrimary: theme.text.primary,
  textSecondary: theme.text.secondary,
  textMuted: theme.text.muted,
  textWhite: theme.text.white,

  // Buttons
  btnPrimary: theme.components.button.primary,
  btnSecondary: theme.components.button.secondary,
  btnDanger: theme.components.button.danger,

  // Inputs
  input: theme.components.input.default,

  // Borders
  borderPrimary: theme.border.primary,
  borderLight: theme.border.light,

  // Focus
  focus: theme.focus.ring,
};

// Alternative theme configurations (for easy switching)
export const themes = {
  gold: {
    name: 'Gold & Black',
    primary: 'yellow',
    secondary: 'amber',
    textOnPrimary: 'black',
  },
  rose: {
    name: 'Rose & Pink',
    primary: 'pink',
    secondary: 'rose',
    textOnPrimary: 'white',
  },
  blue: {
    name: 'Blue & Indigo',
    primary: 'blue',
    secondary: 'indigo',
    textOnPrimary: 'white',
  },
  emerald: {
    name: 'Emerald & Green',
    primary: 'emerald',
    secondary: 'green',
    textOnPrimary: 'white',
  },
};