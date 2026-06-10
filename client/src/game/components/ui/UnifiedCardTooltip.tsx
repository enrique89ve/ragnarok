/**
 * UnifiedCardTooltip.tsx
 * 
 * SINGLE SOURCE OF TRUTH for all card hover tooltips in the game.
 * Norse-themed design with keyword icons and explanations.
 * Uses React Portal for proper layering above all game elements.
 * 
 * Replaces and consolidates:
 * - CardHoverPreview.tsx (hand cards)
 * - Browser title attributes on icons
 * - Fragmented tooltip logic in Card.tsx and SimpleCard.tsx
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { KEYWORD_ICON_MAP } from './CardIconsSVG';
import { GameIcon } from '../../utils/ui/GameIcon';
import type { IconName } from '../../utils/ui/iconMap';
import './UnifiedCardTooltip.css';

// Keyword definitions - canonical source for all keyword explanations
// Icons are Lucide components resolved via GameIcon + iconMap
type KeywordDef = { iconName: IconName; color: string; description: string; SvgIcon?: React.FC<React.SVGProps<SVGSVGElement>> };
export const KEYWORD_DEFINITIONS: Record<string, KeywordDef> = {
  'battlecry': { iconName: 'swords', color: '#FFD700', description: 'Triggers when you play this card from your hand.', SvgIcon: KEYWORD_ICON_MAP['battlecry'] },
  'deathrattle': { iconName: 'skull', color: '#9B59B6', description: 'Triggers when this minion dies.', SvgIcon: KEYWORD_ICON_MAP['deathrattle'] },
  'taunt': { iconName: 'shield', color: '#7F8C8D', description: 'Enemies must attack this minion first.', SvgIcon: KEYWORD_ICON_MAP['taunt'] },
  'divine shield': { iconName: 'sparkles', color: '#F1C40F', description: 'The first damage this minion takes is ignored.', SvgIcon: KEYWORD_ICON_MAP['divine shield'] },
  'charge': { iconName: 'zap', color: '#E74C3C', description: 'Can attack immediately.', SvgIcon: KEYWORD_ICON_MAP['charge'] },
  'rush': { iconName: 'zap', color: '#E67E22', description: 'Can attack minions immediately.', SvgIcon: KEYWORD_ICON_MAP['rush'] },
  'lifesteal': { iconName: 'heart', color: '#E91E63', description: 'Damage dealt also heals your hero.', SvgIcon: KEYWORD_ICON_MAP['lifesteal'] },
  'poisonous': { iconName: 'skullCrossed', color: '#27AE60', description: 'Destroy any minion damaged by this.', SvgIcon: KEYWORD_ICON_MAP['poisonous'] },
  'windfury': { iconName: 'wind', color: '#3498DB', description: 'Can attack twice each turn.', SvgIcon: KEYWORD_ICON_MAP['windfury'] },
  'stealth': { iconName: 'eye', color: '#34495E', description: 'Cannot be targeted until it attacks.', SvgIcon: KEYWORD_ICON_MAP['stealth'] },
  'reborn': { iconName: 'refresh', color: '#1ABC9C', description: 'Returns to life with 1 Health.', SvgIcon: KEYWORD_ICON_MAP['reborn'] },
  'discover': { iconName: 'search', color: '#9B59B6', description: 'Choose one of three cards to add to your hand.', SvgIcon: KEYWORD_ICON_MAP['discover'] },
  'freeze': { iconName: 'snowflake', color: '#00BCD4', description: 'Frozen characters lose their next attack.', SvgIcon: KEYWORD_ICON_MAP['freeze'] },
  'silence': { iconName: 'mute', color: '#95A5A6', description: 'Removes all card text and enchantments.', SvgIcon: KEYWORD_ICON_MAP['silence'] },
  'combo': { iconName: 'target', color: '#8E44AD', description: 'Bonus effect if you played another card first this turn.', SvgIcon: KEYWORD_ICON_MAP['combo'] },
  'inspire': { iconName: 'sparkles', color: '#F39C12', description: 'Triggers each time you use your Hero Power.', SvgIcon: KEYWORD_ICON_MAP['inspire'] },
  'adapt': { iconName: 'leaf', color: '#2ECC71', description: 'Choose one of three bonuses.', SvgIcon: KEYWORD_ICON_MAP['adapt'] },
  'spell damage': { iconName: 'crystal', color: '#9B59B6', description: 'Your spells deal extra damage.', SvgIcon: KEYWORD_ICON_MAP['spell_damage'] },
  'overload': { iconName: 'lock', color: '#3498DB', description: 'Locks some mana crystals next turn.', SvgIcon: KEYWORD_ICON_MAP['overload'] },
  'secret': { iconName: 'question', color: '#E74C3C', description: 'Rune — a hidden enchantment that triggers when a specific condition is met.', SvgIcon: KEYWORD_ICON_MAP['secret'] },
  'frenzy': { iconName: 'flame', color: '#E74C3C', description: 'Triggers the first time this survives damage.', SvgIcon: KEYWORD_ICON_MAP['frenzy'] },
  'echo': { iconName: 'volume', color: '#9B59B6', description: 'Can be played multiple times per turn.', SvgIcon: KEYWORD_ICON_MAP['echo'] },
  'magnetic': { iconName: 'magnet', color: '#607D8B', description: 'Runic Bond — attaches to a friendly Automaton.', SvgIcon: KEYWORD_ICON_MAP['magnetic'] },
  'overkill': { iconName: 'flame', color: '#E74C3C', description: 'Triggers when dealing excess lethal damage.', SvgIcon: KEYWORD_ICON_MAP['overkill'] },
  'outcast': { iconName: 'arrowDown', color: '#A330C9', description: 'Bonus if this is the leftmost or rightmost card in your hand.', SvgIcon: KEYWORD_ICON_MAP['outcast'] },
  'colossal': { iconName: 'mountain', color: '#1ABC9C', description: 'Summons additional appendage minions.', SvgIcon: KEYWORD_ICON_MAP['colossal'] },
  'dormant': { iconName: 'moon', color: '#607D8B', description: 'Starts asleep. Awakens after 2 turns.', SvgIcon: KEYWORD_ICON_MAP['dormant'] },
  'corrupt': { iconName: 'wind', color: '#8E44AD', description: 'Upgrades in hand after you play a higher-cost card.', SvgIcon: KEYWORD_ICON_MAP['corrupt'] },
  'tradeable': { iconName: 'refresh', color: '#F39C12', description: 'Drag to your deck to spend 1 mana and draw a new card.', SvgIcon: KEYWORD_ICON_MAP['tradeable'] },
  'spellburst': { iconName: 'zap', color: '#9B59B6', description: 'Triggers after you cast a spell.', SvgIcon: KEYWORD_ICON_MAP['spellburst'] },
};

export interface TooltipCardData {
  id: number | string;
  name: string;
  manaCost: number;
  attack?: number;
  health?: number;
  description?: string;
  type: string;
  rarity?: string;
  tribe?: string;
  cardClass?: string;
  keywords?: string[];
  artPath?: string;
}

interface UnifiedCardTooltipProps {
  card: TooltipCardData | null;
  position: { x: number; y: number } | null;
  visible: boolean;
  placement?: 'above' | 'below' | 'left' | 'right' | 'auto';
}

/**
 * Extract keywords from card data (explicit array + description parsing)
 */
