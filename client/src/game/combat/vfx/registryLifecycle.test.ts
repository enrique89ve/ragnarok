import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CombatAction, CombatPhase } from '../../types/PokerCombatTypes';
import { useAnimationOrchestrator } from '../../animations/UnifiedAnimationOrchestrator';
import {
	cancelAllActiveVisualEffects,
	getActiveVisualEffectHandles,
	getRegisteredVisualEffectTypes,
	registerVisualEffect,
	registerVisualEffectDebugLogger,
	resetVisualEffectRegistry,
	type EffectHandle,
} from './registry';
import { cancelAllVisualEffects, startPokerVfxLifecycle } from './lifecycle';
import { emitBettingAction, emitSpellCast } from './events';
import { setVisualEventRendererEnabled } from './emitter';

function makeProbeHandle(onComplete = false): EffectHandle {
	return { cancel: vi.fn(), onComplete: onComplete ? Promise.resolve() : undefined };
}

beforeEach(() => {
	setVisualEventRendererEnabled(true);
	resetVisualEffectRegistry();
	useAnimationOrchestrator.getState().cancelAll();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('visual effect registry', () => {
	it('dispatches events to registered handlers and tracks returned handles', async () => {
		const handle = makeProbeHandle(true);
		const seen: string[] = [];
		registerVisualEffect('bettingAction', event => {
			seen.push(`${event.side}:${event.action}`);
			return handle;
		});

		emitBettingAction({ phase: CombatPhase.PRE_FLOP, action: CombatAction.ATTACK, side: 'player' });
		await Promise.resolve();

		expect(seen).toEqual(['player:attack']);
		expect(getActiveVisualEffectHandles()).toEqual([handle]);

		await Promise.resolve();
		await Promise.resolve();
		expect(getActiveVisualEffectHandles()).toEqual([]);
	});

	it('tracks handles without onComplete until canceled', async () => {
		const handle = makeProbeHandle(false);
		registerVisualEffect('spellCast', () => handle);

		emitSpellCast({ effectType: 'bluff_rune', side: 'player' });
		await Promise.resolve();
		expect(getActiveVisualEffectHandles()).toEqual([handle]);

		cancelAllActiveVisualEffects();
		expect(handle.cancel).toHaveBeenCalledTimes(1);
		expect(getActiveVisualEffectHandles()).toEqual([]);
	});

	it('ignores null handles without tracking', async () => {
		registerVisualEffect('bettingAction', () => null);

		emitBettingAction({ phase: CombatPhase.FAITH, action: CombatAction.DEFEND, side: 'opponent' });
		await Promise.resolve();
		expect(getActiveVisualEffectHandles()).toEqual([]);
	});

	it('warns once per unhandled event type instead of silently dropping', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		registerVisualEffect('bettingAction', () => null);

		emitSpellCast({ effectType: 'bluff_rune', side: 'player' });
		emitSpellCast({ effectType: 'bluff_rune', side: 'player' });
		await Promise.resolve();

		const registryWarns = warnSpy.mock.calls.filter(args => String(args[0]).includes('[VisualEffectRegistry]'));
		expect(registryWarns).toHaveLength(1);
	});

	it('supports unregistering a handler', async () => {
		const seen: string[] = [];
		const unregister = registerVisualEffect('bettingAction', event => {
			seen.push(event.side);
			return null;
		});

		unregister();
		emitBettingAction({ phase: CombatPhase.FAITH, action: CombatAction.ENGAGE, side: 'player' });
		await Promise.resolve();

		expect(seen).toEqual([]);
		expect(getRegisteredVisualEffectTypes()).toEqual([]);
	});

	it('warns when a handler replaces an existing one', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		registerVisualEffect('bettingAction', () => null);
		registerVisualEffect('bettingAction', () => null);

		const replaceWarns = warnSpy.mock.calls.filter(args => String(args[0]).includes('Replacing existing handler'));
		expect(replaceWarns).toHaveLength(1);
	});

	it('registers a debug logger for every event type (test pipeline probe)', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const unregister = registerVisualEffectDebugLogger();

		emitBettingAction({ phase: CombatPhase.PRE_FLOP, action: CombatAction.ATTACK, side: 'player' });
		emitSpellCast({ effectType: 'void_stare', side: 'opponent' });
		await Promise.resolve();

		const registryLogs = logSpy.mock.calls.filter(args => String(args[0]).includes('[VisualEffectRegistry:test]'));
		expect(registryLogs).toHaveLength(2);
		expect(getRegisteredVisualEffectTypes()).toHaveLength(12);
		unregister();
	});
});

describe('visual effect lifecycle', () => {
	it('cancelAllVisualEffects cancels registry handles and poker orchestrator effects', async () => {
		const handle = makeProbeHandle(false);
		registerVisualEffect('bettingAction', () => handle);
		emitBettingAction({ phase: CombatPhase.PRE_FLOP, action: CombatAction.ATTACK, side: 'player' });
		await Promise.resolve();

		const orchestrator = useAnimationOrchestrator.getState();
		orchestrator.scheduleEffect({
			category: 'spell',
			priority: 'normal',
			duration: 1000,
			phase: CombatPhase.FAITH,
			data: {},
		});
		orchestrator.scheduleEffect({
			category: 'announcement',
			priority: 'high',
			duration: 1000,
			data: {},
		});

		cancelAllVisualEffects();

		expect(handle.cancel).toHaveBeenCalledTimes(1);
		expect(getActiveVisualEffectHandles()).toEqual([]);
		expect(useAnimationOrchestrator.getState().getActiveEffects()).toEqual([]);
	});

	it('startPokerVfxLifecycle is a no-op outside the browser', () => {
		expect(() => startPokerVfxLifecycle()).not.toThrow();
	});
});
