/**
 * Card JSON Schema with Zod Validation
 * 
 * This schema validates card data imported from JSON files,
 * ensuring type safety and catching errors at build time.
 */
import { z } from 'zod';

export const CardTypeSchema = z.enum(['minion', 'spell', 'weapon', 'hero', 'secret', 'location']);
export const CardRaritySchema = z.enum(['basic', 'common', 'rare', 'epic', 'mythic']);

export const BattlecryEffectSchema = z.object({
  type: z.string(),
  targetType: z.string().optional(),
  value: z.number().optional(),
  requiresTarget: z.boolean().optional(),
  summonCardId: z.number().optional(),
  summonCount: z.number().optional(),
  buffAttack: z.number().optional(),
  buffHealth: z.number().optional(),
}).passthrough();

export const DeathrattleEffectSchema = z.object({
  type: z.string(),
  targetType: z.string().optional(),
  value: z.number().optional(),
  effects: z.array(z.any()).optional(),
}).passthrough();

export const SpellEffectSchema = z.object({
  type: z.string(),
  targetType: z.string().optional(),
  value: z.number().optional(),
  requiresTarget: z.boolean().optional(),
}).passthrough();

export const TriggeredEffectSchema = z.object({
  type: z.string(),
  targetType: z.string().optional(),
  value: z.union([z.number(), z.string()]).optional(),
  condition: z.union([z.string(), z.record(z.any())]).optional(),
}).passthrough();

export const AuraEffectSchema = z.object({
  type: z.string(),
  targetType: z.string().optional(),
  value: z.number().optional(),
  condition: z.union([z.string(), z.record(z.any())]).optional(),
}).passthrough();

export const PassiveEffectSchema = z.object({
  type: z.string(),
  value: z.number().optional(),
  condition: z.union([z.string(), z.record(z.any())]).optional(),
}).passthrough();

export const BaseCardSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  flavorText: z.string().optional(),
  type: CardTypeSchema,
  rarity: CardRaritySchema.optional().default('common'),
  manaCost: z.number().min(0).max(25).optional(),
  class: z.string().optional(),
  heroClass: z.string().optional(),
  collectible: z.boolean().optional().default(true),
  race: z.string().optional(),
  set: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
});

export const MinionCardSchema = BaseCardSchema.extend({
  type: z.literal('minion'),
  attack: z.number().min(0).optional(),
  health: z.number().min(1).optional(),
  battlecry: BattlecryEffectSchema.optional(),
  deathrattle: DeathrattleEffectSchema.optional(),
  endOfTurn: TriggeredEffectSchema.optional(),
  onFriendlyDeath: TriggeredEffectSchema.optional(),
  onSummon: TriggeredEffectSchema.optional(),
  onKill: TriggeredEffectSchema.optional(),
  onDamage: TriggeredEffectSchema.optional(),
  onAttack: TriggeredEffectSchema.optional(),
  startOfTurn: TriggeredEffectSchema.optional(),
  onSurviveDamage: TriggeredEffectSchema.optional(),
  onAnyDeath: TriggeredEffectSchema.optional(),
  onDamageTaken: TriggeredEffectSchema.optional(),
  aura: AuraEffectSchema.optional(),
  passive: PassiveEffectSchema.optional(),
  cantBeSilenced: z.boolean().optional(),
});

export const SpellCardSchema = BaseCardSchema.extend({
  type: z.literal('spell'),
  spellEffect: SpellEffectSchema.optional(),
});

export const WeaponCardSchema = BaseCardSchema.extend({
  type: z.literal('weapon'),
  attack: z.number().min(0).optional(),
  durability: z.number().min(1).optional(),
});

export const HeroCardSchema = BaseCardSchema.extend({
  type: z.literal('hero'),
  armor: z.number().optional(),
  health: z.number().optional(),
});

export const SecretCardSchema = BaseCardSchema.extend({
  type: z.literal('secret'),
});

export const LocationCardSchema = BaseCardSchema.extend({
  type: z.literal('location'),
  durability: z.number().min(1).optional(),
});

export const CardDataSchema = z.discriminatedUnion('type', [
  MinionCardSchema,
  SpellCardSchema,
  WeaponCardSchema,
  HeroCardSchema,
  SecretCardSchema,
  LocationCardSchema,
]);

export type ValidatedCardData = z.infer<typeof CardDataSchema>;

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    cardId?: number;
    cardName?: string;
    field: string;
    message: string;
    path: string[];
  }>;
  cards: ValidatedCardData[];
}

export function validateCards(cards: unknown[]): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    cards: [],
  };

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const parseResult = CardDataSchema.safeParse(card);
    
    if (parseResult.success) {
      result.cards.push(parseResult.data);
    } else {
      result.valid = false;
      for (const error of parseResult.error.errors) {
        result.errors.push({
          cardId: (card as any)?.id,
          cardName: (card as any)?.name,
          field: error.path.join('.') || 'root',
          message: error.message,
          path: error.path.map(String),
        });
      }
    }
  }

  return result;
}

export function validateSingleCard(card: unknown): { valid: boolean; card?: ValidatedCardData; errors: string[] } {
  const parseResult = CardDataSchema.safeParse(card);
  
  if (parseResult.success) {
    return { valid: true, card: parseResult.data, errors: [] };
  }
  
  return {
    valid: false,
    errors: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}
