import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEventBus } from '@/core/events/GameEventBus';
import { ARENA_VFX_TARGETS, bindArenaVfxQueryRoot, type QueryRoot } from '../../arenaVfxTargets';
import { setVisualEventRendererEnabled } from '../emitter';
import {
	classifySpellIntent,
	inferSpellElement,
	registerSpellVfxHandler,
} from './spellVfxHandler';

const spawnTravelingGlowRing = vi.fn();
const spawnTranslucentRibbon = vi.fn();
const spawnMagicTunnel = vi.fn();
const spawnStarburstBloom = vi.fn();
const spawnChromaticSlash = vi.fn();
const spawnDiamondShards = vi.fn();
const spawnShieldDome = vi.fn();
const spawnArcaneVortex = vi.fn();
const spawnRisingAura = vi.fn();
const spawnRunePulse = vi.fn();
const spawnSparkBurst = vi.fn();
const spawnParticleBurst = vi.fn();
const spawnImpactRing = vi.fn();
const triggerArenaShake = vi.fn();

vi.mock('../../../animations/PixiParticleCanvas', () => ({
	ELEMENT_PALETTES: {
		fire: { primary: '#ff5500', secondary: '#ffd700', glow: 'rgba(255,85,0,0.6)' },
		ice: { primary: '#00ccff', secondary: '#b3e5fc', glow: 'rgba(0,204,255,0.6)' },
		lightning: { primary: '#ffd700', secondary: '#fff9c4', glow: 'rgba(255,215,0,0.6)' },
		shadow: { primary: '#7b1fa2', secondary: '#ce93d8', glow: 'rgba(123,31,162,0.6)' },
		nature: { primary: '#4caf50', secondary: '#a5d6a7', glow: 'rgba(76,175,80,0.6)' },
		water: { primary: '#38bdf8', secondary: '#bae6fd', glow: 'rgba(56,189,248,0.6)' },
		light: { primary: '#f5c542', secondary: '#fef9c3', glow: 'rgba(245,197,66,0.6)' },
		neutral: { primary: '#cd7f32', secondary: '#f0e68c', glow: 'rgba(205,127,50,0.6)' },
	},
	resolveElementPalette: (el?: string) => ({
		primary: el === 'fire' ? '#ff5500' : el === 'nature' ? '#4caf50' : '#38bdf8',
		secondary: '#ffffff',
		glow: 'rgba(255,255,255,0.5)',
	}),
	spawnTravelingGlowRing: (...args: unknown[]) => spawnTravelingGlowRing(...args),
	spawnTranslucentRibbon: (...args: unknown[]) => spawnTranslucentRibbon(...args),
	spawnMagicTunnel: (...args: unknown[]) => spawnMagicTunnel(...args),
	spawnStarburstBloom: (...args: unknown[]) => spawnStarburstBloom(...args),
	spawnChromaticSlash: (...args: unknown[]) => spawnChromaticSlash(...args),
	spawnDiamondShards: (...args: unknown[]) => spawnDiamondShards(...args),
	spawnShieldDome: (...args: unknown[]) => spawnShieldDome(...args),
	spawnArcaneVortex: (...args: unknown[]) => spawnArcaneVortex(...args),
	spawnRisingAura: (...args: unknown[]) => spawnRisingAura(...args),
	spawnRunePulse: (...args: unknown[]) => spawnRunePulse(...args),
	spawnSparkBurst: (...args: unknown[]) => spawnSparkBurst(...args),
	spawnParticleBurst: (...args: unknown[]) => spawnParticleBurst(...args),
	spawnImpactRing: (...args: unknown[]) => spawnImpactRing(...args),
	spawnDrainStream: vi.fn(),
	spawnEmbers: vi.fn(),
	spawnSmokePuff: vi.fn(),
}));

vi.mock('../arenaShake', () => ({
	triggerArenaShake: (...args: unknown[]) => triggerArenaShake(...args),
}));

