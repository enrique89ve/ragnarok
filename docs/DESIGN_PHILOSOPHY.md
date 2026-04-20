# Design Philosophy & Architecture Standards

> A comprehensive guide for building AAA-quality, maintainable UI systems inspired by Material Design 3 Expressive and modern design system principles.

---

## Core Philosophy

### The Three Pillars

1. **Semantic Design** - Components and tokens that carry meaning, not just visual properties
2. **Expressive Interfaces** - Emotionally impactful UX through motion, shape, color, and typography
3. **Separation of Concerns** - Clear boundaries between presentation, logic, and state

---

## Design System Fundamentals

### 1. Design Tokens (Semantic Variables)

Design tokens are the foundational building blocks. They provide semantic meaning rather than literal values.

```css
/* BAD: Literal values scattered throughout */
.button { background: #1e40af; }

/* GOOD: Semantic tokens */
:root {
  --color-primary: #1e40af;
  --color-primary-hover: #1d4ed8;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --radius-card: 12px;
}
.button { background: var(--color-primary); }
```

**Token Categories:**
- **Colors**: primary, secondary, tertiary, surface, background, error, success
- **Typography**: font-family, font-size-*, font-weight-*, line-height-*
- **Spacing**: spacing-xs, spacing-sm, spacing-md, spacing-lg, spacing-xl
- **Elevation**: shadow-sm, shadow-md, shadow-lg (z-depth)
- **Motion**: duration-fast, duration-normal, easing-standard
- **Shape**: radius-none, radius-sm, radius-md, radius-full

### 2. Component Architecture (Feature-First)

**Modularize Without Overkill** - This is our AAA standard approach.

Complex features should be isolated into their own module folder, but NOT fragmented into dozens of tiny files. The goal is separation from unrelated code, not maximum file count.

**Correct Structure (4-5 files max per feature):**

```
deckbuilder/
├── index.ts           # Public exports
├── useDeckBuilder.ts  # Hook with ALL state and logic
├── utils.ts           # Pure functions (no React)
└── tokens.css         # Design tokens (optional)
```

**Wrong Structure (OCD overkill):**

```
deckbuilder/
├── components/
│   ├── CardTile.tsx
│   ├── CardGrid.tsx
│   ├── CardFilters.tsx
│   ├── DeckSidebar.tsx
│   └── DeckHeader.tsx
├── hooks/
│   └── useDeckBuilder.ts
├── utils/
│   └── deckBuilderUtils.ts
└── styles/
    └── tokens.css
```

**The Principle:**
- Group all related code for a feature together
- Keep sub-components inline in the main file (or as simple functions at bottom)
- One hook, one utils file, one component
- Easy to navigate, hard to break paths

### 3. Separation of Concerns Pattern (MANDATORY)

**TSX → Hooks → Stores → Utils**

```
┌─────────────────┐
│  TSX Component  │  ← Pure presentation (what to render)
└────────┬────────┘
         │
┌────────▼────────┐
│   Custom Hook   │  ← Component logic (how to behave)
└────────┬────────┘
         │
┌────────▼────────┐
│  Zustand Store  │  ← Global state (what to remember)
└────────┬────────┘
         │
┌────────▼────────┐
│  Pure Utilities │  ← Business logic (how to compute)
└─────────────────┘
```

### Extraction Rules (Where to Put Code)

**1. Extract to `utils/` - Pure functions with NO React dependencies**

```typescript
// utils/cardFilters.ts
export function filterByClass(cards: CardData[], heroClass: string): CardData[] {
  return cards.filter(card => {
    const cardClass = (card.class || 'neutral').toLowerCase();
    return cardClass === 'neutral' || cardClass === heroClass.toLowerCase();
  });
}

export function sortByManaCost(cards: CardData[]): CardData[] {
  return [...cards].sort((a, b) => (a.manaCost ?? 0) - (b.manaCost ?? 0));
}
```

**2. Extract to `hooks/` - React logic with useState, useEffect, useMemo**

