# CSS Theme Centralization — Audit & Migration Guide

## Estado Actual (2026-04-21)

### ✅ Completado
| Archivo | Estado | Acción |
|---------|--------|--------|
| `styles/design-tokens.css` | ✅ Centralizado | Fuente única de verdad — **282 variables** |
| `game/combat/styles/game-hud.css` | ✅ Migrado | 0 hex hardcoded, 30 var() references |
| `game/components/deckbuilder/tokens.css` | ✅ Refactorizado | Ahora deriva del tema global |
| `game/components/SimpleCard.css` | ✅ Parcial | Rarezas, stat-values, gems, evolution migrados |
| `styles/homepage.css` | ✅ Parcial | Textos, bordes, superficies comunes migrados |

---

## Paleta Canónica (design-tokens.css)

### Colores primitivos
```css
/* Fondos oscuros (usa estos en backgrounds) */
--obsidian-950  → #0a0907  (fondo raíz)
--obsidian-900  → #100d0a  (panel)
--obsidian-850  → #151210  (elevado)
--obsidian-800  → #1c1814  (card bg)
--obsidian-750  → #241f19  (hover)
--obsidian-700  → #2d2720  (borde fuerte)
--obsidian-600  → #3a332a  (divider)

/* Texto (usa estos para Typography) */
--ink-0   → #f5ede0  (texto primario)
--ink-100 → #e6dcc8  (levemente atenuado)
--ink-200 → #b8ad97  (secundario)
--ink-300 → #8a816f  (terciario)
--ink-400 → #5d564a  (deshabilitado)

/* Dorados (acento primario) */
--gold-200  → #e9c877
--gold-300  → #d9a844  ← hero gold (el más usado)
--gold-400  → #c08a24
--gold-glow → oklch(78% 0.14 82)

/* Ember (peligro, energía) */
--ember-300 → #ff6a28
--ember-400 → #d94a12
--ember-500 → #a5310a

/* Bifrost (raro/místico) */
--bifrost-300 → #7aa9ff
--bifrost-500 → #4a6fe0
```

### Aliases semánticos (prefiere estos en componentes)
```css
/* Texto */
--text-gold-warm  → rgba(248, 200, 120, 0.88)  ← kickers y etiquetas doradas
--text-slate      → rgba(148, 163, 184, 0.72)  ← texto de apoyo
--text-bright     → rgba(226, 232, 240, 0.78)  ← párrafos
--text-dimmed     → rgba(226, 232, 240, 0.68)  ← notas
--text-near-white → #F8FAFC                     ← títulos
--text-e2         → #E2E8F0                     ← texto chip

/* Superficies semi-transparentes */
--surface-overlay-deep  → rgba(8, 12, 22, 0.80)   ← fondos HUD oscuros
--surface-overlay-mid   → rgba(15, 23, 42, 0.85)  ← tooltips
--surface-chip          → rgba(30, 41, 59, 0.72)  ← chips/badges
--surface-card-dark     → rgba(10, 14, 28, 0.72)  ← cards secundarias

/* Bordes */
--border-chip       → rgba(148, 163, 184, 0.15)  ← bordes sutiles
--border-bright     → rgba(148, 163, 184, 0.20)
--border-gold-soft  → rgba(240, 187, 87, 0.18)   ← hover dorado
--border-gold-mid   → rgba(240, 187, 87, 0.30)
--border-green-soft → rgba(74, 222, 128, 0.22)   ← completado/éxito
--border-red-soft   → rgba(200, 50, 50, 0.25)    ← peligro/opponent

/* Estado (success / warning / danger / info) */
--success-300 / --success-400 / --success-glow
--warning-300 / --warning-400 / --warning-glow
--danger-300  / --danger-400  / --danger-glow
--info-300    / --info-400    / --info-glow

/* Rarezas de Cartas (SimpleCard) */
--card-rare-blue-deep/mid/bright/pale/glow
--card-epic-purple-deep/mid/bright/pale/glow
--card-mythic-gold-deep/mid/bright/pale/glow
--card-common-steel
```

---

## Archivos que aún necesitan migración (85 total)
Prioridad alta (mayor impacto visual):

### 🔴 Alta Prioridad
| Archivo | Problema principal |
|---------|-------------------|
| `game/components/styles/NorseTheme.css` | Colores hardcoded en fondos de battlefield zones |
| `game/components/GameLog.css` | `#daa520` (goldenrod) → usar `--gold-300`; `#ef4444` → `--danger-400` |
| `game/components/ActionAnnouncement.css` | Redefine colores de rareza sin referenciar tokens |
| `game/components/deckbuilder/deckbuilder.css` | 1712 líneas, muchos hex hardcoded |
| `game/combat/styles/hp-bar.css` | HP bar colors |
| `game/combat/styles/glow-effects.css` | Glows de rareza duplicados |
| `game/combat/styles/elemental-glows.css` | Elementos temáticos |

### 🟡 Media Prioridad
| Archivo | Problema principal |
|---------|-------------------|
| `game/components/collection/collection.css` | Colores de colección |
| `game/combat/styles/game-over.css` | Colores de pantalla de fin de juego |
| `game/combat/styles/timer.css` | Timer colors |
| `game/components/ManaBar.css` | Mana colors |
| `game/components/HUDOverlay.css` | Overlay colors |

### 🟢 Baja Prioridad (efectos especiales — OK mantener valores raw)
- Archivos de partículas/animaciones (`card-particles`, `combat-animations.css`)
- Efectos holográficos (`holoEffect.css`) — dependen de Physics exactos
- `AttackStyles.css`, `spell-screen-effects.css` — efectos vibrantes intencionales

---

## Reglas de Migración

### ❌ NO hagas esto
```css
/* Colores hardcoded directos */
color: #fbbf24;
background: rgba(30, 41, 59, 0.72);
border: 1px solid rgba(148, 163, 184, 0.15);
```

### ✅ SÍ haz esto
```css
/* Usa los tokens centralizados */
color: var(--warning-300);
background: var(--surface-chip);
border: 1px solid var(--border-chip);
```

### Para transparencias de colores primarios
```css
/* En lugar de rgba(168, 85, 247, 0.4) */
color: color-mix(in srgb, var(--card-epic-purple-bright) 40%, transparent);

/* En lugar de rgba(59, 130, 246, 0.15) */
background: color-mix(in srgb, var(--card-rare-blue-bright) 15%, transparent);
```

---

## Verificación
Para verificar que un archivo está en conformidad:
```bash
# Debe mostrar 0 o muy pocas líneas
grep -n "#[0-9a-fA-F]\{6\}" mi-componente.css | grep -v "var(--"

# Caso especial OK: gradientes de partículas/animaciones con física exacta
# Caso especial OK: valores #fff, #000 en text-shadow black overlays
```
