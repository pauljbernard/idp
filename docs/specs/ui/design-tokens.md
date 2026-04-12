---
id: design-tokens
type: specification
domain: ui
status: stable
version: "1.0"
dependencies: [platform-architecture]
support_tier: "core-release"
maturity_state: "implemented"
supported_profiles: [shared-color-tokens, semantic-status-tokens, ui-foundation-tokens]
evidence_class: "internal-runtime"
tags: [specification, technical, ui]
last_updated: "2026-04-12"
related: []
---
# Color Palette

## Support Metadata

- Support tier: `Core release`
- Maturity state: `Implemented`
- Supported profiles:
  - `shared-color-tokens`
  - `semantic-status-tokens`
  - `ui-foundation-tokens`
- Evidence class: `Internal runtime`

The IDP Platform color palette is designed to convey trust, security, and enterprise reliability while maintaining excellent accessibility and visual hierarchy.

## Design Philosophy

Colors in the IDP Platform serve three primary purposes:
1. **Semantic Communication**: Each color has specific meaning tied to system states
2. **Brand Recognition**: Consistent use of primary colors reinforces platform identity
3. **Accessibility**: All color combinations meet WCAG 2.1 AA contrast requirements

## Color Tokens

### Primary Colors
The primary blue gradient represents trust, security, and technology leadership.

```css
/* Primary Blue Gradient */
--color-primary-50:  #f0f9ff;   /* Very light blue backgrounds */
--color-primary-100: #e0f2fe;   /* Light blue backgrounds */
--color-primary-200: #bae6fd;   /* Subtle blue accents */
--color-primary-300: #7dd3fc;   /* Medium blue elements */
--color-primary-400: #38bdf8;   /* Interactive blue */
--color-primary-500: #0ea5e9;   /* Primary brand blue */
--color-primary-600: #0284c7;   /* Primary hover state */
--color-primary-700: #0369a1;   /* Pressed primary state */
--color-primary-800: #075985;   /* Dark primary accent */
--color-primary-900: #0c4a6e;   /* Darkest primary */
```

### Secondary Colors
Secondary colors support the primary palette and provide additional semantic meaning.

```css
/* Secondary Blue */
--color-secondary-50:  #eff6ff;
--color-secondary-100: #dbeafe;
--color-secondary-200: #bfdbfe;
--color-secondary-300: #93c5fd;
--color-secondary-400: #60a5fa;
--color-secondary-500: #3b82f6;   /* Secondary brand blue */
--color-secondary-600: #2563eb;   /* Secondary hover */
--color-secondary-700: #1d4ed8;   /* Secondary pressed */
--color-secondary-800: #1e40af;
--color-secondary-900: #1e3a8a;
```

### Semantic Colors

#### Success (Emerald)
Used for successful operations, healthy status indicators, and positive feedback.

```css
--color-success-50:  #ecfdf5;
--color-success-100: #d1fae5;
--color-success-200: #a7f3d0;
--color-success-300: #6ee7b7;
--color-success-400: #34d399;
--color-success-500: #10b981;   /* Primary success */
--color-success-600: #059669;   /* Success hover */
--color-success-700: #047857;   /* Success pressed */
--color-success-800: #065f46;
--color-success-900: #064e3b;
```

#### Warning (Amber)
Used for caution states, pending operations, and advisory information.

```css
--color-warning-50:  #fffbeb;
--color-warning-100: #fef3c7;
--color-warning-200: #fde68a;
--color-warning-300: #fcd34d;
--color-warning-400: #fbbf24;
--color-warning-500: #f59e0b;   /* Primary warning */
--color-warning-600: #d97706;   /* Warning hover */
--color-warning-700: #b45309;   /* Warning pressed */
--color-warning-800: #92400e;
--color-warning-900: #78350f;
```

#### Error (Rose)
Used for error states, failed operations, and critical alerts.

```css
--color-error-50:  #fef2f2;
--color-error-100: #fee2e2;
--color-error-200: #fecaca;
--color-error-300: #fca5a5;
--color-error-400: #f87171;
--color-error-500: #ef4444;   /* Primary error */
--color-error-600: #dc2626;   /* Error hover */
--color-error-700: #b91c1c;   /* Error pressed */
--color-error-800: #991b1b;
--color-error-900: #7f1d1d;
```

### Neutral Colors (Slate)
The neutral palette provides content hierarchy, backgrounds, and UI structure.

```css
/* Slate Gray Scale */
--color-neutral-50:  #f8fafc;   /* Lightest background */
--color-neutral-100: #f1f5f9;   /* Light background */
--color-neutral-200: #e2e8f0;   /* Border light */
--color-neutral-300: #cbd5e1;   /* Border medium */
--color-neutral-400: #94a3b8;   /* Text disabled */
--color-neutral-500: #64748b;   /* Text secondary */
--color-neutral-600: #475569;   /* Text medium */
--color-neutral-700: #334155;   /* Text primary */
--color-neutral-800: #1e293b;   /* Text strong */
--color-neutral-900: #0f172a;   /* Text strongest */
```

