# ChatLingua Development Guidelines

## Project Overview

ChatLingua is an Angular-based language learning application with gamification features. This document contains coding standards and guidelines for development.

---

## Component Structure Rules

### REQUIRED: Separate Files

Every Angular component MUST have separate files:

- `component-name.component.ts` - TypeScript logic only
- `component-name.component.html` - Template
- `component-name.component.scss` - Styles

### FORBIDDEN in .ts files

```typescript
// ❌ WRONG - DO NOT USE inline template
@Component({
  selector: 'app-example',
  template: `<div>...</div>`,
  styles: [`...`]
})

// ✅ CORRECT - Use external files
@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})
```

### Component Decorator Pattern

```typescript
@Component({
  selector: 'app-feature-name',
  standalone: true,
  imports: [
    CommonModule,
    // Angular Material modules
    MatCardModule,
    MatButtonModule,
    // Other imports
    FontAwesomeModule,
  ],
  templateUrl: './feature-name.component.html',
  styleUrls: ['./feature-name.component.scss']
})
export class FeatureNameComponent {
  // ...
}
```

---

## SCSS Guidelines

### Use Shared Styles

Import shared variables and mixins at the top of component SCSS files:

```scss
@use 'styles/variables' as *;
@use 'styles/mixins' as *;
```

### CSS Custom Properties

**Always use CSS variables for colors and spacing:**

```scss
// ✅ CORRECT
.card {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
}

// ❌ WRONG - hardcoded values
.card {
  background: #ffffff;
  color: #333333;
  padding: 20px;
  border-radius: 12px;
}
```

### Color Palette

**Primary Color: Green (#22c55e)**

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-primary` | #22c55e | Main brand color |
| `--color-primary-light` | #4ade80 | Hover states, highlights |
| `--color-primary-dark` | #16a34a | Active states |
| `--color-primary-100` | #dcfce7 | Light backgrounds |
| `--color-primary-rgb` | 34, 197, 94 | For rgba() usage |

**Semantic Colors:**

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-success` | #4caf50 | Success states |
| `--color-error` | #f44336 | Error states |
| `--color-warning` | #ff9800 | Warning states |
| `--color-info` | #2196f3 | Info states |

**Text Colors:**

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-text-primary` | #1a1a1a | Main text |
| `--color-text-secondary` | #555555 | Secondary text |
| `--color-text-muted` | #888888 | Disabled/muted text |

### Spacing Scale

```scss
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 20px;
--spacing-2xl: 24px;
--spacing-3xl: 32px;
--spacing-4xl: 48px;
```

### Border Radius

```scss
--radius-sm: 4px;    // Buttons, inputs
--radius-md: 8px;    // Cards, dialogs
--radius-lg: 12px;   // Large cards
--radius-pill: 9999px; // Pills, badges
```

### Use Shared Component Classes

These classes are defined in `_components.scss`:

```scss
// Cards
.app-card { ... }
.app-card--hoverable { ... }

// Badges
.badge { ... }
.badge-primary { ... }
.badge-success { ... }
.badge-error { ... }

// Empty states
.empty-state { ... }

// Messages
.error-message { ... }
.success-message { ... }

// Loading
.loading-spinner { ... }
.loading-inline { ... }
```

### Use Mixins

Available mixins in `_mixins.scss`:

```scss
// Flexbox
@include flex-center;
@include flex-between;
@include flex-column;

// Cards
@include card-base;
@include card-hover;

// Text
@include text-ellipsis;
@include text-clamp(2);

// Responsive
@include mobile { ... }
@include tablet { ... }
@include desktop { ... }

// Other
@include custom-scrollbar;
@include focus-ring;
```

---

## FORBIDDEN Colors

**NEVER use these hardcoded colors:**

| Forbidden | Replace with |
|-----------|--------------|
| `#3f51b5` (indigo) | `var(--color-primary)` |
| `#667eea` | `var(--color-primary)` |
| `#fafafa` | `var(--color-bg-primary)` |
| `#333` / `#333333` | `var(--color-text-primary)` |
| `#666` / `#666666` | `var(--color-text-secondary)` |
| `#999` / `#999999` | `var(--color-text-muted)` |

---

## TypeScript Guidelines

### Use Angular Signals for State

```typescript
// ✅ Preferred - Signals
isLoading = signal(false);
items = signal<Item[]>([]);

// For computed values
totalCount = computed(() => this.items().length);
```

### Use inject() for Dependencies

```typescript
// ✅ Preferred
private apiService = inject(ApiService);
private router = inject(Router);

// ❌ Avoid constructor injection for consistency
constructor(private apiService: ApiService) { }
```

### Import Icons from Shared File

```typescript
// ✅ Correct
import { faSpinner, faCheck, faTimes } from '../../../shared/icons';

// ❌ Avoid direct FontAwesome imports when possible
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
```

---

## File Organization

```
src/app/
├── core/                    # Singleton services, guards, interceptors
│   └── services/
│       ├── api.service.ts
│       └── auth.service.ts
├── shared/                  # Shared modules, components, pipes
│   ├── icons.ts            # Centralized icon exports
│   └── components/
├── features/               # Feature modules
│   ├── dashboard/
│   ├── exercises/
│   ├── gamification/
│   ├── quizzes/
│   └── review/
└── layout/                 # Layout components (navbar, sidebar)

src/styles/                 # Global SCSS
├── _variables.scss        # CSS custom properties
├── _mixins.scss           # Reusable mixins
├── _components.scss       # Shared component styles
└── _animations.scss       # Keyframe animations
```

---

## Angular Material Theme

The application uses a custom green Angular Material theme:

```scss
// Primary: Green palette (#22c55e)
// Accent: Teal palette
// Warn: Red palette
```

Material components automatically use the theme colors. For custom styling, override with CSS variables.

---

## Common Patterns

### Dialog Component

```typescript
@Component({
  selector: 'app-my-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    FontAwesomeModule,
  ],
  templateUrl: './my-dialog.component.html',
  styleUrls: ['./my-dialog.component.scss']
})
export class MyDialogComponent {
  private dialogRef = inject(MatDialogRef<MyDialogComponent>);
  private data = inject<DialogData>(MAT_DIALOG_DATA);

  close() {
    this.dialogRef.close();
  }

  save() {
    this.dialogRef.close(this.result);
  }
}
```

### Loading State Pattern

```html
@if (loading()) {
  <div class="loading-spinner">
    <mat-spinner diameter="40"></mat-spinner>
  </div>
} @else {
  <!-- Content -->
}
```

### Empty State Pattern

```html
@if (items().length === 0) {
  <div class="empty-state">
    <fa-icon [icon]="faInbox" class="icon-4xl"></fa-icon>
    <h3>No items found</h3>
    <p>Start by adding your first item</p>
  </div>
}
```

---

## Responsive Design

Use mobile-first approach with breakpoints:

```scss
// Mobile: < 480px
// Tablet: < 768px
// Desktop: < 1024px

.container {
  padding: var(--spacing-md);

  @include tablet {
    padding: var(--spacing-lg);
  }

  @include tablet-up {
    padding: var(--spacing-2xl);
  }
}
```

---

## Checklist Before Commit

- [ ] Component uses separate `.ts`, `.html`, `.scss` files
- [ ] No inline `template:` or `styles:` in component decorator
- [ ] Uses CSS variables for colors and spacing
- [ ] No hardcoded indigo (#3f51b5) or old theme colors
- [ ] Imports shared SCSS where appropriate
- [ ] Uses Angular signals for component state
- [ ] Uses `inject()` for dependency injection
