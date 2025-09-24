# Theme System

This application uses a centralized theme system that makes it easy to change colors and styling across the entire app.

## How to Change Themes

### 1. Quick Theme Change

To switch to a different color scheme, edit `/src/lib/theme.ts`:

**For Rose/Pink Theme:**
```typescript
// Change these values in theme.ts
primary: 'pink',
secondary: 'rose',
textOnPrimary: 'white',
```

**For Blue Theme:**
```typescript
// Change these values in theme.ts
primary: 'blue',
secondary: 'indigo',
textOnPrimary: 'white',
```

**For Green Theme:**
```typescript
// Change these values in theme.ts
primary: 'emerald',
secondary: 'green',
textOnPrimary: 'white',
```

### 2. Custom Colors

Edit the `theme` object in `/src/lib/theme.ts`:

```typescript
export const theme = {
  // Change primary colors
  gradient: {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-600',
    primaryHover: 'hover:from-purple-600 hover:to-pink-700',
    background: 'bg-gradient-to-br from-purple-50 via-white to-pink-50',
    icon: 'bg-gradient-to-br from-purple-400 to-pink-600',
  },

  // Change borders
  border: {
    primary: 'border-purple-500',
    light: 'border-purple-200',
  },

  // Change button styles
  components: {
    button: {
      primary: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium hover:from-purple-600 hover:to-pink-700',
    },
  },
};
```

## Theme Structure

### Core Theme Elements

- **Background**: Page and card backgrounds
- **Primary Colors**: Main brand colors (buttons, icons, accents)
- **Text Colors**: Consistent text colors with proper contrast
- **Borders**: Consistent border styling
- **Components**: Pre-styled components (buttons, inputs, cards, tables)

### Using the Theme System

Components use the theme through the `useTheme()` hook:

```typescript
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const themeConfig = useTheme();

  return (
    <div className={themeConfig.page}>
      <div className={themeConfig.card}>
        <h1 className={themeConfig.text.heading}>Title</h1>
        <button className={themeConfig.button.primary}>
          Action
        </button>
      </div>
    </div>
  );
}
```

## Pre-built Theme Variations

The system includes several pre-built theme configurations:

1. **Gold & Black** (current)
2. **Rose & Pink**
3. **Blue & Indigo**
4. **Emerald & Green**

## Benefits

✅ **Consistent Design**: All components use the same color scheme
✅ **Easy Maintenance**: Change colors in one place
✅ **Type Safety**: TypeScript ensures proper theme usage
✅ **Responsive**: All themes work across devices
✅ **Accessibility**: Proper contrast ratios maintained

## Files to Edit

- `/src/lib/theme.ts` - Main theme configuration
- `/src/hooks/useTheme.ts` - Theme hook (rarely needs changes)

That's it! The theme system automatically applies changes throughout the entire application.