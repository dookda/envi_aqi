# AQI Dashboard Design System

This document outlines the design system and atomic design structure for the AQI Dashboard project.

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Atomic Design Structure](#atomic-design-structure)
3. [Component Library](#component-library)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)

## Design Tokens

Design tokens are defined in `src/index.css` as CSS custom properties. They are integrated with Tailwind CSS through `tailwind.config.js`.

### Color System

```css
/* Primary Colors */
--color-primary-500: #3b82f6  /* Main brand color */
--color-primary-600: #2563eb  /* Hover/Active states */

/* AQI-Specific Colors */
--color-aqi-good: #00E400
--color-aqi-moderate: #FFFF00
--color-aqi-unhealthy-sensitive: #FF7E00
--color-aqi-unhealthy: #FF0000
--color-aqi-very-unhealthy: #8F3F97
--color-aqi-hazardous: #7E0023
```

### Spacing Scale

```css
--spacing-1: 0.25rem   /* 4px */
--spacing-2: 0.5rem    /* 8px */
--spacing-4: 1rem      /* 16px */
--spacing-6: 1.5rem    /* 24px */
```

### Typography

```css
--font-size-sm: 0.875rem
--font-size-base: 1rem
--font-size-lg: 1.125rem
--font-size-xl: 1.25rem
```

### Using Tokens in Tailwind

```jsx
// Using custom colors
<div className="bg-primary-500 text-white">
<div className="bg-aqi-good">

// Using custom spacing
<div className="p-4 mt-6">

// Using custom shadows
<div className="shadow-lg">
```

## Atomic Design Structure

The project follows the Atomic Design methodology:

```
src/
├── components/
│   ├── atoms/          # Basic building blocks
│   ├── molecules/      # Simple component groups
│   ├── organisms/      # Complex UI components
│   └── templates/      # Page layouts (future)
├── pages/              # Actual pages
├── utils/
│   ├── constants/      # Shared constants
│   └── helpers/        # Utility functions
```

### Hierarchy

1. **Atoms**: Cannot be broken down further (Button, Card, Badge, Spinner)
2. **Molecules**: Combinations of atoms (AQIBadge, LegendItem, LoadingState)
3. **Organisms**: Complex components (PageHeader, AQILegend, StationDetailsPanel)
4. **Pages**: Complete pages using all above

## Component Library

### Atoms

#### Button

Reusable button component with multiple variants and sizes.

```jsx
import { Button } from '../components/atoms';

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `disabled`: boolean
- `icon`: ReactNode
- `onClick`: function

#### Card

Container component with different visual styles.

```jsx
import { Card } from '../components/atoms';

<Card variant="glass" padding="md">
  Content here
</Card>
```

**Props:**
- `variant`: 'default' | 'elevated' | 'glass' | 'outlined'
- `padding`: 'none' | 'sm' | 'md' | 'lg'
- `onClick`: function (optional)

#### Badge

Small status or label indicator.

```jsx
import { Badge } from '../components/atoms';

<Badge variant="success" size="md" rounded>
  Active
</Badge>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'gray'
- `size`: 'sm' | 'md' | 'lg'
- `rounded`: boolean

#### Spinner

Loading indicator.

```jsx
import { Spinner } from '../components/atoms';

<Spinner size="lg" color="primary" />
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `color`: 'primary' | 'secondary' | 'white' | 'gray'

### Molecules

#### AQIBadge

Displays AQI value with color-coded background.

```jsx
import { AQIBadge } from '../components/molecules';

<AQIBadge
  colorId="2"
  aqiValue="75"
  param="PM25"
  size="md"
  showLabel={true}
  showParam={true}
/>
```

**Props:**
- `colorId`: string (1-6)
- `aqiValue`: string | number
- `param`: string (pollutant type)
- `size`: 'sm' | 'md' | 'lg'
- `showLabel`: boolean
- `showParam`: boolean

#### LegendItem

Single item in the AQI legend.

```jsx
import { LegendItem } from '../components/molecules';

<LegendItem
  color="#00E400"
  label="Good"
  range="0-50"
/>
```

#### LoadingState

Full-screen loading state.

```jsx
import { LoadingState } from '../components/molecules';

<LoadingState message="Loading data..." size="xl" />
```

#### ErrorState

Full-screen error state.

```jsx
import { ErrorState } from '../components/molecules';

<ErrorState
  title="Error Loading Data"
  message="Failed to fetch AQI data"
/>
```

### Organisms

#### PageHeader

Main page header with title, subtitle, and action button.

```jsx
import { PageHeader } from '../components/organisms';

<PageHeader
  title="AQI Dashboard"
  subtitle="Real-time Air Quality Monitoring"
  variant="glass"
  actionButton={{
    label: 'View Map',
    to: '/full-map',
    icon: <MapIcon />
  }}
/>
```

**Props:**
- `title`: string (required)
- `subtitle`: string
- `variant`: 'default' | 'glass'
- `actionButton`: object with `label`, `to` or `onClick`, `variant`, `size`, `icon`

#### AQILegend

Complete AQI scale legend with all levels.

```jsx
import { AQILegend } from '../components/organisms';

<AQILegend position="bottom-left" />
```

**Props:**
- `position`: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

#### StationDetailsPanel

Detailed information panel for a selected station.

```jsx
import { StationDetailsPanel } from '../components/organisms';

<StationDetailsPanel
  station={stationData}
  onClose={handleClose}
  position="top-right"
/>
```

**Props:**
- `station`: object with station data
- `onClose`: function
- `position`: 'top-right' | 'top-left'

## Utility Functions

### AQI Helpers

```jsx
import {
  getAQIColor,
  getAQILabel,
  getAQIRange,
  getAQIDescription,
  getAllAQILevels
} from '../utils/helpers/aqi';

const color = getAQIColor('2');  // Returns '#FFFF00'
const label = getAQILabel('2');  // Returns 'Moderate'
const range = getAQIRange('2');  // Returns '51-100'
const levels = getAllAQILevels(); // Returns array of all levels
```

### AQI Constants

```jsx
import {
  AQI_LEVELS,
  AQI_COLORS,
  AQI_LABELS,
  AQI_RANGES
} from '../utils/constants/aqi';
```

## Usage Examples

### Creating a New Page

```jsx
import { PageHeader } from '../components/organisms';
import { Card } from '../components/atoms';
import { LoadingState, ErrorState } from '../components/molecules';

function MyNewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  if (loading) return <LoadingState message="Loading..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="My Page"
        subtitle="Description"
        actionButton={{ label: 'Action', onClick: handleAction }}
      />

      <Card variant="glass" padding="lg">
        {/* Your content */}
      </Card>
    </div>
  );
}
```

### Using Design Tokens Directly

```jsx
// In styled components or inline styles
<div style={{ color: 'var(--color-primary-600)' }}>

