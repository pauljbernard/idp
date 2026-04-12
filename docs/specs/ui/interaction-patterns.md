---
id: interaction-patterns
type: specification
domain: ui
status: stable
version: "1.0"
dependencies: [platform-architecture]
support_tier: "core-release"
maturity_state: "implemented"
supported_profiles: [admin-workflows, account-workflows, security-sensitive-interaction-patterns]
evidence_class: "internal-runtime"
tags: [specification, technical, ui]
last_updated: "2026-04-12"
related: []
---
# IDP Platform UX Style Guide

## Support Metadata

- Support tier: `Core release`
- Maturity state: `Implemented`
- Supported profiles:
  - `admin-workflows`
  - `account-workflows`
  - `security-sensitive-interaction-patterns`
- Evidence class: `Internal runtime`

This style guide defines the user experience principles, interaction patterns, and content standards for the Identity Provider (IDP) Platform, ensuring consistency and usability across all touchpoints.

## UX Design Principles

### 1. Security-First Experience
Every interaction should reinforce the secure, trustworthy nature of the platform while maintaining usability.

**Implementation:**
- Clear security indicators (HTTPS badges, encryption status)
- Progressive trust building through transparent communication
- Secure defaults in all configuration options
- Visual reinforcement of security actions (key rotation, backup creation)

### 2. Enterprise Reliability
Administrative interfaces must convey stability, control, and professional competence.

**Implementation:**
- Consistent, predictable interface behaviors
- Comprehensive audit trails and history views
- Clear error messages with actionable guidance
- Robust confirmation patterns for destructive actions

### 3. Cognitive Load Reduction
Minimize mental effort required to complete tasks through clear information hierarchy and intuitive workflows.

**Implementation:**
- Progressive disclosure of complex information
- Contextual help and guidance
- Smart defaults and pre-filled forms
- Task-oriented navigation structure

### 4. Inclusive Accessibility
Design for users with diverse abilities, devices, and contexts from the outset.

**Implementation:**
- WCAG 2.1 AA compliance across all interfaces
- Keyboard-only navigation support
- Screen reader optimization
- Multiple ways to accomplish critical tasks

## Content Strategy

### Voice and Tone

#### Voice Characteristics
The IDP Platform voice is:
- **Authoritative**: Confident and knowledgeable about identity management
- **Clear**: Direct communication without unnecessary complexity
- **Helpful**: Proactively guides users toward successful outcomes
- **Professional**: Appropriate for enterprise and security contexts

#### Tone Variations

**Administrative Interfaces** - Formal and precise
- Use technical terminology appropriately
- Provide comprehensive details for informed decisions
- Maintain professional distance while being helpful

*Example:* "Configure OAuth 2.1 authorization flows with PKCE support for enhanced security."

**User-Facing Interfaces** - Friendly but secure
- Use plain language for complex security concepts
- Reassure users about security without creating anxiety
- Guide users through authentication with confidence

*Example:* "We're verifying your identity to keep your account secure."

**Error Messages** - Helpful and actionable
- Explain what happened without technical jargon
- Provide clear next steps for resolution
- Include relevant context for troubleshooting

*Example:* "Your session has expired for security. Please log in again to continue."

### Content Principles

#### Clarity Over Cleverness
- Use straightforward language over creative wordplay
- Prioritize comprehension over brand personality
- Test content with actual users for understanding

#### Scannable Content
- Use descriptive headings and subheadings
- Break up large blocks of text with lists and visuals
- Lead with key information in each section

#### Action-Oriented Language
- Use active voice and imperative mood for instructions
- Start with verbs for button labels and calls-to-action
- Be specific about expected outcomes

## Interaction Patterns

### Form Design

#### Input Field Standards
```typescript
interface FormFieldProps {
  label: string;           // Always present, descriptive
  placeholder?: string;    // Helpful example or format
  helpText?: string;      // Additional guidance when needed
  error?: string;         // Specific error message
  required?: boolean;     // Visual and semantic indication
  disabled?: boolean;     // Clear disabled state styling
}
```

**Visual Specifications:**
- **Label Position**: Above input field, left-aligned
- **Required Indicators**: Red asterisk (*) after label
- **Error States**: Red border and text below field
- **Help Text**: Gray text below field, smaller font
- **Focus State**: Blue border with subtle shadow

#### Validation Strategy
- **Inline Validation**: Real-time validation for format and requirements
- **Progressive Validation**: Show success as fields are completed correctly
- **Error Prevention**: Disable invalid form submission with clear messaging
- **Recovery Assistance**: Suggest corrections for common mistakes