## Semantic Usage

### Background Colors

#### Page Backgrounds
```css
/* Light mode */
.page-background { background-color: var(--color-neutral-50); }

/* Dark mode */
.dark .page-background { background-color: var(--color-neutral-900); }
```

#### Card Backgrounds
```css
/* White cards in light mode */
.card-background { background-color: #ffffff; }

/* Dark cards in dark mode */
.dark .card-background { background-color: var(--color-neutral-800); }
```

#### Panel Backgrounds
```css
/* Subtle panel backgrounds */
.panel-background { background-color: var(--color-neutral-100); }
.dark .panel-background { background-color: var(--color-neutral-950); }
```

### Text Colors

#### Content Hierarchy
```css
/* Primary text */
.text-primary { color: var(--color-neutral-900); }
.dark .text-primary { color: #ffffff; }

/* Secondary text */
.text-secondary { color: var(--color-neutral-600); }
.dark .text-secondary { color: var(--color-neutral-300); }

/* Tertiary text */
.text-tertiary { color: var(--color-neutral-500); }
.dark .text-tertiary { color: var(--color-neutral-400); }
```

#### Status Text
```css
/* Success text */
.text-success { color: var(--color-success-600); }
.dark .text-success { color: var(--color-success-400); }

/* Warning text */
.text-warning { color: var(--color-warning-600); }
.dark .text-warning { color: var(--color-warning-400); }

/* Error text */
.text-error { color: var(--color-error-600); }
.dark .text-error { color: var(--color-error-400); }
```

### Interactive Elements

#### Primary Actions
```css
/* Primary button background */
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-600));
  color: #ffffff;
}

.btn-primary:hover {
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-secondary-700));
}
```

#### Secondary Actions
```css
/* Secondary button */
.btn-secondary {
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-700);
  border: 1px solid var(--color-neutral-300);
}

.btn-secondary:hover {
  background-color: var(--color-neutral-200);
}
```

#### Status Indicators

##### Health Status Badges
```css
/* Healthy status */
.status-healthy {
  background-color: var(--color-success-100);
  color: var(--color-success-800);
}

/* Degraded status */
.status-degraded {
  background-color: var(--color-warning-100);
  color: var(--color-warning-800);
}

/* Failed status */
.status-failed {
  background-color: var(--color-error-100);
  color: var(--color-error-800);
}
```

## Accessibility Guidelines

### Contrast Requirements
All text and interactive elements meet WCAG 2.1 AA contrast requirements:

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **Interactive elements**: Minimum 4.5:1 contrast ratio
- **Focus indicators**: Minimum 3:1 contrast ratio against background

### Color-Blind Accessibility
The palette is designed to be distinguishable for users with color vision deficiencies:

- **Red-Green**: Success (emerald) and error (rose) have sufficient luminance differences
- **Blue-Yellow**: Primary blues are paired with sufficient text contrast
- **Monochromatic**: All semantic meaning is reinforced with icons or text labels

### Dark Mode Considerations
Dark mode implementations maintain the same semantic meanings while adjusting for:

- **Reduced eye strain**: Lower luminance backgrounds
- **Maintained hierarchy**: Consistent relative contrast relationships
- **Color accuracy**: Adjusted hues to account for display characteristics in dark environments

## Implementation Examples

### Tailwind CSS Classes
```html
<!-- Primary gradient background -->
<div class="bg-gradient-to-br from-sky-500 to-blue-600">

<!-- Success status badge -->
<span class="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
  HEALTHY
</span>

<!-- Warning alert -->
<div class="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
  Advisory message content
</div>

<!-- Neutral card with borders -->
<div class="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
  Card content
</div>
```

### CSS Custom Properties
```css
:root {
  /* Light mode semantic colors */
  --bg-primary: var(--color-neutral-50);
  --text-primary: var(--color-neutral-900);
  --border-primary: var(--color-neutral-200);

  /* Status colors */
  --status-success: var(--color-success-600);
  --status-warning: var(--color-warning-600);
  --status-error: var(--color-error-600);
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode overrides */
    --bg-primary: var(--color-neutral-900);
    --text-primary: #ffffff;
    --border-primary: var(--color-neutral-800);

    /* Adjusted status colors for dark mode */
    --status-success: var(--color-success-400);
    --status-warning: var(--color-warning-400);
    --status-error: var(--color-error-400);
  }
}
```

## Brand Application

### Logo and Branding
The primary blue gradient is used for:
- IDP Platform logo background
- Primary navigation elements
- Key call-to-action buttons
- Brand accents and highlights

### Marketing Materials
- **Primary**: Blue gradient for headings and key elements
- **Secondary**: Slate neutrals for body text and layouts
- **Accent**: Success emerald for positive messaging
- **Support**: Warning amber for caution messaging

### Code Editor Themes
The color palette extends to development tooling:
- Syntax highlighting uses semantic colors appropriately
- Editor themes maintain consistent brand recognition
- Debug and error states use established error colors
