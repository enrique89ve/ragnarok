import { CardData, CardType } from '../../types';
import { debug } from '../../config/debugConfig';

const IS_DEV = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface RawCardInput {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  manaCost?: unknown;
  attack?: unknown;
  health?: unknown;
  [key: string]: unknown;
}

function isValidCardType(type: unknown): type is CardType {
  return typeof type === 'string' &&
    ['minion', 'spell', 'weapon', 'hero', 'secret', 'location', 'poker_spell', 'artifact', 'armor'].includes(type);
}

export function validateCard(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!input || typeof input !== 'object') {
    errors.push('Card is not an object');
    return { valid: false, errors, warnings };
  }
  
  const card = input as RawCardInput;
  const cardId = card.id;
  const cardName = card.name;
  const cardType = card.type;
  
  if (cardId === undefined || cardId === null) {
    errors.push(`Card missing ID`);
  } else if (typeof cardId !== 'number' && typeof cardId !== 'string') {
    errors.push(`Card ID must be number or string, got ${typeof cardId}`);
  }
  
  if (!cardName || typeof cardName !== 'string') {
    errors.push(`Card ${cardId} missing or invalid name`);
  }
  
  if (!isValidCardType(cardType)) {
    errors.push(`Card ${cardId} has invalid type: ${cardType}`);
  }
  
  if (cardType === 'minion') {
    if (card.attack === undefined || typeof card.attack !== 'number') {
      errors.push(`Minion ${cardId} missing or invalid attack`);
    }
    if (card.health === undefined || typeof card.health !== 'number') {
      errors.push(`Minion ${cardId} missing or invalid health`);
    }
  }

  if (cardType === 'artifact') {
    if (!card.heroId || typeof card.heroId !== 'string') {
      warnings.push(`Artifact ${cardId} missing heroId`);
    }
  }

  if (cardType === 'armor') {
    if (!card.armorSlot || typeof card.armorSlot !== 'string') {
      warnings.push(`Armor ${cardId} missing armorSlot`);
    }
    if (card.armorValue === undefined || typeof card.armorValue !== 'number') {
      warnings.push(`Armor ${cardId} missing armorValue`);
    }
  }
  
  if (card.manaCost !== undefined && typeof card.manaCost !== 'number') {
    warnings.push(`Card ${cardId} has non-numeric manaCost`);
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

export function validateCardRegistry(cards: unknown[]): CardData[] {
  const seenIds = new Map<number | string, { name: string; index: number }>();
  const validCards: CardData[] = [];
  const errors: string[] = [];
  const duplicates: string[] = [];
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (!card || typeof card !== 'object') continue;
    
    const rawCard = card as RawCardInput;
    const id = rawCard.id;
    
    if (id === undefined || id === null) continue;
    
    const idKey = typeof id === 'number' ? id : String(id);
    
    if (seenIds.has(idKey)) {
      const existing = seenIds.get(idKey)!;
      duplicates.push(`Duplicate ID ${idKey}: "${rawCard.name}" (index ${i}) conflicts with "${existing.name}" (index ${existing.index})`);
      continue;
    }
    
    const result = validateCard(card);
    if (!result.valid) {
      errors.push(...result.errors);
      continue;
    }
    
    seenIds.set(idKey, { name: String(rawCard.name), index: i });
    validCards.push(card as CardData);
  }
  
  if (duplicates.length > 0) {
    debug.error(`[CardRegistry] DUPLICATE IDs FOUND:`);
    duplicates.forEach(d => debug.error(`  - ${d}`));
  }
  
  if (errors.length > 0) {
    debug.warn(`[CardRegistry] ${errors.length} validation errors found`);
    errors.forEach(e => debug.warn(`  - ${e}`));
  }
  
  if (IS_DEV) {
    debug.card(`[CardRegistry] Loaded ${validCards.length} valid cards (${duplicates.length} duplicates skipped)`);
  }
  return validCards;
}
