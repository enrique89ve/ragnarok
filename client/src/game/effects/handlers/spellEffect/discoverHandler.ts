/**
 * Discover Effect Handler
 *
 * This handler implements the spellEffect:discover effect.
 * Presents 3 random cards matching criteria for the player to pick and add to hand.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { getRandomCardsFromPool } from '../../../data/discoverPools';
import { getDiscoveryOptions, filterCards } from '../../../utils/discoveryUtils';
import allCards from '../../../data/allCards';

export default function executeDiscoverDiscover(
	context: GameContext,
	effect: SpellEffect,
	sourceCard: Card
): EffectResult {
	try {
		context.logGameEvent(`Executing spellEffect:discover for ${sourceCard.name}`);

		const discoveryCount = effect.discoveryCount || effect.count || 3;
		const discoverType = effect.discoverType || effect.discoveryType || effect.filter || 'any';
		const pool = effect.pool || effect.discoverPool || effect.discoverPoolId;
		const discoverClass = effect.discoveryClass || effect.filterClass || sourceCard.heroClass || 'any';
		const discoverRarity = effect.filterRarity || 'any';
		const manaDiscount = effect.manaDiscount || effect.manaReduction || 0;
		const addToHand = effect.addToHand !== false;

		let discoveryOptions: any[] = [];

		if (pool) {
			discoveryOptions = getRandomCardsFromPool(pool as string, discoveryCount);
			context.logGameEvent(`Discovering from pool: ${pool}`);
		} else if (discoverType && discoverType !== 'any') {
			discoveryOptions = getRandomCardsFromPool(discoverType as string, discoveryCount);
			context.logGameEvent(`Discovering ${discoverType} cards`);
		} else {
			discoveryOptions = getDiscoveryOptions(
				discoveryCount,
				discoverType as any,
				discoverClass as string,
				discoverRarity as any
			);
			context.logGameEvent(`Discovering from general pool`);
		}

		if (discoveryOptions.length === 0) {
			const filteredCards = filterCards(allCards as any[], {
				type: discoverType !== 'any' ? discoverType as any : undefined,
				heroClass: discoverClass !== 'any' ? discoverClass as any : undefined,
				rarity: discoverRarity !== 'any' ? discoverRarity as any : undefined
			});

			if (filteredCards.length > 0) {
				const shuffled = [...filteredCards].sort(() => Math.random() - 0.5);
				discoveryOptions = shuffled.slice(0, discoveryCount);
			}
		}

		if (discoveryOptions.length === 0) {
			context.logGameEvent(`No cards available for discovery`);
			return {
				success: false,
				error: 'No cards available for discovery'
			};
		}

		if (manaDiscount > 0) {
			discoveryOptions = discoveryOptions.map(card => ({
				...card,
				manaCost: Math.max(0, (card.manaCost || 0) - manaDiscount)
			}));
			context.logGameEvent(`Applied mana discount of ${manaDiscount} to discovered cards`);
		}

		context.logGameEvent(`Presenting ${discoveryOptions.length} discovery options to player`);

		return {
			success: true,
			additionalData: {
				discoveryState: {
					active: true,
					options: discoveryOptions,
					sourceCardId: String(sourceCard.id),
					sourceCardName: sourceCard.name,
					discoverType,
					pool,
					manaDiscount,
					addToHand
				}
			}
		};
	} catch (error) {
		debug.error(`Error executing spellEffect:discover:`, error);
		return {
			success: false,
			error: `Error executing spellEffect:discover: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