**Example Implementation:**
```tsx
<FormField
  label="Client Redirect URI"
  placeholder="https://example.com/auth/callback"
  helpText="Must be a valid HTTPS URL for production clients"
  required
  validate={(value) => {
    if (!value.startsWith('https://')) {
      return 'Production redirect URIs must use HTTPS';
    }
    return null;
  }}
/>
```

### Navigation Patterns

#### Breadcrumb Navigation
Used for hierarchical navigation beyond the second level.

```tsx
interface Breadcrumb {
  label: string;
  href?: string;        // Null for current page
  icon?: React.ComponentType;
}

// Example: Organizations > Acme Corp > Users
const breadcrumbs = [
  { label: 'Organizations', href: '/console/organizations', icon: Building },
  { label: 'Acme Corp', href: '/console/organizations/acme-corp' },
  { label: 'Users' } // Current page
];
```

#### Tab Navigation
Used for organizing related content within a single context.

```tsx
interface TabItem {
  id: string;
  label: string;
  count?: number;       // Optional count badge
  disabled?: boolean;   // Disabled state for unavailable tabs
  href: string;
}

// Example: User detail tabs
const userTabs = [
  { id: 'profile', label: 'Profile', href: '/users/123/profile' },
  { id: 'sessions', label: 'Active Sessions', count: 3, href: '/users/123/sessions' },
  { id: 'audit', label: 'Audit Log', href: '/users/123/audit' }
];
```

### Modal Dialog Patterns

#### Confirmation Dialogs
Used for destructive or irreversible actions.

**Visual Structure:**
- **Header**: Clear action description with warning icon
- **Body**: Explanation of consequences and confirmation input
- **Footer**: Aligned action buttons (Cancel left, Confirm right)

```tsx
interface ConfirmationDialogProps {
  title: string;
  description: string;
  confirmText: string;
  confirmAction: () => void;
  destructive?: boolean;
  requiresTyping?: string;  // User must type specific text to confirm
}

// Example: Delete organization confirmation
<ConfirmationDialog
  title="Delete Organization"
  description="This action cannot be undone. All users, applications, and data will be permanently removed."
  confirmText="Delete Forever"
  requiresTyping="ACME CORP"  // Must type organization name
  destructive
  confirmAction={deleteOrganization}
/>
```

#### Information Dialogs
Used for displaying detailed information without requiring decisions.

**Usage Guidelines:**
- Limit to essential information that can't fit in main interface
- Include clear close/dismiss actions
- Use for help documentation and detailed explanations

### Loading States

#### Skeleton Screens
Maintain layout structure while content loads.

```tsx
// Skeleton for user profile card
<div className="animate-pulse">
  <div className="h-12 w-12 bg-slate-200 rounded-full" />
  <div className="mt-3 space-y-2">
    <div className="h-4 bg-slate-200 rounded w-3/4" />
    <div className="h-3 bg-slate-200 rounded w-1/2" />
  </div>
</div>
```

#### Progress Indicators
Show completion status for multi-step operations.

```tsx
interface ProgressStepProps {
  steps: Array<{
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }>;
  currentStep: string;
}
```

### Data Display Patterns

#### Status Indicators
Consistent visual language for system states.

```tsx
type StatusVariant = 'healthy' | 'warning' | 'error' | 'info';

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
}

// Usage examples
<StatusBadge variant="healthy">ACTIVE</StatusBadge>
<StatusBadge variant="warning">DEGRADED</StatusBadge>
<StatusBadge variant="error">FAILED</StatusBadge>
```

#### Data Tables
Structured presentation of tabular information.

**Column Types:**
- **Text**: Standard text content with optional sorting
- **Status**: Status badges with color coding
- **Actions**: Icon buttons for row-specific actions
- **Numeric**: Right-aligned numbers with optional formatting
- **Date/Time**: Consistent date formatting with relative times

```tsx
interface TableColumn<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}
```

## Responsive Design Patterns

### Breakpoint Strategy
```css
/* Mobile first approach */
.container {
  /* Mobile: 320px+ */
  padding: 1rem;
}

@media (min-width: 640px) {
  /* Small tablets: 640px+ */
  .container {
    padding: 1.5rem;
    max-width: 640px;
    margin: 0 auto;
  }
}

@media (min-width: 1024px) {
  /* Desktop: 1024px+ */
  .container {
    padding: 2rem;
    max-width: 1280px;
  }
}
```

