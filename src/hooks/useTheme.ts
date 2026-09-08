import { theme, themeClasses, combineThemeClasses } from '@/lib/theme';

/** Minimum comfortable tap target on touch screens (44px), relaxed on desktop. */
const touch = 'min-h-11 sm:min-h-0';
const iconTouch = 'inline-flex items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0';

export function useTheme() {
  return {
    theme,
    classes: themeClasses,
    combine: combineThemeClasses,

    // Pre-built component classes
    page: themeClasses.bgPage,
    // Tighter padding on phones so cards do not eat the narrow viewport.
    card: `${themeClasses.bgCard} rounded-2xl shadow-lg p-4 sm:p-6`,
    cardBeige: `${themeClasses.bgBeige} rounded-2xl shadow-lg p-4 sm:p-6`,
    cardBorder: themeClasses.borderLight,

    // `touch` keeps every control at the 44px minimum on phones and drops
    // back to the compact desktop metrics from `sm` up.
    button: {
      primary: `${touch} ${themeClasses.btnPrimary} py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`,
      secondary: `${touch} ${themeClasses.btnSecondary} py-2 px-4 rounded-lg transition-colors`,
      tertiary: `${touch} ${themeClasses.btnTertiary} py-2 px-4 rounded-lg transition-colors`,
      danger: `${touch} ${themeClasses.btnDanger} py-2 px-4 rounded-lg transition-colors`,
      edit: `${iconTouch} ${themeClasses.btnEdit} p-2 rounded-lg transition-colors`,
      delete: `${iconTouch} ${themeClasses.btnDelete} p-2 rounded-lg transition-colors`,
      confirm: `${iconTouch} ${themeClasses.btnConfirm} p-2 rounded-lg transition-colors`,
      cancel: `${iconTouch} ${themeClasses.btnCancel} p-2 rounded-lg transition-colors`,
    },

    input: `w-full px-3 py-2.5 sm:py-2 rounded-lg transition-colors ${themeClasses.input}`,
    inputBeige: `w-full px-3 py-2.5 sm:py-2 rounded-lg transition-colors ${themeClasses.inputBeige}`,

    text: {
      heading: `font-bold ${themeClasses.textPrimary}`,
      body: themeClasses.textPrimary,
      muted: themeClasses.textMuted,
      label: `text-sm font-medium ${themeClasses.textPrimary}`,
      link: `${themeClasses.textLink} ${theme.text.linkHover}`,
    },

    icon: {
      primary: `${theme.gradient.icon} rounded-full flex items-center justify-center text-white`,
      small: 'w-4 h-4',
      medium: 'w-5 h-5',
      large: 'w-8 h-8',
      color: {
        primary: theme.components.icon.primary,
        secondary: theme.components.icon.secondary,
        muted: theme.components.icon.muted,
      },
    },

    table: {
      default: `${theme.components.table.default} cursor-move select-none min-w-[140px]`,
      dragging: `${theme.components.table.dragging} z-10`,
      dropTarget: theme.components.table.dropTarget,
      full: theme.components.table.full,
    },

    badge: {
      assigned: `${themeClasses.badgeAssigned} text-xs px-2 py-1 rounded-full font-medium`,
      unassigned: `${themeClasses.badgeUnassigned} text-xs px-2 py-1 rounded-full font-medium`,
      partySize: `${themeClasses.badgePartySize} text-xs px-2 py-1 rounded-full font-medium`,
      default: `${themeClasses.badgeDefault} text-xs px-2 py-1 rounded-full font-medium`,
    },

    // Dialogs behave as bottom sheets on phones (thumb-reachable, keyboard
    // safe) and as centred cards from `sm` up.
    modal: {
      overlay: `fixed inset-0 ${themeClasses.modalOverlay} flex items-end sm:items-center justify-center z-50 p-0 sm:p-4`,
      container: `${themeClasses.modalBg} w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl p-5 sm:p-6 max-h-[90vh] max-h-[90dvh] overflow-y-auto pb-safe sm:pb-6`,
      title: `text-lg sm:text-xl font-bold ${themeClasses.modalTitle} mb-4`,
    },

    toast: {
      success: `${themeClasses.success} border-l-4 rounded-lg p-4`,
      error: `${themeClasses.error} border-l-4 rounded-lg p-4`,
      warning: `${themeClasses.warning} border-l-4 rounded-lg p-4`,
      info: `${themeClasses.info} border-l-4 rounded-lg p-4`,
    },

    listItem: {
      default: `${theme.components.listItem.default} ${theme.components.listItem.hover} rounded-lg p-3 transition-colors`,
      draggable: `${theme.components.listItem.draggable} rounded-lg p-3 transition-colors cursor-move`,
    },

    header: {
      container: `${theme.components.header.background} sticky top-0 z-40`,
      text: theme.components.header.text,
      link: theme.components.header.link,
    },

    tab: {
      active: `${theme.components.tab.active} inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 font-medium`,
      inactive: `${theme.components.tab.inactive} inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 font-medium`,
    },

    loading: {
      spinner: `${theme.components.loading.spinner}`,
      container: `${theme.components.loading.background} min-h-screen flex items-center justify-center`,
      text: theme.components.loading.text,
    },

    empty: {
      container: `${theme.components.empty.background} rounded-xl p-8 text-center`,
      text: theme.components.empty.text,
      icon: theme.components.empty.icon,
    },
  };
}