```typescript
// hooks/useDeckBuilder.ts
import { useState, useMemo, useCallback } from 'react';
import { filterByClass, sortByManaCost } from '../utils/cardFilters';
import { useHeroDeckStore } from '../stores/heroDeckStore';

export function useDeckBuilder(heroClass: string) {
  const { getDeck, setDeck } = useHeroDeckStore();
  const [filters, setFilters] = useState<DeckFilters>({});
  
  const filteredCards = useMemo(() => {
    let cards = filterByClass(allCards, heroClass);
    return sortByManaCost(cards);
  }, [heroClass, filters]);
  
  const addCard = useCallback((card: CardData) => {
    // Add card logic
  }, []);
  
  return { filteredCards, filters, setFilters, addCard };
}
```

**3. Extract to `stores/` - Global state with Zustand**

```typescript
// stores/deckBuilderStore.ts
import { create } from 'zustand';

interface DeckBuilderState {
  deckCardIds: number[];
  addCard: (cardId: number) => void;
  removeCard: (cardId: number) => void;
}

export const useDeckBuilderStore = create<DeckBuilderState>((set) => ({
  deckCardIds: [],
  addCard: (cardId) => set((state) => ({ 
    deckCardIds: [...state.deckCardIds, cardId] 
  })),
  removeCard: (cardId) => set((state) => ({
    deckCardIds: state.deckCardIds.filter(id => id !== cardId)
  })),
}));
```

**4. Extract to `lib/` - Shared utilities across ALL features**

```typescript
// lib/validation.ts
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// lib/formatting.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(amount);
}
```

### Import Order After Separation

Always import in this order (top to bottom):

```typescript
// 1. External libraries
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// 2. Internal stores
import { useDeckBuilderStore } from '../stores/deckBuilderStore';
import { useGameStore } from '../stores/gameStore';

// 3. Internal hooks
import { useDeckBuilder } from '../hooks/useDeckBuilder';
import { useCardFilters } from '../hooks/useCardFilters';

// 4. Internal utilities
import { filterByClass, sortByManaCost } from '../utils/cardFilters';
import { validateDeck } from '../utils/deckValidation';

// 5. Internal components
import { CardGrid } from './CardGrid';
import { DeckSidebar } from './DeckSidebar';

// 6. Types
import type { CardData, DeckFilters } from '../types';

// 7. Styles
import './DeckBuilder.css';
```

### Before/After Example

**BEFORE: Monolithic component (BAD)**
```tsx
function DeckBuilder({ heroClass }) {
  const [cards, setCards] = useState([]);
  const [filters, setFilters] = useState({});
  
  // 50 lines of filtering logic embedded here
  // 30 lines of sorting logic embedded here
  // 40 lines of validation logic embedded here
  
  return (
    // 400 lines of JSX with inline logic
  );
}
```

**AFTER: Clean separated component (GOOD)**
```tsx
// DeckBuilder.tsx - ~50 lines max
import { useDeckBuilder } from '../hooks/useDeckBuilder';
import { CardFilters } from './CardFilters';
import { CardGrid } from './CardGrid';
import { DeckSidebar } from './DeckSidebar';

function DeckBuilder({ heroClass }: DeckBuilderProps) {
  const { 
    filteredCards, 
    deckCards, 
    filters, 
    setFilters, 
    addCard, 
    removeCard 
  } = useDeckBuilder(heroClass);
  
  return (
    <div className="deck-builder">
      <CardFilters filters={filters} onChange={setFilters} />
      <CardGrid cards={filteredCards} onSelect={addCard} />
      <DeckSidebar cards={deckCards} onRemove={removeCard} />
    </div>
  );
}
```

---

## Material 3 Expressive Principles

### Motion Physics System

Motion should feel **alive, fluid, and natural**. Use spring-based physics instead of linear easing.

**Spatial Springs**: For position/scale changes - mirrors real-world physics
**Effect Springs**: For color/opacity transitions - creates seamless feel

```typescript
// React Spring example
const springConfig = {
  tension: 300,   // Stiffness
  friction: 20,   // Damping
  mass: 1,        // Weight
};
```

### Expressive Typography

Use **emphasized text styles** to guide attention:
- Headlines use heavier weights for impact
- Body text prioritizes readability
- Actions use distinct styling to stand out

```css
:root {
  --font-emphasis-headline: 700;
  --font-emphasis-body: 400;
  --font-emphasis-action: 600;
}
```

### Shape Library (35 Shapes)

Mix classic and abstract shapes for visual tension:
- **Round corners** for friendly, approachable elements
- **Sharp corners** for professional, serious elements
- **Shape morphing** for smooth state transitions

### Color Hierarchy

