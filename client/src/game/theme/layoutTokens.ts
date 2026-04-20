export const zLayers = {
  // Base layers
  battlefield: 10,
  fieldBackground: 15,
  
  // Card layers (using isolation contexts)
  cards: 20,
  playerField: 25,
  minionBase: 30,
  minionHovered: 100,
  minionAttacking: 150,
  minionDragging: 200,
  
  // UI layers
  hand: 50,
  handCardHovered: 80,
  hudControls: 100,
  endTurnButton: 200,
  tooltips: 500,
  modals: 1000,
  overlays: 2000,
  targeting: 5000,
  notifications: 9000,
  topmost: 10000,
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

export const cardSizes = {
  battlefield: {
    width: 113,
    height: 150,
  },
  battlefieldSlot: {
    width: 125,
    height: 165,
  },
  hand: {
    width: 300,
    height: 420,
  },
  handSmall: {
    width: 180,
    height: 252,
  },
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  xxl: '1536px',
} as const;

export const colors = {
  primary: '#c9a227',
  primaryLight: '#e6b800',
  primaryDark: '#8b6914',
  playerZone: 'rgba(59, 130, 246, 0.1)',
  opponentZone: 'rgba(239, 68, 68, 0.1)',
  gold: '#ffd700',
  danger: '#ef4444',
  success: '#22c55e',
} as const;

export const cssVariables = `
  :root {
    /* Z-Index Layers */
    --z-battlefield: ${zLayers.battlefield};
    --z-field-background: ${zLayers.fieldBackground};
    --z-cards: ${zLayers.cards};
    --z-player-field: ${zLayers.playerField};
    --z-minion-base: ${zLayers.minionBase};
    --z-minion-hovered: ${zLayers.minionHovered};
    --z-minion-attacking: ${zLayers.minionAttacking};
    --z-minion-dragging: ${zLayers.minionDragging};
    --z-hand: ${zLayers.hand};
    --z-hand-card-hovered: ${zLayers.handCardHovered};
    --z-hud-controls: ${zLayers.hudControls};
    --z-end-turn-button: ${zLayers.endTurnButton};
    --z-tooltips: ${zLayers.tooltips};
    --z-modals: ${zLayers.modals};
    --z-overlays: ${zLayers.overlays};
    --z-targeting: ${zLayers.targeting};
    --z-notifications: ${zLayers.notifications};
    --z-topmost: ${zLayers.topmost};

    /* Spacing */
    --spacing-xs: ${spacing.xs};
    --spacing-sm: ${spacing.sm};
    --spacing-md: ${spacing.md};
    --spacing-lg: ${spacing.lg};
    --spacing-xl: ${spacing.xl};
    --spacing-xxl: ${spacing.xxl};

    /* Card Sizes */
    --battlefield-card-width: ${cardSizes.battlefield.width}px;
    --battlefield-card-height: ${cardSizes.battlefield.height}px;
    --battlefield-slot-width: ${cardSizes.battlefieldSlot.width}px;
    --battlefield-slot-height: ${cardSizes.battlefieldSlot.height}px;
    --hand-card-width: ${cardSizes.hand.width}px;
    --hand-card-height: ${cardSizes.hand.height}px;

    /* Colors */
    --color-primary: ${colors.primary};
    --color-primary-light: ${colors.primaryLight};
    --color-primary-dark: ${colors.primaryDark};
    --color-player-zone: ${colors.playerZone};
    --color-opponent-zone: ${colors.opponentZone};
    --color-gold: ${colors.gold};
    --color-danger: ${colors.danger};
    --color-success: ${colors.success};
  }
`;

export type ZLayer = keyof typeof zLayers;
export type Spacing = keyof typeof spacing;
