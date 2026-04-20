/**
 * useBossPhases.ts
 *
 * Mid-combat escalation runner. Watches the opponent hero's HP during
 * combat and fires the next campaign mission BossPhase whenever HP
 * crosses below the phase's `hpPercent` threshold.
 *
 * Each phase fires AT MOST ONCE per combat. Phases are sorted in
 * descending order so a phase at 75% always fires before a phase at
 * 50% (regardless of authoring order).
 *
 * Phase effects available:
 *   - heal_self N        — opponent restores N HP (negative-damage reuse)
 *   - damage_player N    — player hero takes N immediate damage
 *   - add_armor N        — opponent gains N armor
 *   - enrage N           — opponent gains (N/2) armor and deals N damage
 *                           to the player. Best-effort mapping to the
 *                           poker combat system, which doesn't have a
 *                           mana-cap mutation primitive. Thematically:
 *                           "the boss roars, hardens, and lashes back."
 *   - buff_attack N      — DEFERRED. Requires battlefield mutation.
 *                           Currently maps to damage_player (N+1) so
 *                           missions still escalate when authored.
 *   - summon_minion id   — DEFERRED. Requires card system plumbing.
 *                           Currently maps to damage_player 6 so
 *                           authored phases still hit.
 *
 * Outputs (state setters from caller):
 *   - setQuipText: drives the BossQuipBubble overlay
 *   - setQuipKey: forces re-trigger if same line repeats
 *   - setFlash: drives a screen-flash overlay (red/gold/blue/etc.)
 */

import { useEffect, useRef } from 'react';
import { useCampaignStore, getMission } from '../../campaign';
import type { BossPhase, BossPhaseFlash } from '../../campaign/campaignTypes';
import { usePokerCombatAdapter } from '../../hooks/usePokerCombatAdapter';
import { debug } from '../../config/debugConfig';

interface UseBossPhasesParams {
	opponentCurrentHP: number;
	opponentMaxHP: number;
	setQuipText: (text: string | null) => void;
	setQuipKey: (updater: (k: number) => number) => void;
	setFlash: (flash: BossPhaseFlash | null) => void;
}

export function useBossPhases({
	opponentCurrentHP,
	opponentMaxHP,
	setQuipText,
	setQuipKey,
	setFlash,
}: UseBossPhasesParams): void {
	const currentMissionId = useCampaignStore(s => s.currentMission);
	const { applyDirectDamage, addOpponentArmor } = usePokerCombatAdapter();

	// Stable ref to phases so they can be re-sorted once per mission
	// without re-running the watch effect every render.
	const phasesRef = useRef<BossPhase[]>([]);
	const firedRef = useRef<Set<number>>(new Set());

	// Load + sort phases when the mission changes.
	useEffect(() => {
		firedRef.current = new Set();
		phasesRef.current = [];
		if (!currentMissionId) return;
		const found = getMission(currentMissionId);
		if (!found?.mission?.bossPhases || found.mission.bossPhases.length === 0) return;
		// Sort descending so 75% fires before 50% fires before 25%.
		phasesRef.current = [...found.mission.bossPhases].sort(
			(a, b) => b.hpPercent - a.hpPercent
		);
		debug.combat?.(
			`[BossPhases] Loaded ${phasesRef.current.length} phases for mission ${currentMissionId}`
		);
	}, [currentMissionId]);

	// Watch opponent HP and fire phases when crossed.
	useEffect(() => {
		if (phasesRef.current.length === 0) return;
		if (opponentMaxHP <= 0) return;
		const hpPct = (opponentCurrentHP / opponentMaxHP) * 100;
		// Fire all phases the HP has crossed since the last update.
		// Iterate in sorted (descending) order so 75 fires before 50 etc.
		for (let i = 0; i < phasesRef.current.length; i++) {
			const phase = phasesRef.current[i];
			if (firedRef.current.has(i)) continue;
			if (hpPct > phase.hpPercent) continue;
			firedRef.current.add(i);
			runPhase(phase, applyDirectDamage, addOpponentArmor, setQuipText, setQuipKey, setFlash);
		}
	}, [opponentCurrentHP, opponentMaxHP, applyDirectDamage, addOpponentArmor, setQuipText, setQuipKey, setFlash]);
}

/*
  Runs a single phase: shows the quip, flashes the screen, applies the
  effect. Pulled out as a free function to keep the hook body small and
  to make unit-testing easier later.

  All 6 effect types map to working mutations:
    heal_self → applyDirectDamage(opponent, -N)  exact
    damage_player → applyDirectDamage(player, N)  exact
    add_armor → addOpponentArmor(N)               exact
    enrage   → addOpponentArmor(N) + applyDirectDamage(player, N)  composed
    buff_attack → applyDirectDamage(player, N+1) best-effort proxy
    summon_minion → applyDirectDamage(player, 6) best-effort proxy

  The two "proxies" exist so authored boss phases never become silent
  no-ops. They preserve the spirit of the effect (escalation = pain on
  the player) without requiring battlefield/card-system plumbing the
  poker combat doesn't have. When that plumbing exists later, swap the
  proxy lines for real implementations.
*/
function runPhase(
	phase: BossPhase,
	applyDirectDamage: (target: 'player' | 'opponent', damage: number, source?: string) => void,
	addOpponentArmor: (amount: number) => void,
	setQuipText: (text: string | null) => void,
	setQuipKey: (updater: (k: number) => number) => void,
	setFlash: (flash: BossPhaseFlash | null) => void,
): void {
	debug.combat?.(`[BossPhases] Phase fire: ${phase.description}`);

	if (phase.quip) {
		setQuipText(phase.quip);
		setQuipKey(k => k + 1);
	}
	if (phase.flash) {
		setFlash(phase.flash);
		// Auto-clear after 700ms so the next phase can fire its own flash.
		setTimeout(() => setFlash(null), 700);
	}
	if (phase.effect) {
		switch (phase.effect.type) {
			case 'heal_self':
				// Negative damage = heal via the existing clamp path.
				applyDirectDamage('opponent', -phase.effect.value, `${phase.description} (heal)`);
				break;
			case 'damage_player':
				applyDirectDamage('player', phase.effect.value, phase.description);
				break;
			case 'add_armor':
				addOpponentArmor(phase.effect.value);
				debug.combat?.(`[BossPhases] Opponent gains ${phase.effect.value} armor`);
				break;
			case 'enrage':
				// Composed: hardens (armor) and lashes back (damage).
				// "The boss's wounds turn to fury" — half-armor + full counter-strike.
				addOpponentArmor(Math.floor(phase.effect.value / 2));
				applyDirectDamage('player', phase.effect.value, `${phase.description} (enrage strike)`);
				break;
			case 'buff_attack':
				// Proxy: scaled damage to player. Replace with battlefield buff
				// when minion mutations are plumbed through.
				applyDirectDamage('player', phase.effect.value + 1, `${phase.description} (buff proxy)`);
				debug.warn?.(`[BossPhases] buff_attack proxied to ${phase.effect.value + 1} damage`);
				break;
			case 'summon_minion':
				// Proxy: minion would have dealt ~6 damage. Replace when card
				// system supports mid-combat summons.
				applyDirectDamage('player', 6, `${phase.description} (summon proxy)`);
				debug.warn?.(`[BossPhases] summon_minion ${phase.effect.cardId} proxied to 6 damage`);
				break;
		}
	}
}
