import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getEitrValue, getCraftCost } from './craftingConstants';

interface CraftingState {
	eitr: number;
}

interface CraftingActions {
	addEitr: (amount: number) => void;
	spendEitr: (amount: number) => boolean;
	canAfford: (rarity: string, golden?: boolean) => boolean;
	getDisenchantValue: (rarity: string) => number;
	getCraftingCost: (rarity: string, golden?: boolean) => number;
}

export const useCraftingStore = create<CraftingState & CraftingActions>()(
	persist(
		(set, get) => ({
			eitr: 0,

			addEitr: (amount) => {
				if (amount <= 0) return;
				set(state => ({ eitr: state.eitr + amount }));
			},

			spendEitr: (amount) => {
				if (get().eitr < amount) return false;
				set(state => ({ eitr: state.eitr - amount }));
				return true;
			},

			canAfford: (rarity, golden = false) => {
				return get().eitr >= getCraftCost(rarity, golden);
			},

			getDisenchantValue: (rarity) => {
				return getEitrValue(rarity);
			},

			getCraftingCost: (rarity, golden = false) => {
				return getCraftCost(rarity, golden);
			},
		}),
		{
			name: 'ragnarok-crafting',
			partialize: (state) => ({ eitr: state.eitr }),
		}
	)
);