Use contrast to establish **visual hierarchy**:
1. **Primary** - Main actions and focus areas
2. **Secondary** - Supporting elements
3. **Tertiary** - Decorative accents
4. **Surface** - Container backgrounds

---

## Expressive Design Tactics

### Tactic 1: Variety of Shapes
Mix corner radii to create visual tension and direct focus.

### Tactic 2: Rich Colors
Use surface tones and color contrast to prioritize actions.

### Tactic 3: Guide with Typography
Emphasized text draws attention to important UI elements.

### Tactic 4: Contain for Emphasis
Group related content into logical containers with visual prominence.

### Tactic 5: Fluid Motion
Shape morphs and spring physics make interactions feel alive.

### Tactic 6: Component Flexibility
UI adapts to user context and screen sizes.

### Tactic 7: Hero Moments
Brief, delightful surprises at critical interactions (limit to 1-2 per product).

---

## File Organization Standards

### Feature Folder Structure

```
feature/
├── components/          # Presentational components
│   ├── FeatureCard.tsx
│   ├── FeatureList.tsx
│   └── index.ts
├── hooks/               # Custom React hooks
│   ├── useFeature.ts
│   └── useFeatureFilters.ts
├── stores/              # Zustand stores
│   └── featureStore.ts
├── utils/               # Pure utility functions
│   ├── featureValidation.ts
│   └── featureTransforms.ts
├── types/               # TypeScript types
│   └── feature.types.ts
├── styles/              # CSS modules/tokens
│   ├── tokens.css
│   ├── components.css
│   └── index.css
└── index.ts             # Public API
```

### CSS Architecture (Layer System)

```css
/* styles/index.css - Import order matters */
@import "./tokens.css";      /* 1. Design tokens */
@import "./base.css";        /* 2. Reset & base styles */
@import "./layout.css";      /* 3. Grid & spacing */
@import "./components.css";  /* 4. Component styles */
@import "./utilities.css";   /* 5. Helper classes */
```

---

## Quality Standards

### Component Rules

1. **Single Responsibility**: One component = one purpose
2. **Max 200 Lines**: Split if larger
3. **No Inline Logic**: Extract to hooks/utils
4. **Typed Props**: Full TypeScript interfaces
5. **Composition Over Inheritance**: Build from smaller parts

### Style Rules

1. **Token-First**: Never use raw values
2. **Scoped Styles**: CSS modules or BEM naming
3. **Mobile-First**: Responsive by default
4. **Accessibility**: WCAG 2.1 AA minimum

### State Management Rules

1. **Colocate State**: Keep state close to where it's used
2. **Derive Don't Store**: Compute values instead of caching
3. **Single Source of Truth**: One store per domain
4. **Immutable Updates**: Never mutate state directly

---

## Anti-Patterns to Avoid

### DON'T

```tsx
// Monolithic component with mixed concerns
function DeckBuilder() {
  const [cards, setCards] = useState([]);
  const [filters, setFilters] = useState({});
  
  // 500 lines of mixed logic and JSX...
  
  return <div>...</div>;
}
```

### DO

```tsx
// Separated concerns
function DeckBuilder() {
  const { cards, filters, actions } = useDeckBuilder();
  
  return (
    <DeckBuilderLayout>
      <CardFilters filters={filters} onChange={actions.setFilters} />
      <CardGrid cards={cards} onSelect={actions.addCard} />
      <DeckSidebar deck={deck} onRemove={actions.removeCard} />
    </DeckBuilderLayout>
  );
}
```

---

## Implementation Checklist

When building a new feature:

- [ ] Create feature folder structure
- [ ] Define TypeScript types first
- [ ] Create design tokens in `tokens.css`
- [ ] Build pure utility functions
- [ ] Create Zustand store for state
- [ ] Build custom hooks for logic
- [ ] Create small, focused components
- [ ] Add responsive styles
- [ ] Test accessibility
- [ ] Document public API

---

## Advanced Design System Standards

### Layered Token Architecture (Thumbprint Model)

Design systems work best with **three layers** that trade granularity for quality:

