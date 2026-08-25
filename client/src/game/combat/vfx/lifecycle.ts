import {
	cancelAnimationsByCategory,
	cancelAnimationsByPhase,
	type AnimationCategory,
} from '../../animations/UnifiedAnimationOrchestrator';
import { CombatPhase } from '../../types/PokerCombatTypes';
import { killAllPokerVFX, startPokerOrphanSweep, stopPokerOrphanSweep } from '../animations/PokerDramaVFX';
import { cancelAllActiveVisualEffects } from './registry';
import { gameEffectCoordinator } from '@/game/effects/core/gameEffectCoordinator';
import { gameEffectMediator } from '@/game/effects/core/gameEffectMediator';
import { startGameEffectBrowserRuntime } from '@/game/effects/core/gameEffectBrowserRuntime';

const POKER_VFX_ORCHESTRATOR_CATEGORIES: readonly AnimationCategory[] = [
	'announcement',
	'particle',
	'transition',
];

function hasDom(): boolean {
	return typeof document !== 'undefined';
}

let stopBrowserEffectRuntime: (() => void) | null = null;

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
	gameEffectCoordinator.cancelOwner('poker');
	gameEffectCoordinator.cancelOwner('animation-overlay');
	gameEffectCoordinator.cancelOwner('feedback');
	gameEffectCoordinator.cancelOwner('visual-impact');
	gameEffectCoordinator.cancelOwner('poker-renderer');
	gameEffectMediator.cancelAll();
	cancelPokerOrchestratedEffects();
	if (!hasDom()) return;
	killAllPokerVFX();
	stopPokerOrphanSweep();
	stopBrowserEffectRuntime?.();
	stopBrowserEffectRuntime = null;
}

export function startPokerVfxLifecycle(): void {
	if (!hasDom()) return;
	stopBrowserEffectRuntime?.();
	stopBrowserEffectRuntime = startGameEffectBrowserRuntime();
	startPokerOrphanSweep();
}
