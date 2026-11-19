import { create } from 'zustand';
import type { ResolvedAttack } from '../core/commands/resolvedAttack';
import type { MatchContext } from '../match/types';

interface AIAttackEvent {
	readonly match: MatchContext | null;
	readonly resolvedAttack: ResolvedAttack;
}

interface AIAttackAnimationState {
	readonly pendingAttacks: readonly AIAttackEvent[];
	readonly currentAttack: AIAttackEvent | null;
	queueResolvedAttacks: (match: MatchContext | null, attacks: readonly ResolvedAttack[]) => void;
	startAnimation: (match: MatchContext | null) => AIAttackEvent | null;
	completeAnimation: (event: AIAttackEvent) => void;
	clearAll: () => void;
}

export const useAIAttackAnimationStore = create<AIAttackAnimationState>((set, get) => ({
	pendingAttacks: [],
	currentAttack: null,

	queueResolvedAttacks: (match, attacks) => {
		if (attacks.length === 0 || match?.opponent.kind === 'peer') return;

		const events = attacks.map(resolvedAttack => ({ match, resolvedAttack }));
		set(state => ({
			pendingAttacks: [...state.pendingAttacks.filter(event => event.match === match), ...events],
		}));
	},

	startAnimation: (match) => {
		const { currentAttack, pendingAttacks } = get();
		if (currentAttack || pendingAttacks.length === 0) return null;

		const [next, ...rest] = pendingAttacks.filter(event => event.match === match);
		set({ currentAttack: next ?? null, pendingAttacks: rest });
		return next ?? null;
	},

	completeAnimation: (event) => {
		if (get().currentAttack === event) set({ currentAttack: null });
	},

	clearAll: () => set({ pendingAttacks: [], currentAttack: null }),
}));