// In Tailwind classes
<div className="bg-primary-600 text-white rounded-lg shadow-lg">
```

## Best Practices

### Component Creation

1. **Keep components focused**: Each component should have a single responsibility
2. **Use PropTypes**: Always define prop types for type safety
3. **Provide defaults**: Set sensible default props
4. **Keep atoms pure**: Atoms should not have complex logic
5. **Compose upward**: Build molecules from atoms, organisms from molecules

### Design Token Usage

1. **Always use tokens**: Never hardcode colors, spacing, or other design values
2. **Use Tailwind classes**: Prefer Tailwind utility classes over inline styles
3. **Consistent naming**: Follow the existing naming conventions
4. **Document changes**: Update this file when adding new tokens

### File Organization

```
components/
  atoms/
    Button.jsx
    Card.jsx
    index.js          # Export all atoms
  molecules/
    AQIBadge.jsx
    index.js          # Export all molecules
  organisms/
    PageHeader.jsx
    index.js          # Export all organisms
```

### Import Strategy

```jsx
// Good - Import from index
import { Button, Card, Badge } from '../components/atoms';
import { AQIBadge, LoadingState } from '../components/molecules';

// Avoid - Direct imports (but acceptable for specific cases)
import Button from '../components/atoms/Button';
```

## Migration Guide

### Converting Existing Components

1. **Identify repeated patterns**: Look for UI patterns used multiple times
2. **Extract to atoms/molecules**: Create reusable components
3. **Replace hardcoded values**: Use design tokens
4. **Use new components**: Refactor pages to use atomic components

### Example Refactoring

**Before:**
```jsx
<div className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
  Click Me
</div>
```

**After:**
```jsx
import { Button } from '../components/atoms';

<Button variant="primary">Click Me</Button>
```

## Future Enhancements

- [ ] Add dark mode support
- [ ] Create Template components for common layouts
- [ ] Add animation tokens
- [ ] Implement accessibility improvements
- [ ] Add Storybook documentation
- [ ] Create component testing utilities

---

For questions or suggestions about the design system, please refer to the component source code or create an issue in the project repository.
