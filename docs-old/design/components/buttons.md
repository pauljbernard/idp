# Button Components

Buttons are the primary interaction elements in the IDP Platform, designed to convey action hierarchy and maintain consistency across all interfaces.

## Design Principles

1. **Clear Action Hierarchy**: Primary, secondary, and tertiary buttons establish visual importance
2. **State Communication**: Visual feedback for hover, active, disabled, and loading states
3. **Accessibility First**: Keyboard navigation, focus indicators, and screen reader support
4. **Contextual Appropriateness**: Button styles match the security and enterprise context

## Button Variants

### Primary Buttons
Used for the most important action on a page or in a section.

```typescript
interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit';
}
```

**Visual Specifications:**
- **Background**: Linear gradient from `sky-500` to `blue-600`
- **Text**: White, medium font weight
- **Padding**: `px-4 py-2` (medium), scales with size
- **Border Radius**: `rounded-lg` (8px)
- **Shadow**: Subtle shadow on hover for depth

**Usage Example:**
```tsx
<button className="bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 transition-all">
  Create Backup
</button>
```

### Secondary Buttons
Used for important but not primary actions, often appearing alongside primary buttons.

**Visual Specifications:**
- **Background**: `white` with `slate-300` border (light mode)
- **Text**: `slate-700` color
- **Hover**: `slate-100` background
- **Dark Mode**: `slate-800` background with `slate-700` border

**Usage Example:**
```tsx
<button className="bg-white border border-slate-300 text-slate-700 font-medium px-4 py-2 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700">
  Cancel
</button>
```

### Tertiary Buttons
Used for less important actions or when minimal visual weight is needed.

**Visual Specifications:**
- **Background**: Transparent
- **Text**: `slate-600` color
- **Hover**: `slate-100` background
- **Border**: None

**Usage Example:**
```tsx
<button className="text-slate-600 font-medium px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-700">
  View Details
</button>
```

### Icon Buttons
Used for actions represented by icons, common in toolbars and compact interfaces.

**Visual Specifications:**
- **Size**: Square dimensions (32px, 40px, 48px)
- **Icon**: 16px, 20px, or 24px depending on button size
- **Background**: Transparent with hover state
- **Border**: Optional, typically used for primary icon buttons

**Usage Example:**
```tsx
<button className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 hover:bg-slate-100">
  <Menu className="h-5 w-5" />
</button>
```

## Button States

### Default State
The resting state when the button is available for interaction.

### Hover State
Visual feedback when the user hovers over the button.

```css
/* Primary button hover */
.btn-primary:hover {
  background: linear-gradient(135deg, #0284c7, #1d4ed8);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Secondary button hover */
.btn-secondary:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}
```

### Active/Pressed State
Visual feedback when the button is being clicked or pressed.

```css
.btn-primary:active {
  transform: translateY(1px);
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}
```

### Focus State
Keyboard navigation indicator meeting accessibility requirements.

```css
.btn:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

### Disabled State
Visual indication that the button cannot be interacted with.

```css
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Loading State
Visual indication that an action is in progress.

**Implementation:**
```tsx
<button disabled={loading} className="relative">
  {loading && (
    <div className="absolute inset-0 flex items-center justify-center">
      <LoadingSpinner className="w-4 h-4" />
    </div>
  )}
  <span className={loading ? 'opacity-0' : ''}>
    {loading ? 'Processing...' : 'Submit'}
  </span>
</button>
```

## Size Variants

### Small (`sm`)
Used in compact interfaces or when space is limited.

```css
.btn-sm {
  padding: 0.375rem 0.75rem; /* 6px 12px */
  font-size: 0.875rem;        /* 14px */
  line-height: 1.25rem;       /* 20px */
}
```

### Medium (`md`) - Default
Standard size for most interface elements.

```css
.btn-md {
  padding: 0.5rem 1rem;       /* 8px 16px */
  font-size: 0.875rem;        /* 14px */
  line-height: 1.25rem;       /* 20px */
}
```

### Large (`lg`)
Used for prominent actions or when more visual weight is needed.

```css
.btn-lg {
  padding: 0.75rem 1.5rem;    /* 12px 24px */
  font-size: 1rem;            /* 16px */
  line-height: 1.5rem;        /* 24px */
}
```

## Specialized Button Types

### Destructive Actions
Used for dangerous actions like deletion or irreversible operations.

```tsx
<button className="bg-red-600 text-white hover:bg-red-700 border border-red-600 font-medium px-4 py-2 rounded-lg">
  Delete Permanently
</button>
```

### Success Actions
Used to confirm positive actions or completed states.

```tsx
<button className="bg-emerald-600 text-white hover:bg-emerald-700 font-medium px-4 py-2 rounded-lg">
  Confirm & Deploy
</button>
```

### Warning Actions
Used for actions that require caution or have significant impact.

```tsx
<button className="bg-amber-600 text-white hover:bg-amber-700 font-medium px-4 py-2 rounded-lg">
  Execute Restore
</button>
```

## Component Implementation

### React Component Structure
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  className,
  children,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={clsx(
        // Base styles
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',

        // Size variants
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },

        // Variant styles
        {
          'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700 focus-visible:outline-blue-600': variant === 'primary',
          'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700': variant === 'secondary',
          'text-slate-600 hover:text-slate-700 hover:bg-slate-100': variant === 'tertiary',
          'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600': variant === 'destructive',
        },

        // States
        {
          'opacity-50 cursor-not-allowed': disabled || loading,
        },

        className
      )}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
```

## Usage Guidelines

### Button Hierarchy
- **One Primary**: Only one primary button per page section
- **Multiple Secondary**: Secondary buttons can appear in groups
- **Supporting Tertiary**: Use tertiary buttons for less important actions

### Button Grouping
```tsx
<div className="flex gap-3">
  <Button variant="primary">Save Changes</Button>
  <Button variant="secondary">Cancel</Button>
  <Button variant="tertiary">Preview</Button>
</div>
```

### Responsive Considerations
```tsx
<Button className="w-full sm:w-auto" size="lg">
  Mobile: Full Width, Desktop: Auto Width
</Button>
```

## Accessibility Standards

### Keyboard Navigation
- All buttons are focusable with Tab key
- Spacebar and Enter activate buttons
- Focus indicators meet 3:1 contrast ratio

### Screen Reader Support
- Descriptive button text or `aria-label`
- Loading state announced to screen readers
- Disabled state communicated appropriately

### Touch Targets
- Minimum 44px touch target for mobile devices
- Adequate spacing between adjacent buttons
- Larger touch targets for primary actions

## Testing Standards

### Visual Testing
- [ ] All variants render correctly
- [ ] Hover states work across browsers
- [ ] Focus indicators are visible
- [ ] Loading states display properly
- [ ] Dark mode variants work correctly

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announcements are correct
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Touch targets meet minimum size requirements

### Interaction Testing
- [ ] Click handlers fire correctly
- [ ] Disabled buttons cannot be activated
- [ ] Loading states prevent multiple submissions
- [ ] Form submission buttons work correctly