```
┌─────────────────────────────────────────┐
│  Layer 3: Components                    │  ← Pre-built UI patterns (Button, Modal)
│  - Highest abstraction, least flexible  │
│  - Accessible solutions for common UIs  │
└─────────────────────────────────────────┘
                    ▲
┌─────────────────────────────────────────┐
│  Layer 2: Atomic CSS                    │  ← Utility classes (spacing, layout)
│  - Build UIs without custom CSS         │
│  - Escape hatch when components break   │
└─────────────────────────────────────────┘
                    ▲
┌─────────────────────────────────────────┐
│  Layer 1: Design Tokens                 │  ← Raw values (colors, spacing, radii)
│  - Most granular and flexible           │
│  - Foundation for everything above      │
└─────────────────────────────────────────┘
```

**The Pit of Success Principle**: Make it easy to do the right thing, and annoying (but not impossible) to do the wrong thing.

- If a component doesn't fit, use Atomic CSS as an escape hatch
- If Atomic doesn't fit, use raw tokens
- Track workarounds and build them into components when patterns emerge

### 8pt Spatial System

Use an **8pt base grid** with **4pt half-steps** for consistent visual rhythm:

```css
:root {
  /* 8pt scale for elements and major spacing */
  --space-1: 8px;   /* sm */
  --space-2: 16px;  /* md */
  --space-3: 24px;  /* lg */
  --space-4: 32px;  /* xl */
  --space-5: 40px;  /* 2xl */
  
  /* 4pt half-step for fine adjustments (icons, text blocks) */
  --space-half: 4px;
  --space-1-half: 12px;  /* 8 + 4 */
}
```

**Sizing Strategy:**
- **Element-First**: Prioritize strict element sizes (buttons, inputs) for visual rhythm
- **Content-First**: Prioritize strict padding when content is unpredictable (tables, cards)

**Border Placement**: Use `box-sizing: border-box` universally (web standard).

### Purpose-Driven Component Definitions

Every component needs a **Design Rationale** - a clear statement of its purpose that drives all decisions:

```typescript
/**
 * Modal Component
 * 
 * PURPOSE: Ask the user for confirmation before a destructive action.
 * 
 * USE WHEN:
 * - User must confirm deletion, logout, or irreversible changes
 * - User must acknowledge important information before proceeding
 * 
 * DO NOT USE FOR:
 * - Displaying informational content (use Popover instead)
 * - Non-blocking notifications (use Toast instead)
 * - Detailed help content (use Tooltip instead)
 */
```

**Benefits of Purpose-Driven Design:**
1. Prevents component misuse (Modal vs Popover vs Tooltip confusion)
2. Enables maintainers to update components without breaking consumers
3. Creates clear contribution guidelines (does this fit the purpose?)
4. Removes ambiguous documentation language (avoid "sometimes", "mostly", "in general")

### Semantic Token Naming

Token names should describe **intent**, not implementation:

```css
/* BAD: Implementation-based names */
--blue-500: #3b82f6;
--padding-16: 16px;

/* GOOD: Intent-based names */
--color-action-primary: #3b82f6;
--spacing-component-padding: 16px;

/* BEST: Layered semantic tokens (Spectrum model) */
--button-cta-background: var(--color-action-primary);
--color-action-primary: var(--blue-500);
--blue-500: #3b82f6;
```

This creates a **three-layer reference chain** that allows global changes at any level.

### Icon System Standards

**Core Rules:**
- **One size**: Build all icons at a single base size (24x24 recommended)
- **One color**: Product icons use a single fill color (black/white)
- **One style**: Either stroked OR filled, never mixed in a set
- **Pixel-aligned**: All anchor points on the pixel grid

**Stroke vs Fill Decision:**
- Stroked icons: Better for fine details, smaller sizes
- Filled icons: Higher recognizability, better at a glance

---

## References

- [designsystems.com](https://www.designsystems.com/) - Design system patterns and case studies
- [Material Design 3 Expressive](https://m3.material.io/blog/building-with-m3-expressive) - Expressive component guidelines
- [Spotify Design System](https://www.designsystems.com/how-spotifys-design-system-goes-beyond-platforms/) - Cross-platform patterns
- [Thumbprint Design System](https://www.designsystems.com/how-thumbtack-structures-their-design-system/) - Layered architecture model
- [Space, Grids, and Layouts](https://www.designsystems.com/space-grids-and-layouts/) - 8pt grid system guide
- [Iconography Guide](https://www.designsystems.com/iconography-guide/) - Icon creation standards
- [Collaborative Component Definitions](https://www.designsystems.com/a-collaborative-approach-to-defining-components-and-their-features/) - Purpose-driven design