vi.mock('../../../animations/ThorHammerVFX', () => ({
	playThorHammerVFX: vi.fn(),
}));

vi.mock('../localFxPrimitives', () => ({
	playLocalFx: vi.fn(),
	triggerCardImpactVibration: vi.fn(),
}));

vi.mock('../../../audio/proceduralAudio', () => ({
	proceduralAudio: { play: vi.fn() },
}));

function makeRectEl(x: number, y: number, attrs: Record<string, string> = {}): HTMLElement {
	return {
		getBoundingClientRect: () => ({ left: x - 20, top: y - 20, width: 40, height: 40 }),
		getAttribute: (name: string) => attrs[name] ?? null,
		querySelector: () => null,
		matches: (sel: string) => sel.includes('minion') && Boolean(attrs['data-instance-id']),
		closest: () => null,
	} as unknown as HTMLElement;
}

describe('spellVfxHandler — spatial intentionality', () => {
	let unregister: () => void;

	beforeEach(() => {
		setVisualEventRendererEnabled(true);
		spawnTravelingGlowRing.mockReset();
		spawnTranslucentRibbon.mockReset();
		spawnMagicTunnel.mockReset();
		spawnStarburstBloom.mockReset();
		spawnChromaticSlash.mockReset();
		spawnDiamondShards.mockReset();
		spawnShieldDome.mockReset();
		spawnArcaneVortex.mockReset();
		spawnRisingAura.mockReset();
		spawnRunePulse.mockReset();
		spawnSparkBurst.mockReset();
		spawnParticleBurst.mockReset();
		spawnImpactRing.mockReset();
		triggerArenaShake.mockReset();

		const playerHero = makeRectEl(200, 900);
		const opponentHero = makeRectEl(200, 140);
		const heroPowerBadge = makeRectEl(240, 860);
		const enemyMinion = makeRectEl(800, 320, { 'data-instance-id': 'enemy-m1' });
		const friendlyMinion = makeRectEl(760, 720, { 'data-instance-id': 'ally-m1' });

		const root: QueryRoot = {
			querySelector: (selector: string) => {
				if (selector.includes(ARENA_VFX_TARGETS.playerHero)) return playerHero;
				if (selector.includes(ARENA_VFX_TARGETS.opponentHero)) return opponentHero;
				if (selector.includes(ARENA_VFX_TARGETS.heroPowerBadge)) return heroPowerBadge;
				return null;
			},
			querySelectorAll: (selector: string) => {
				if (selector.includes('data-instance-id')) {
					return [enemyMinion, friendlyMinion] as unknown as ReturnType<QueryRoot['querySelectorAll']>;
				}
				return [] as unknown as ReturnType<QueryRoot['querySelectorAll']>;
			},
		};
		bindArenaVfxQueryRoot(root);
		unregister = registerSpellVfxHandler();
	});

	afterEach(() => {
		unregister?.();
		bindArenaVfxQueryRoot(null);
	});

	it('classifies elements and beneficial vs hostile intent accurately', () => {
		expect(inferSpellElement('damage', 'Muspel Flame Bolt')).toBe('fire');
		expect(inferSpellElement('freeze', 'Frost Nova')).toBe('ice');
		expect(inferSpellElement('heal', 'Yggdrasil Bloom')).toBe('nature');

		expect(classifySpellIntent('damage', 'Fireball', true).intent).toBe('hostile-targeted');
		expect(classifySpellIntent('aoe_damage', 'Blizzard', false).intent).toBe('hostile-aoe');
		expect(classifySpellIntent('heal', 'Blessing', true).intent).toBe('beneficial');
	});

	it('aims targeted hostile spells from caster hero to exact target minion', async () => {
		GameEventBus.emitSpellCast({
			player: 'player',
			cardId: '101',
			cardName: 'Muspel Fireball',
			targetId: 'enemy-m1',
			effectType: 'damage',
		});
		await Promise.resolve();

		expect(spawnRunePulse).toHaveBeenCalledWith(200, 898, expect.objectContaining({ primary: '#ff5500' }), 340, 1.3);
		expect(spawnTranslucentRibbon).toHaveBeenCalledWith(
			200,
			898,
			800,
			320,
			expect.objectContaining({ primary: '#ff5500' }),
			expect.objectContaining({ strands: 3 }),
		);
		expect(spawnTravelingGlowRing).toHaveBeenCalledWith(
			200,
			898,
			800,
			320,
			expect.objectContaining({ primary: '#ff5500' }),
			310,
			expect.any(Function),
		);
	});

	it('routes beneficial heal spells with rising aura and zero camera shake', async () => {
		GameEventBus.emitSpellCast({
			player: 'player',
			cardId: '202',
			cardName: 'Yggdrasil Heal',
			targetId: 'player-hero',
			effectType: 'heal',
		});
		await Promise.resolve();

		expect(spawnRisingAura).toHaveBeenCalledWith(
			200,
			898,
			14,
			expect.objectContaining({ primary: '#4caf50' }),
			expect.any(String),
		);
		expect(triggerArenaShake).not.toHaveBeenCalled();
	});

	it('originates Battlecry from the summoned minion itself toward its target', async () => {
		GameEventBus.emit({
			id: 'bc-1',
			timestamp: Date.now(),
			turn: 1,
			type: 'BATTLECRY_TRIGGERED',
			player: 'player',
			sourceId: 'ally-m1',
			sourceName: 'Fire Imp',
			effectType: 'damage',
			targetId: 'enemy-m1',
			value: 2,
		});
		await Promise.resolve();

		expect(spawnRunePulse).toHaveBeenCalledWith(760, 720, expect.anything(), 400, 1.35);
		expect(spawnTravelingGlowRing).toHaveBeenCalledWith(
			760,
			720,
			800,
			320,
			expect.anything(),
			290,
			expect.any(Function),
		);
	});

	it('originates Hero Power from the portrait-power-badge toward its target', async () => {
		GameEventBus.emit({
			id: 'hp-1',
			timestamp: Date.now(),
			turn: 1,
			type: 'HERO_POWER_USED',
			player: 'player',
			heroPowerName: 'Scorching Burst',
			targetId: 'enemy-m1',
			cost: 2,
		});
		await Promise.resolve();

		expect(spawnRunePulse).toHaveBeenCalledWith(240, 860, expect.objectContaining({ primary: '#ff5500' }), 360, 1.25);
		expect(spawnMagicTunnel).toHaveBeenCalledWith(
			240,
			860,
			800,
			320,
			expect.objectContaining({ primary: '#ff5500' }),
			expect.objectContaining({ rings: 8 }),
		);
		expect(spawnTravelingGlowRing).toHaveBeenCalledWith(
			240,
			860,
			800,
			320,
			expect.objectContaining({ primary: '#ff5500' }),
			300,
			expect.any(Function),
		);
	});

	it('triggers chromatic slash + starburst on weapon equip and shield dome on secret reveal', async () => {
		GameEventBus.emit({
			id: 'wp-1',
			timestamp: Date.now(),
			turn: 1,
			type: 'WEAPON_EQUIPPED',
			player: 'player',
			cardId: 'w-1',
			cardName: 'Mjolnir',
			attack: 4,
			durability: 2,
		});
		await Promise.resolve();
		expect(spawnChromaticSlash).toHaveBeenCalled();
		expect(spawnStarburstBloom).toHaveBeenCalled();

		GameEventBus.emit({
			id: 'sec-1',
			timestamp: Date.now(),
			turn: 1,
			type: 'SECRET_REVEALED',
			player: 'player',
			cardId: 's-1',
			cardName: 'Rune Ward',
			triggeredBy: 'attack',
		});
		await Promise.resolve();
		expect(spawnShieldDome).toHaveBeenCalled();
	});
});
