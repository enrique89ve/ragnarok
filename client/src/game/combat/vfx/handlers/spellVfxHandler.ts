/**
 * spellVfxHandler.ts
 *
 * Bridges card spells, Battlecries, Deathrattles, Buffs, Silence, and Hero
 * Powers from GameEventBus directly into PixiJS v8 2D VFX + local CSS feedback.
 *
 * Strictly enforces Spatial Intentionality:
 * - Targeted damage/debuff: Caster Hero (or Minion for Battlecry) -> curved
 *   elemental projectile -> exact Target Card or Enemy Hero -> impact burst +
 *   recoil + synchronized impact SFX.
 * - AoE damage/freeze: Caster Hero -> rune sigil on affected row -> staggered
 *   70ms fan-out to every minion in that row.
 * - Heal / Buff / Shield: Luminous rising aura on target (ZERO recoil/shake).
 * - Hero Power: Origin is `.portrait-power-badge` -> exact target or caster aura.
 * - Deathrattle: Origin is dying minion -> ghostly shadow-cyan rune burst.
 */

import { GameEventBus } from '@/core/events/GameEventBus';
import type {
	BattlecryTriggeredEvent,
	BuffAppliedEvent,
	DeathrattleTriggeredEvent,
	HeroPowerUsedEvent,
	MinionSummonedEvent,
	SecretPlayedEvent,
	SecretRevealedEvent,
	SilenceAppliedEvent,
	SpellCastEvent,
	WeaponEquippedEvent,
} from '@/core/events/GameEvents';
import {
	ELEMENT_PALETTES,
	resolveElementPalette,
	spawnArcaneVortex,
	spawnChromaticSlash,
	spawnDiamondShards,
	spawnDrainStream,
	spawnEmbers,
	spawnImpactRing,
	spawnMagicTunnel,
	spawnParticleBurst,
	spawnRisingAura,
	spawnRunePulse,
	spawnShieldDome,
	spawnSmokePuff,
	spawnSparkBurst,
	spawnStarburstBloom,
	spawnTranslucentRibbon,
	spawnTravelingGlowRing,
	type ParticleColor,
} from '../../../animations/PixiParticleCanvas';
import { playThorHammerVFX } from '../../../animations/ThorHammerVFX';
import { proceduralAudio } from '../../../audio/proceduralAudio';
import {
	getArenaVfxCombatantTarget,
	getArenaVfxHeroPowerTarget,
	getArenaVfxHeroSurfaceTarget,
	getArenaVfxMinionFieldTarget,
	getElementCenter,
	minionCardCenterPoints,
	type ArenaVfxOwner,
} from '../../arenaVfxTargets';
import { playLocalFx, triggerCardImpactVibration } from '../localFxPrimitives';
import { triggerArenaShake } from '../arenaShake';
import { vfxOrchestrationDirector } from '../vfxOrchestrationDirector';
import { gameEffectCoordinator } from '@/game/effects/core/gameEffectCoordinator';
import { isVisualEventRendererEnabled } from '../emitter';

export type SpellIntentKind =
	| 'hostile-targeted'
	| 'hostile-aoe'
	| 'beneficial'
	| 'beneficial-aoe'
	| 'utility';

export interface SpellVisualClassification {
	readonly intent: SpellIntentKind;
	readonly element: string;
	readonly palette: ParticleColor;
}

const HOSTILE_KEYWORDS = [
	'damage', 'destroy', 'kill', 'freeze', 'debuff', 'silence',
	'cleave', 'curse', 'drain', 'poison', 'sacrifice', 'banish',
];

const AOE_KEYWORDS = ['aoe', 'all', 'board', 'cleave', 'wave', 'nova', 'storm', 'blizzard', 'earthquake'];

const BENEFICIAL_KEYWORDS = [
	'heal', 'buff', 'armor', 'shield', 'divine', 'blessing',
	'restore', 'protect', 'grant', 'enchant', 'double_health',
];