export function extractKeywords(card: TooltipCardData): { keyword: string; iconName: IconName; color: string; description: string }[] {
  const foundKeywords: { keyword: string; iconName: IconName; color: string; description: string }[] = [];
  const addedKeywords = new Set<string>();

  // First, check explicit keywords array
  if (card.keywords && Array.isArray(card.keywords)) {
    for (const keyword of card.keywords) {
      const key = keyword.toLowerCase();
      const def = KEYWORD_DEFINITIONS[key];
      if (def && !addedKeywords.has(key)) {
        foundKeywords.push({ keyword: key, ...def });
        addedKeywords.add(key);
      }
    }
  }

  // Then, parse description for additional keywords
  if (card.description) {
    const desc = card.description.toLowerCase();
    for (const [keyword, def] of Object.entries(KEYWORD_DEFINITIONS)) {
      if (desc.includes(keyword) && !addedKeywords.has(keyword)) {
        foundKeywords.push({ keyword, ...def });
        addedKeywords.add(keyword);
      }
    }
  }

  return foundKeywords.slice(0, 6); // Limit to 6 keywords max
}

function highlightKeywords(text: string): React.ReactNode[] {
	const sortedKeywords = Object.keys(KEYWORD_DEFINITIONS).sort((a, b) => b.length - a.length);
	const pattern = new RegExp(`\\b(${sortedKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
	const parts: React.ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}
		const keyword = match[1].toLowerCase();
		const def = KEYWORD_DEFINITIONS[keyword];
		if (def) {
			parts.push(
				<span key={match.index} className="keyword-highlight" style={{ color: def.color, fontWeight: 600 }}>
					{match[1]}
				</span>
			);
		} else {
			parts.push(match[1]);
		}
		lastIndex = pattern.lastIndex;
	}
	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}
	return parts;
}

/**
 * UnifiedCardTooltip - Portal-based tooltip for consistent card info display
 */
export const UnifiedCardTooltip: React.FC<UnifiedCardTooltipProps> = ({
  card,
  position,
  visible,
  placement = 'auto'
}) => {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!visible || !position || !card) return;

    const tooltipWidth = 280;
    const tooltipHeight = 200;
    const margin = 16;

    let left = position.x;
    let top = position.y;

    // Auto placement logic
    if (placement === 'auto' || placement === 'above') {
      // Try above first
      top = position.y - tooltipHeight - margin;
      left = position.x - tooltipWidth / 2;

      // If above would go off screen, place below
      if (top < margin) {
        top = position.y + margin + 20;
      }
    } else if (placement === 'below') {
      top = position.y + margin + 20;
      left = position.x - tooltipWidth / 2;
    } else if (placement === 'left') {
      left = position.x - tooltipWidth - margin;
      top = position.y - tooltipHeight / 2;
    } else if (placement === 'right') {
      left = position.x + margin + 20;
      top = position.y - tooltipHeight / 2;
    }

    // Clamp to viewport bounds
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin));

    setTooltipStyle({
      left: `${left}px`,
      top: `${top}px`,
      width: `${tooltipWidth}px`,
    });
  }, [visible, position, card, placement]);

  if (!visible || !card || !position) return null;

  const keywords = extractKeywords(card);
  const rarityClass = `rarity-${card.rarity?.toLowerCase() || 'common'}`;
  const typeLabel = card.type?.charAt(0).toUpperCase() + card.type?.slice(1) || 'Card';

  const tooltipContent = (
    <div 
      className={`unified-card-tooltip ${rarityClass}`}
      style={tooltipStyle}
    >
      {/* Header with card name and mana cost */}
      <div className="tooltip-header">
        <span className="tooltip-mana">{card.manaCost}</span>
        <span className="tooltip-name">{card.name}</span>
      </div>

      {/* Card type and tribe */}
      <div className="tooltip-type-row">
        <span className="tooltip-type">{typeLabel}</span>
        {card.tribe && <span className="tooltip-tribe">{card.tribe}</span>}
      </div>

      {/* Stats for minions/weapons */}
      {(card.attack !== undefined || card.health !== undefined) && (
        <div className="tooltip-stats">
          {card.attack !== undefined && (
            <span className="tooltip-attack">
              <GameIcon name="swords" size={14} className="tooltip-stat-icon" aria-label="attack" />
              {card.attack}
            </span>
          )}
          {card.health !== undefined && (
            <span className="tooltip-health">
              <GameIcon name="heart" size={14} className="tooltip-stat-icon" aria-label="health" />
              {card.health}
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {card.description && (
        <div className="tooltip-description">
          {highlightKeywords(card.description)}
        </div>
      )}

      {/* Keyword icons with explanations */}
      {keywords.length > 0 && (
        <div className="tooltip-keywords">
          {keywords.map((kw, idx) => (
            <div key={idx} className="tooltip-keyword-item" style={{ borderColor: kw.color }}>
              <span className="keyword-icon" style={{ color: kw.color }}>
                <GameIcon name={kw.iconName} size={16} color={kw.color} aria-label={kw.keyword} />
              </span>
              <div className="keyword-info">
                <span className="keyword-name" style={{ color: kw.color }}>
                  {kw.keyword.charAt(0).toUpperCase() + kw.keyword.slice(1)}
                </span>
                <span className="keyword-desc">{kw.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render via portal to ensure proper layering
  return createPortal(tooltipContent, document.body);
};

export default UnifiedCardTooltip;
