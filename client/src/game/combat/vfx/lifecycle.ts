import {
	cancelAnimationsByCategory,
	cancelAnimationsByPhase,
	type AnimationCategory,
} from '../../animations/UnifiedAnimationOrchestrator';
import { CombatPhase } from '../../types/PokerCombatTypes';
import { killAllPokerVFX, startPokerOrphanSweep, stopPokerOrphanSweep } from '../animations/PokerDramaVFX';
import { cancelAllActiveVisualEffects } from './registry';

const POKER_VFX_ORCHESTRATOR_CATEGORIES: readonly AnimationCategory[] = [
	'announcement',
	'particle',
	'transition',
];

function hasDom(): boolean {
	return typeof document !== 'undefined';
}

function cancelPokerOrchestratedEffects(): void {
	for (const phase of Object.values(CombatPhase)) {
		cancelAnimationsByPhase(phase);
	}
	for (const category of POKER_VFX_ORCHESTRATOR_CATEGORIES) {
		cancelAnimationsByCategory(category);
	}
}

export function cancelAllVisualEffects(): void {
	cancelAllActiveVisualEffects();
	cancelPokerOrchestratedEffects();
	if (!hasDom()) return;
	killAllPokerVFX();
	stopPokerOrphanSweep();
}

export function startPokerVfxLifecycle(): void {
	if (!hasDom()) return;
	startPokerOrphanSweep();
}