export function inferSpellElement(effectType: string, cardName = ''): string {
	const haystack = `${effectType} ${cardName}`.toLowerCase();
	if (/fire|flame|burn|pyro|inferno|scorch|ember|magma|muspel|lava/.test(haystack)) return 'fire';
	if (/frost|freeze|ice|chill|blizzard|glacial|nifl|snow|winter/.test(haystack)) return 'ice';
	if (/lightning|thunder|bolt|storm|shock|mjolnir|thor|spark|arc/.test(haystack)) return 'lightning';
	if (/shadow|void|curse|death|hel|dark|soul|drain|doom|necrotic|blood/.test(haystack)) return 'shadow';
	if (/heal|nature|emerald|bloom|life|vital|grove|yggdrasil|frey|restore/.test(haystack)) return 'nature';
	if (/divine|holy|light|shield|armor|valkyrie|asgard|bless|sun|gold/.test(haystack)) return 'light';
	if (/rune|arcane|water|sea|tide|frost_rune|mana|peek|scry/.test(haystack)) return 'water';
	return 'water';
}

export function classifySpellIntent(
	effectType: string,
	cardName = '',
	hasTarget = false,
): SpellVisualClassification {
	const lower = `${effectType} ${cardName}`.toLowerCase();
	const isAoe = AOE_KEYWORDS.some(k => lower.includes(k));
	const isBeneficial = BENEFICIAL_KEYWORDS.some(k => lower.includes(k));
	const isHostile = HOSTILE_KEYWORDS.some(k => lower.includes(k));

	let intent: SpellIntentKind;
	if (isBeneficial && !isHostile) {
		intent = isAoe ? 'beneficial-aoe' : 'beneficial';
	} else if (isHostile) {
		intent = isAoe && !hasTarget ? 'hostile-aoe' : 'hostile-targeted';
	} else if (hasTarget) {
		intent = 'hostile-targeted';
	} else {
		intent = 'utility';
	}

	const element = inferSpellElement(effectType, cardName);
	return {
		intent,
		element,
		palette: resolveElementPalette(element),
	};
}

function opposingSide(side: ArenaVfxOwner): ArenaVfxOwner {
	return side === 'player' ? 'opponent' : 'player';
}

function pointForHero(side: ArenaVfxOwner): { x: number; y: number } | null {
	const el = getArenaVfxHeroSurfaceTarget(side);
	return el ? getElementCenter(el, 0.45) : null;
}

function resolveEntityPoint(
	entityId: string | undefined,
	fallbackSide: ArenaVfxOwner,
): { point: { x: number; y: number }; targetType: 'hero' | 'card'; resolvedId: string } | null {
	if (entityId === 'player' || entityId === 'player-hero') {
		const pt = pointForHero('player');
		return pt ? { point: pt, targetType: 'hero', resolvedId: 'player-hero' } : null;
	}
	if (entityId === 'opponent' || entityId === 'opponent-hero') {
		const pt = pointForHero('opponent');
		return pt ? { point: pt, targetType: 'hero', resolvedId: 'opponent-hero' } : null;
	}
	if (entityId) {
		const el = getArenaVfxCombatantTarget(entityId);
		if (el) {
			return { point: getElementCenter(el, 0.5), targetType: 'card', resolvedId: entityId };
		}
	}
	const fallbackHero = pointForHero(fallbackSide);
	return fallbackHero
		? { point: fallbackHero, targetType: 'hero', resolvedId: `${fallbackSide}-hero` }
		: null;
}

function playImpactAudioForElement(element: string, isBeneficial: boolean): void {
	try {
		if (isBeneficial) {
			proceduralAudio.play('heal');
			return;
		}
		if (element === 'fire') proceduralAudio.play('fire_impact');
		else if (element === 'ice') proceduralAudio.play('freeze');
		else proceduralAudio.play('spell_impact');
	} catch {
		// Audio unavailable in headless/test environments
	}
}

function triggerTargetLocalFeedback(
	resolvedId: string,
	targetType: 'hero' | 'card',
	isBeneficial: boolean,
): void {
	const presentationTarget = targetType === 'hero'
		? { type: 'hero' as const, side: resolvedId === 'player-hero' ? 'player' as const : 'opponent' as const }
		: { type: 'card' as const, instanceId: resolvedId };
	playLocalFx(presentationTarget, isBeneficial ? 'shine' : 'impact-normal', 'normal');
	if (!isBeneficial) {
		triggerCardImpactVibration(presentationTarget, 'normal', 'normal');
	}
}