### Mobile Navigation
- **Collapsible Sidebar**: Hidden by default, accessible via hamburger menu
- **Bottom Tab Bar**: Primary navigation for touch-friendly access
- **Swipe Gestures**: Support for common mobile navigation patterns

### Touch Considerations
- **Minimum Touch Target**: 44px × 44px for interactive elements
- **Spacing**: Adequate spacing between interactive elements
- **Hover States**: Adapt or remove hover states for touch devices

## Error Handling UX

### Error Message Hierarchy

#### Field-Level Errors
Immediate feedback for individual form fields.
```tsx
<input className="border-red-500" />
<p className="text-red-600 text-sm mt-1">
  Password must contain at least 8 characters
</p>
```

#### Form-Level Errors
Summary of form validation issues.
```tsx
<div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
  <h4 className="text-red-800 font-medium">Please correct the following errors:</h4>
  <ul className="list-disc list-inside text-red-700 text-sm mt-2">
    <li>Email address is required</li>
    <li>Password must meet complexity requirements</li>
  </ul>
</div>
```

#### Page-Level Errors
Global errors affecting the entire interface.
```tsx
<div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
  <div className="flex">
    <AlertTriangle className="h-5 w-5 text-yellow-400" />
    <div className="ml-3">
      <p className="text-sm text-yellow-700">
        Your session will expire in 5 minutes.
        <button className="underline font-medium">Extend session</button>
      </p>
    </div>
  </div>
</div>
```

### Recovery Patterns

#### Retry Mechanisms
Clear options for recovering from failed operations.
```tsx
<div className="text-center py-8">
  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto" />
  <h3 className="text-lg font-medium text-gray-900 mt-2">
    Connection Failed
  </h3>
  <p className="text-gray-500 mt-1">
    Unable to connect to the authentication service
  </p>
  <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
    Try Again
  </button>
</div>
```

#### Graceful Degradation
Maintain functionality when full features aren't available.
- **Offline Support**: Cache critical functionality for offline use
- **Reduced Functionality**: Clearly communicate what's available in degraded states
- **Progressive Enhancement**: Add advanced features when conditions support them

## Animation and Motion

### Purpose-Driven Animation
Use animation to:
- **Provide Feedback**: Confirm user actions with subtle motion
- **Guide Attention**: Direct focus to important changes
- **Enhance Perceived Performance**: Make loading feel faster
- **Create Spatial Awareness**: Show relationships between interface elements

### Animation Principles

#### Subtle and Functional
- **Duration**: 200-300ms for most transitions
- **Easing**: Use eased transitions (ease-out) for natural feel
- **Purpose**: Every animation should serve a functional purpose
- **Respect Preferences**: Honor `prefers-reduced-motion` settings

```css
.button {
  transition: all 200ms ease-out;
}

.modal {
  animation: modal-appear 250ms ease-out;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .button,
  .modal {
    transition: none;
    animation: none;
  }
}
```

## Accessibility Guidelines

### Keyboard Navigation
- **Tab Order**: Logical sequence through interactive elements
- **Focus Indicators**: Visible focus states meeting 3:1 contrast ratio
- **Skip Links**: Quick navigation to main content areas
- **Keyboard Shortcuts**: Power user accelerators with proper documentation

### Screen Reader Support
- **Semantic HTML**: Proper heading hierarchy and landmark regions
- **Alt Text**: Descriptive alternative text for informative images
- **Form Labels**: Explicit associations between labels and inputs
- **Live Regions**: Announcements for dynamic content changes

### Color and Contrast
- **Text Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Interactive Elements**: 4.5:1 contrast for all clickable elements
- **Color Independence**: Information conveyed through multiple means (color + icon + text)
- **High Contrast Support**: Enhanced contrast modes for accessibility needs

## Performance Guidelines

### Perceived Performance
- **Skeleton Screens**: Maintain layout structure during loading
- **Progressive Loading**: Show content as it becomes available
- **Optimistic Updates**: Show expected results before server confirmation
- **Loading Prioritization**: Load above-the-fold content first

### Real Performance
- **Code Splitting**: Load JavaScript on demand
- **Image Optimization**: WebP format with appropriate sizing
- **Caching Strategy**: Aggressive caching for static resources
- **Bundle Size**: Monitor and optimize JavaScript bundle size

### Performance Budgets
- **First Contentful Paint**: < 1.5 seconds on 3G
- **Largest Contentful Paint**: < 2.5 seconds on 3G
- **Time to Interactive**: < 3 seconds on 3G
- **Bundle Size**: < 200KB gzipped for initial load
