/*
  collectionMilestoneStore.ts — tracks collection achievement milestones.

  Milestones fire once when a player reaches a collection threshold.
  Each milestone has a unique ID, name, description, and threshold.
  Once earned, milestones persist in localStorage and never re-fire.

  The store exposes a `checkMilestones(cardCount, mythicCount, epicCount)`
  method that the CollectionPage calls after loading inventory. Any newly
  earned milestones are returned for toast/banner display.
*/

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CollectionMilestone {
	id: string;
	name: string;
	description: string;
	icon: string;       // Unicode or emoji
	threshold: number;  // trigger value
	field: 'total' | 'mythic' | 'epic';
}

export const MILESTONES: CollectionMilestone[] = [
	// Total card collection
	{ id: 'cards-50',   name: 'Fledgling Collector',      description: 'Collect 50 unique cards',       icon: '\u2694', threshold: 50,   field: 'total' },
	{ id: 'cards-100',  name: 'Saga Keeper',              description: 'Collect 100 unique cards',      icon: '\uD83D\uDCDC', threshold: 100,  field: 'total' },
	{ id: 'cards-250',  name: 'Rune Hoarder',             description: 'Collect 250 unique cards',      icon: '\u16A0', threshold: 250,  field: 'total' },
	{ id: 'cards-500',  name: 'Keeper of the Nine Realms', description: 'Collect 500 unique cards',     icon: '\uD83C\uDF0C', threshold: 500,  field: 'total' },
	{ id: 'cards-1000', name: 'Yggdrasil\u2019s Memory',  description: 'Collect 1,000 unique cards',    icon: '\uD83C\uDF33', threshold: 1000, field: 'total' },
	{ id: 'cards-2000', name: 'Allfather\u2019s Library',  description: 'Collect 2,000 unique cards',   icon: '\uD83D\uDC51', threshold: 2000, field: 'total' },

	// Mythic collection
	{ id: 'mythic-10',  name: 'Mythic Dawn',              description: 'Collect 10 mythic cards',       icon: '\u2728', threshold: 10,   field: 'mythic' },
	{ id: 'mythic-50',  name: 'Divine Arsenal',           description: 'Collect 50 mythic cards',       icon: '\u26A1', threshold: 50,   field: 'mythic' },
	{ id: 'mythic-100', name: 'Pantheon Complete',         description: 'Collect 100 mythic cards',     icon: '\uD83C\uDFDB\uFE0F', threshold: 100,  field: 'mythic' },

	// Epic collection
	{ id: 'epic-25',    name: 'Epic Forge',               description: 'Collect 25 epic cards',         icon: '\uD83D\uDD2E', threshold: 25,   field: 'epic' },
	{ id: 'epic-100',   name: 'Saga of Legends',          description: 'Collect 100 epic cards',        icon: '\uD83D\uDCA0', threshold: 100,  field: 'epic' },
];

interface MilestoneState {
	earned: string[];   // milestone IDs
	checkMilestones: (total: number, mythic: number, epic: number) => CollectionMilestone[];
}

export const useCollectionMilestoneStore = create<MilestoneState>()(
	persist(
		(set, get) => ({
			earned: [],

			checkMilestones: (total: number, mythic: number, epic: number) => {
				const current = get().earned;
				const newlyEarned: CollectionMilestone[] = [];

				for (const m of MILESTONES) {
					if (current.includes(m.id)) continue;
					const value = m.field === 'total' ? total : m.field === 'mythic' ? mythic : epic;
					if (value >= m.threshold) {
						newlyEarned.push(m);
					}
				}

				if (newlyEarned.length > 0) {
					set({ earned: [...current, ...newlyEarned.map(m => m.id)] });
				}

				return newlyEarned;
			},
		}),
		{ name: 'ragnarok-collection-milestones' }
	)
);