const THOR_HAMMER_PATTERN = /mjolnir|mjölnir|thor(?:'s)?\s*hammer|storm\s*hammer|thunder\s*hammer/i;

function isThorHammerSignature(name: string, effectType = ''): boolean {
	return THOR_HAMMER_PATTERN.test(`${name} ${effectType}`);
}

function handleCardSpellCast(event: SpellCastEvent): void {
	if (!isVisualEventRendererEnabled()) return;

	const caster = event.player;
	const foe = opposingSide(caster);
	const sourcePoint = pointForHero(caster);
	const { intent, element, palette } = classifySpellIntent(
		event.effectType,
		event.cardName,
		Boolean(event.targetId),
	);

	if (sourcePoint) {
		spawnRunePulse(sourcePoint.x, sourcePoint.y, palette, 340, 1.3);
	}

	if (intent === 'hostile-aoe') {
		const targets = minionCardCenterPoints(foe);
		const fieldEl = getArenaVfxMinionFieldTarget(foe);
		const fieldCenter = fieldEl ? getElementCenter(fieldEl, 0.5) : pointForHero(foe);
		if (fieldCenter) {
			spawnArcaneVortex(fieldCenter.x, fieldCenter.y, palette, 580);
			spawnRunePulse(fieldCenter.x, fieldCenter.y, palette, 500, 1.9);
		}
		const strikePoints = targets.length > 0
			? targets.map(t => ({ x: t.x, y: t.y }))
			: (fieldCenter ? [fieldCenter] : []);

		gameEffectCoordinator.scheduleSequence({
			owner: 'spell-vfx',
			lane: 'aoe',
			key: `spell-aoe:${event.id}`,
			priority: 'high',
			delaysMs: strikePoints.map((_, i) => 110 + i * 70),
			run: (index) => {
				const pt = strikePoints[index];
				if (!pt) return;
				if (sourcePoint) {
					spawnTranslucentRibbon(sourcePoint.x, sourcePoint.y, pt.x, pt.y, palette, {
						strands: 2,
						durationMs: 260,
						lingerMs: 380,
					});
					spawnTravelingGlowRing(sourcePoint.x, sourcePoint.y, pt.x, pt.y, palette, 260, () => {
						spawnStarburstBloom(pt.x, pt.y, palette, 1.1, 320);
						spawnDiamondShards(pt.x, pt.y, 10, palette, undefined, `${event.id}:${index}`);
						spawnSparkBurst(pt.x, pt.y, 12, palette, `${event.id}:${index}`);
						spawnParticleBurst(pt.x, pt.y, 14, palette, `${event.id}:${index}`);
						if (index === 0) {
							playImpactAudioForElement(element, false);
							triggerArenaShake('mild');
						}
					});
				} else {
					spawnStarburstBloom(pt.x, pt.y, palette, 1.1, 320);
					spawnImpactRing(pt.x, pt.y, palette, 'luminous');
					spawnParticleBurst(pt.x, pt.y, 14, palette, `${event.id}:${index}`);
				}
			},
		});
		return;
	}

	if (intent === 'beneficial-aoe') {
		const targets = minionCardCenterPoints(caster);
		const points = targets.length > 0
			? targets.map(t => ({ x: t.x, y: t.y }))
			: (sourcePoint ? [sourcePoint] : []);
		gameEffectCoordinator.scheduleSequence({
			owner: 'spell-vfx',
			lane: 'aoe-buff',
			key: `spell-buff-aoe:${event.id}`,
			priority: 'normal',
			delaysMs: points.map((_, i) => i * 65),
			run: (index) => {
				const pt = points[index];
				if (!pt) return;
				if (sourcePoint) {
					spawnTranslucentRibbon(sourcePoint.x, sourcePoint.y, pt.x, pt.y, palette, {
						strands: 2,
						durationMs: 260,
						lingerMs: 360,
					});
				}
				spawnStarburstBloom(pt.x, pt.y, palette, 0.95, 320);
				spawnRisingAura(pt.x, pt.y, 10, palette, `${event.id}:${index}`);
			},
		});
		return;
	}

	if (intent === 'beneficial') {
		const resolved = resolveEntityPoint(event.targetId, caster);
		if (!resolved) return;
		if (sourcePoint && resolved.resolvedId !== `${caster}-hero`) {
			spawnTranslucentRibbon(sourcePoint.x, sourcePoint.y, resolved.point.x, resolved.point.y, palette, {
				strands: 2,
				durationMs: 300,
				lingerMs: 420,
			});
			spawnTravelingGlowRing(sourcePoint.x, sourcePoint.y, resolved.point.x, resolved.point.y, palette, 300, () => {
				spawnStarburstBloom(resolved.point.x, resolved.point.y, palette, 1.1, 340);
				spawnRisingAura(resolved.point.x, resolved.point.y, 14, palette, event.id);
				triggerTargetLocalFeedback(resolved.resolvedId, resolved.targetType, true);
			});
		} else {
			spawnStarburstBloom(resolved.point.x, resolved.point.y, palette, 1.1, 340);
			spawnRisingAura(resolved.point.x, resolved.point.y, 14, palette, event.id);
			triggerTargetLocalFeedback(resolved.resolvedId, resolved.targetType, true);
		}
		return;
	}

	if (intent === 'hostile-targeted') {
		const resolved = resolveEntityPoint(event.targetId, foe);
		if (!resolved) return;
		if (sourcePoint && isThorHammerSignature(event.cardName, event.effectType)) {
			void playThorHammerVFX({
				side: caster,
				mode: 'strike',
				sourcePoint,
				targetPoint: resolved.point,
				targetId: resolved.resolvedId,
				seed: event.id,
				onImpact: () => {
					triggerTargetLocalFeedback(resolved.resolvedId, resolved.targetType, false);
				},
			});
			return;
		}
		if (sourcePoint) {
			const useTunnel = element === 'ice' || element === 'lightning' || element === 'shadow' || element === 'light';
			if (useTunnel) {
				spawnMagicTunnel(sourcePoint.x, sourcePoint.y, resolved.point.x, resolved.point.y, palette, {
					rings: 8,
					durationMs: 310,
				});
			} else {
				spawnTranslucentRibbon(sourcePoint.x, sourcePoint.y, resolved.point.x, resolved.point.y, palette, {
					strands: 3,
					durationMs: 310,
					lingerMs: 440,
				});
			}
			spawnTravelingGlowRing(sourcePoint.x, sourcePoint.y, resolved.point.x, resolved.point.y, palette, 310, () => {
				if (element === 'shadow') {
					spawnArcaneVortex(resolved.point.x, resolved.point.y, palette, 520);
				} else {
					spawnStarburstBloom(resolved.point.x, resolved.point.y, palette, 1.25, 360);
				}
				spawnDiamondShards(resolved.point.x, resolved.point.y, 12, palette, undefined, event.id);
				spawnSparkBurst(resolved.point.x, resolved.point.y, 14, palette, event.id);
				spawnParticleBurst(resolved.point.x, resolved.point.y, 16, palette, event.id);
				spawnEmbers(resolved.point.x, resolved.point.y, 6, palette);
				triggerTargetLocalFeedback(resolved.resolvedId, resolved.targetType, false);
				playImpactAudioForElement(element, false);
			});
		} else {
			spawnStarburstBloom(resolved.point.x, resolved.point.y, palette, 1.2, 340);
			spawnImpactRing(resolved.point.x, resolved.point.y, palette, 'luminous');
			spawnSparkBurst(resolved.point.x, resolved.point.y, 14, palette, event.id);
			playImpactAudioForElement(element, false);
		}
		return;
	}

	// Utility (draw, discover, summon, secret): radiant starburst + rising aura at caster
	if (sourcePoint) {
		spawnStarburstBloom(sourcePoint.x, sourcePoint.y, palette, 1.05, 340);
		spawnRisingAura(sourcePoint.x, sourcePoint.y, 10, palette, event.id);
	}
}

function handleBattlecryTriggered(event: BattlecryTriggeredEvent): void {
	if (!isVisualEventRendererEnabled()) return;

	const caster = event.player;
	const foe = opposingSide(caster);
	const sourceResolved = resolveEntityPoint(event.sourceId, caster);
	if (!sourceResolved) return;

	const { intent, element, palette } = classifySpellIntent(
		event.effectType,
		event.sourceName,
		Boolean(event.targetId),
	);

	// Origin is the minion itself so the player sees the Battlecry radiate from it
	spawnRunePulse(sourceResolved.point.x, sourceResolved.point.y, palette, 400, 1.35);
	spawnStarburstBloom(sourceResolved.point.x, sourceResolved.point.y, palette, 1.15, 340);

	if (event.targetId) {
		const targetResolved = resolveEntityPoint(
			event.targetId,
			intent === 'beneficial' ? caster : foe,
		);
		if (targetResolved) {
			const isBeneficial = intent === 'beneficial' || intent === 'beneficial-aoe';
			spawnTranslucentRibbon(
				sourceResolved.point.x,
				sourceResolved.point.y,
				targetResolved.point.x,
				targetResolved.point.y,
				palette,
				{ strands: 2, durationMs: 290, lingerMs: 400 },
			);
			spawnTravelingGlowRing(
				sourceResolved.point.x,
				sourceResolved.point.y,
				targetResolved.point.x,
				targetResolved.point.y,
				palette,
				290,
				() => {
					if (isBeneficial) {
						spawnStarburstBloom(targetResolved.point.x, targetResolved.point.y, palette, 1.0, 320);
						spawnRisingAura(targetResolved.point.x, targetResolved.point.y, 12, palette, event.id);
					} else {
						spawnDiamondShards(targetResolved.point.x, targetResolved.point.y, 10, palette, undefined, event.id);
						spawnSparkBurst(targetResolved.point.x, targetResolved.point.y, 12, palette, event.id);
						spawnParticleBurst(targetResolved.point.x, targetResolved.point.y, 14, palette, event.id);
						playImpactAudioForElement(element, false);
					}
					triggerTargetLocalFeedback(targetResolved.resolvedId, targetResolved.targetType, isBeneficial);
				},
			);
			return;
		}
	}

	spawnImpactRing(sourceResolved.point.x, sourceResolved.point.y, palette, 'luminous');
	spawnParticleBurst(sourceResolved.point.x, sourceResolved.point.y, 12, palette, event.id);
}

function handleDeathrattleTriggered(event: DeathrattleTriggeredEvent): void {
	if (!isVisualEventRendererEnabled()) return;

	const resolved = resolveEntityPoint(event.sourceId, event.player);
	if (!resolved) return;

	const palette: ParticleColor = {
		primary: '#00f0d8',
		secondary: '#8b5cf6',
		glow: 'rgba(0,240,216,0.58)',
	};
	spawnArcaneVortex(resolved.point.x, resolved.point.y, palette, 560);
	spawnSmokePuff(resolved.point.x, resolved.point.y, 5, palette, event.id);
	spawnParticleBurst(resolved.point.x, resolved.point.y, 14, palette, event.id);
}

function handleBuffApplied(event: BuffAppliedEvent): void {
	if (!isVisualEventRendererEnabled()) return;
	if (!vfxOrchestrationDirector.shouldAllowSecondary()) return;

	const targetEl = getArenaVfxCombatantTarget(event.targetId);
	if (!targetEl) return;
	const pt = getElementCenter(targetEl, 0.5);
	const palette = (event.healthChange ?? 0) > 0 && (event.attackChange ?? 0) <= 0
		? ELEMENT_PALETTES.nature
		: ELEMENT_PALETTES.light;
	spawnStarburstBloom(pt.x, pt.y, palette, 1.05, 340);
	spawnDiamondShards(pt.x, pt.y, 8, palette, { x: 0, y: -1 }, event.id);
	spawnRisingAura(pt.x, pt.y, 10, palette, event.id);
	playLocalFx({ type: 'card', instanceId: event.targetId }, 'shine', 'normal');
}

function handleSilenceApplied(event: SilenceAppliedEvent): void {
	if (!isVisualEventRendererEnabled()) return;

	const targetEl = getArenaVfxCombatantTarget(event.targetId);
	if (!targetEl) return;
	const pt = getElementCenter(targetEl, 0.5);
	const silencePalette: ParticleColor = {
		primary: '#94a3b8',
		secondary: '#38bdf8',
		glow: 'rgba(148,163,184,0.55)',
	};
	spawnArcaneVortex(pt.x, pt.y, silencePalette, 520);
	spawnDrainStream(pt.x, pt.y, 10, silencePalette, 1, event.id);
	playLocalFx({ type: 'card', instanceId: event.targetId }, 'white-flash', 'normal');
}

function handleHeroPowerUsed(event: HeroPowerUsedEvent): void {
	if (!isVisualEventRendererEnabled()) return;

	const caster = event.player;
	const foe = opposingSide(caster);
	const badgeEl = caster === 'player'
		? getArenaVfxHeroPowerTarget()
		: getArenaVfxHeroSurfaceTarget('opponent');
	const sourcePoint = badgeEl ? getElementCenter(badgeEl, 0.5) : pointForHero(caster);
	if (!sourcePoint) return;

	const { intent, element, palette } = classifySpellIntent(
		event.heroPowerName,
		event.heroPowerName,
		Boolean(event.targetId),
	);

	spawnRunePulse(sourcePoint.x, sourcePoint.y, palette, 360, 1.25);
	spawnStarburstBloom(sourcePoint.x, sourcePoint.y, palette, 1.0, 300);

	if (event.targetId) {
		const targetResolved = resolveEntityPoint(
			event.targetId,
			intent === 'beneficial' ? caster : foe,
		);
		if (targetResolved) {
			const isBeneficial = intent === 'beneficial' || intent === 'beneficial-aoe';
			if (!isBeneficial && isThorHammerSignature(event.heroPowerName)) {
				void playThorHammerVFX({
					side: caster,
					mode: 'strike',
					sourcePoint,
					targetPoint: targetResolved.point,
					targetId: targetResolved.resolvedId,
					seed: event.id,
					onImpact: () => {
						triggerTargetLocalFeedback(targetResolved.resolvedId, targetResolved.targetType, false);
					},
				});
				return;
			}
			if (isBeneficial) {
				spawnTranslucentRibbon(
					sourcePoint.x,
					sourcePoint.y,
					targetResolved.point.x,
					targetResolved.point.y,
					palette,
					{ strands: 3, durationMs: 300, lingerMs: 420 },
				);
			} else {
				spawnMagicTunnel(
					sourcePoint.x,
					sourcePoint.y,
					targetResolved.point.x,
					targetResolved.point.y,
					palette,
					{ rings: 8, durationMs: 300 },
				);
			}
			spawnTravelingGlowRing(
				sourcePoint.x,
				sourcePoint.y,
				targetResolved.point.x,
				targetResolved.point.y,
				palette,
				300,
				() => {
					if (isBeneficial) {
						spawnShieldDome(targetResolved.point.x, targetResolved.point.y);
						spawnRisingAura(targetResolved.point.x, targetResolved.point.y, 12, palette, event.id);
					} else {
						const dx = targetResolved.point.x - sourcePoint.x;
						const dy = targetResolved.point.y - sourcePoint.y;
						const len = Math.max(1, Math.hypot(dx, dy));
						spawnChromaticSlash(
							targetResolved.point.x,
							targetResolved.point.y,
							{ x: dx / len, y: dy / len },
							palette,
							1.1,
						);
						spawnStarburstBloom(targetResolved.point.x, targetResolved.point.y, palette, 1.2, 340);
						spawnDiamondShards(targetResolved.point.x, targetResolved.point.y, 10, palette, undefined, event.id);
						spawnSparkBurst(targetResolved.point.x, targetResolved.point.y, 14, palette, event.id);
						spawnParticleBurst(targetResolved.point.x, targetResolved.point.y, 16, palette, event.id);
						playImpactAudioForElement(element, false);
					}
					triggerTargetLocalFeedback(targetResolved.resolvedId, targetResolved.targetType, isBeneficial);
				},
			);
			return;
		}
	}

	spawnRisingAura(sourcePoint.x, sourcePoint.y, 12, palette, event.id);
}

function handleMinionSummoned(event: MinionSummonedEvent): void {
	if (!isVisualEventRendererEnabled()) return;
	if (!vfxOrchestrationDirector.shouldAllowSecondary()) return;

	const caster = event.player;
	const sourcePoint = pointForHero(caster);
	const element = inferSpellElement(event.source, event.cardName);
	const palette = resolveElementPalette(element);
	// Defer one microtask/frame so the newly summoned minion's DOM slot is mounted
	gameEffectCoordinator.schedule({
		owner: 'spell-vfx',
		lane: 'summon',
		key: `summon:${event.instanceId}`,
		priority: 'normal',
		delayMs: 32,
		run: () => {
			const targetEl = getArenaVfxCombatantTarget(event.instanceId)
				?? getArenaVfxMinionFieldTarget(caster);
			if (!targetEl) return;
			const pt = getElementCenter(targetEl, 0.5);
			if (sourcePoint) {
				spawnTranslucentRibbon(sourcePoint.x, sourcePoint.y, pt.x, pt.y, palette, {
					strands: 2,
					durationMs: 260,
					lingerMs: 340,
					arcFactor: 0.16,
				});
			}
			spawnRunePulse(pt.x, pt.y, palette, 380, 1.25);
			spawnStarburstBloom(pt.x, pt.y, palette, 0.95, 320);
			spawnDiamondShards(pt.x, pt.y, 7, palette, { x: 0, y: -1 }, event.id);
		},
	});
}

function handleWeaponEquipped(event: WeaponEquippedEvent): void {
	if (!isVisualEventRendererEnabled()) return;
	const pt = pointForHero(event.player);
	if (!pt) return;
	const palette = ELEMENT_PALETTES.light;
	spawnChromaticSlash(pt.x, pt.y, { x: 1, y: -0.6 }, palette, 1.25);
	spawnStarburstBloom(pt.x, pt.y, palette, 1.2, 360);
	spawnDiamondShards(pt.x, pt.y, 10, palette, undefined, event.id);
}

function handleSecretEvent(event: SecretPlayedEvent | SecretRevealedEvent): void {
	if (!isVisualEventRendererEnabled()) return;
	const pt = pointForHero(event.player);
	if (!pt) return;
	const secretPalette: ParticleColor = {
		primary: '#38bdf8',
		secondary: '#e879f9',
		glow: 'rgba(56,189,248,0.65)',
	};
	spawnShieldDome(pt.x, pt.y, secretPalette, 520);
	spawnStarburstBloom(pt.x, pt.y, secretPalette, event.type === 'SECRET_REVEALED' ? 1.45 : 1.0, 380);
}

export function registerSpellVfxHandler(): () => void {
	const unsubs = [
		GameEventBus.subscribePresentation('SPELL_CAST', handleCardSpellCast),
		GameEventBus.subscribePresentation('BATTLECRY_TRIGGERED', handleBattlecryTriggered),
		GameEventBus.subscribePresentation('DEATHRATTLE_TRIGGERED', handleDeathrattleTriggered),
		GameEventBus.subscribePresentation('BUFF_APPLIED', handleBuffApplied),
		GameEventBus.subscribePresentation('SILENCE_APPLIED', handleSilenceApplied),
		GameEventBus.subscribePresentation('HERO_POWER_USED', handleHeroPowerUsed),
		GameEventBus.subscribePresentation('MINION_SUMMONED', handleMinionSummoned),
		GameEventBus.subscribePresentation('WEAPON_EQUIPPED', handleWeaponEquipped),
		GameEventBus.subscribePresentation('SECRET_PLAYED', handleSecretEvent),
		GameEventBus.subscribePresentation('SECRET_REVEALED', handleSecretEvent),
	];

	return () => {
		gameEffectCoordinator.cancelOwner('spell-vfx');
		for (const unsub of unsubs) unsub();
	};
}
