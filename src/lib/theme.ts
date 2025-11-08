// Centralized theme configuration
// =========================================
// LIGHT BEIGE, DARK FOREST GREEN & WHITE FLORAL THEME
// =========================================
// To change the entire app's color scheme, modify the color values below.
// All components reference these theme values for consistent styling.

export const theme = {
  // Primary colors (Dark Forest Green)
  // Used for: primary buttons, accents, borders, interactive elements
  primary: {
    50: 'bg-emerald-50',
    100: 'bg-emerald-100',
    200: 'bg-emerald-200',
    300: 'bg-emerald-300',
    400: 'bg-emerald-400',
    500: 'bg-emerald-600',    // Main forest green
    600: 'bg-emerald-700',    // Darker forest green
    700: 'bg-emerald-800',
    800: 'bg-emerald-900',
    900: 'bg-emerald-950',
  },

  // Secondary colors (Light Beige/Cream)
  // Used for: backgrounds, cards, subtle accents
  secondary: {
    50: 'bg-stone-50',        // Very light beige
    100: 'bg-stone-100',      // Light beige
    200: 'bg-stone-200',
    300: 'bg-stone-300',
    400: 'bg-stone-400',
    500: 'bg-stone-500',
    600: 'bg-stone-600',
    700: 'bg-stone-700',
    800: 'bg-stone-800',
    900: 'bg-stone-900',
  },

  // Neutral/White colors
  // Used for: contrast, clean backgrounds, text on dark backgrounds
  neutral: {
    white: 'bg-white',
    50: 'bg-gray-50',
    100: 'bg-gray-100',
    200: 'bg-gray-200',
    300: 'bg-gray-300',
    400: 'bg-gray-400',
    500: 'bg-gray-500',
    600: 'bg-gray-600',
    700: 'bg-gray-700',
    800: 'bg-gray-800',
    900: 'bg-gray-900',
  },

  // Text colors
  text: {
    primary: 'text-emerald-900',      // Dark forest green for primary text
    secondary: 'text-stone-700',      // Warm gray for secondary text
    muted: 'text-stone-500',          // Lighter for muted text
    white: 'text-white',              // White text
    onPrimary: 'text-white',          // Text color on forest green backgrounds
    onSecondary: 'text-emerald-900',  // Text color on beige backgrounds
    link: 'text-emerald-600',         // Links
    linkHover: 'hover:text-emerald-700',
  },

  // Border colors
  border: {
    primary: 'border-emerald-600',      // Forest green borders
    secondary: 'border-emerald-400',    // Lighter green borders
    light: 'border-emerald-200',        // Very light green borders
    default: 'border-stone-300',        // Default neutral borders
    beige: 'border-stone-200',          // Beige borders
    white: 'border-white',
  },

  // Gradients (Floral & Elegant)
  gradient: {
    // Primary forest green gradient
    primary: 'bg-gradient-to-r from-emerald-600 to-emerald-700',
    primaryHover: 'hover:from-emerald-700 hover:to-emerald-800',

    // Beige background gradient (main pages)
    background: 'bg-gradient-to-br from-stone-50 via-amber-50 to-stone-100',

    // Icon/accent gradient
    icon: 'bg-gradient-to-br from-emerald-500 to-emerald-700',

    // Card gradient (subtle beige)
    card: 'bg-gradient-to-br from-stone-50 to-amber-50',

    // Floral accent gradient (green to white)
    floral: 'bg-gradient-to-br from-emerald-100 via-white to-stone-50',

    // Hero/header gradient
    hero: 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800',
  },

  // Focus states
  focus: {
    ring: 'focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
    ringLight: 'focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400',
  },

  // Semantic colors for consistent UI feedback
  semantic: {
    // Success (green, complements forest green)
    success: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-800',
      icon: 'text-green-500',
    },
    // Error (warm red/rose for softness)
    error: {
      bg: 'bg-rose-50',
      border: 'border-rose-400',
      text: 'text-rose-800',
      icon: 'text-rose-500',
    },
    // Warning (amber for warmth)
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-400',
      text: 'text-amber-800',
      icon: 'text-amber-500',
    },
    // Info (blue)
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-400',
      text: 'text-blue-800',
      icon: 'text-blue-500',
    },
  },

  // Badge colors
  badge: {
    // Assigned guest badge
    assigned: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
    },
    // Unassigned guest badge
    unassigned: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    // Party size badge
    partySize: {
      bg: 'bg-stone-200',
      text: 'text-stone-800',
      border: 'border-stone-300',
    },
    // Default badge (forest green)
    default: {
      bg: 'bg-emerald-500',
      text: 'text-white',
      border: 'border-emerald-600',
      hover: 'hover:bg-emerald-600',
      ring: 'ring-emerald-300',
    },
  },

  // Modal/Overlay
  modal: {
    overlay: 'bg-emerald-900 bg-opacity-40',  // Dark green overlay
    background: 'bg-white',
    border: 'border-emerald-200',
    title: 'text-emerald-900',
  },

  // Component specific styles
  components: {
    // Buttons
    button: {
      // Primary: Dark beige/tan gradient
      primary: 'bg-gradient-to-r from-stone-600 to-stone-700 text-white font-medium hover:from-stone-700 hover:to-stone-800 transition-all duration-200',

      // Secondary: White with dark beige border and forest green text
      secondary: 'bg-white border-2 border-stone-500 text-emerald-700 hover:bg-stone-50 font-medium transition-all duration-200',

      // Tertiary: Light beige with dark beige text
      tertiary: 'bg-stone-100 border border-stone-300 text-stone-700 hover:bg-stone-200 transition-all duration-200',

      // Danger: Rose red
      danger: 'bg-rose-500 text-white hover:bg-rose-600 transition-all duration-200',

      // Edit: Blue
      edit: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200',

      // Delete: Red
      delete: 'text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200',

      // Confirm/Save: Green
      confirm: 'text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-all duration-200',

      // Cancel: Gray
      cancel: 'text-stone-600 hover:bg-stone-100 hover:text-stone-700 transition-all duration-200',
    },

    // Cards
    card: {
      default: 'bg-white border border-stone-200 shadow-lg',
      beige: 'bg-gradient-to-br from-stone-50 to-amber-50 border border-stone-200 shadow-lg',
      hover: 'hover:border-emerald-300 hover:shadow-xl',
      elevated: 'bg-white border-2 border-emerald-500 shadow-2xl',
    },

    // Inputs
    input: {
      default: 'border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-emerald-900 bg-white',
      beige: 'border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-emerald-900 bg-stone-50',
    },

    // Tables (drag-and-drop seating chart)
    table: {
      default: 'bg-white border-2 border-emerald-600 shadow-lg',
      dragging: 'border-emerald-700 bg-emerald-50',
      dropTarget: 'border-green-400 bg-green-50',
      full: 'border-rose-400 bg-rose-50',
    },

    // Page backgrounds
    page: {
      default: 'bg-gradient-to-br from-stone-50 via-amber-50 to-stone-100',
      white: 'bg-white',
      beige: 'bg-stone-50',
    },

    // Icons
    icon: {
      primary: 'text-emerald-600',
      secondary: 'text-stone-500',
      muted: 'text-stone-400',
      hover: 'hover:text-emerald-700',
      background: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    },

    // List items
    listItem: {
      default: 'bg-white border border-stone-200',
      hover: 'hover:bg-stone-50 hover:border-stone-300',
      draggable: 'bg-stone-50 border border-stone-200 hover:bg-stone-100 hover:border-stone-300',
    },

    // Headers/Navigation
    header: {
      background: 'bg-white border-b border-stone-200',
      text: 'text-emerald-900',
      link: 'text-emerald-700 hover:text-emerald-800',
    },

    // Tabs
    tab: {
      active: 'border-emerald-600 text-emerald-700',
      inactive: 'border-transparent text-stone-600 hover:text-emerald-600 hover:border-stone-300',
    },

    // Loading states
    loading: {
      spinner: 'border-emerald-600',
      background: 'bg-stone-50',
      text: 'text-emerald-900',
    },

    // Empty states
    empty: {
      background: 'bg-stone-50 border-dashed border-stone-300',
      text: 'text-stone-600',
      icon: 'text-stone-400',
    },

    // Zoom controls (seating chart)
    zoomControl: {
      background: 'bg-white',
      button: 'bg-white hover:bg-stone-50 border border-stone-300',
      text: 'text-emerald-900',
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
  bgBeige: theme.components.card.beige,
  bgWhite: theme.neutral.white,

  // Text
  textPrimary: theme.text.primary,
  textSecondary: theme.text.secondary,
  textMuted: theme.text.muted,
  textWhite: theme.text.white,
  textLink: theme.text.link,

  // Buttons
  btnPrimary: theme.components.button.primary,
  btnSecondary: theme.components.button.secondary,
  btnTertiary: theme.components.button.tertiary,
  btnDanger: theme.components.button.danger,
  btnEdit: theme.components.button.edit,
  btnDelete: theme.components.button.delete,
  btnConfirm: theme.components.button.confirm,
  btnCancel: theme.components.button.cancel,

  // Inputs
  input: theme.components.input.default,
  inputBeige: theme.components.input.beige,

  // Borders
  borderPrimary: theme.border.primary,
  borderLight: theme.border.light,
  borderDefault: theme.border.default,
  borderBeige: theme.border.beige,

  // Focus
  focus: theme.focus.ring,
  focusLight: theme.focus.ringLight,

  // Icons
  iconPrimary: theme.components.icon.primary,
  iconSecondary: theme.components.icon.secondary,
  iconBackground: theme.components.icon.background,

  // Semantic
  success: `${theme.semantic.success.bg} ${theme.semantic.success.border} ${theme.semantic.success.text}`,
  error: `${theme.semantic.error.bg} ${theme.semantic.error.border} ${theme.semantic.error.text}`,
  warning: `${theme.semantic.warning.bg} ${theme.semantic.warning.border} ${theme.semantic.warning.text}`,
  info: `${theme.semantic.info.bg} ${theme.semantic.info.border} ${theme.semantic.info.text}`,

  // Badges
  badgeAssigned: `${theme.badge.assigned.bg} ${theme.badge.assigned.text} ${theme.badge.assigned.border}`,
  badgeUnassigned: `${theme.badge.unassigned.bg} ${theme.badge.unassigned.text} ${theme.badge.unassigned.border}`,
  badgePartySize: `${theme.badge.partySize.bg} ${theme.badge.partySize.text} ${theme.badge.partySize.border}`,
  badgeDefault: `${theme.badge.default.bg} ${theme.badge.default.text} ${theme.badge.default.border} ${theme.badge.default.hover}`,

  // Modal
  modalOverlay: theme.modal.overlay,
  modalBg: theme.modal.background,
  modalBorder: theme.modal.border,
  modalTitle: theme.modal.title,
};

// Alternative theme presets (for easy switching in the future)
// To switch themes, replace the color values in the main theme object above
export const themePresets = {
  forestGreen: {
    name: 'Light Beige & Dark Forest Green (Current)',
    description: 'Elegant floral theme with light beige backgrounds and forest green accents',
    primary: 'emerald-600',
    secondary: 'stone-100',
    accent: 'amber-50',
  },
  gold: {
    name: 'Gold & Black',
    description: 'Bold theme with gold gradients and black text',
    primary: 'yellow-500',
    secondary: 'amber-100',
    accent: 'amber-50',
  },
  rose: {
    name: 'Rose & Pink',
    description: 'Romantic theme with rose and pink tones',
    primary: 'pink-500',
    secondary: 'rose-100',
    accent: 'rose-50',
  },
  blue: {
    name: 'Blue & Indigo',
    description: 'Professional theme with blue tones',
    primary: 'blue-600',
    secondary: 'blue-100',
    accent: 'blue-50',
  },
  lavender: {
    name: 'Lavender & Purple',
    description: 'Soft floral theme with lavender tones',
    primary: 'purple-500',
    secondary: 'purple-100',
    accent: 'purple-50',
  },
};
