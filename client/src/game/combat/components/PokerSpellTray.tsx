/**
 * <PokerSpellTray> — Family 2 (poker-spell) in-arena surface.
 *
 * Renders the player's `pendingPokerSpells` queue as small CardFrame
 * instances with `cardFamily="poker-spell"` so indigo chrome applies.
 * Cast glow lives on CardFrame; scale punch lives on the slot motion host.
 * The opponent
 * tray mirrors the same queue today (the poker-spell state is shared
 * at the slice level — the queue is part of the active poker decision
 * window. When opponent-only spell tracking lands, split the
 * selector.
 *
 * Empty: render nothing. The tray is a queue, not a permanent label.
 *
 * Selector: `usePokerSpells().pendingSpells` — the live Zustand slice
 * state. Re-renders are stable as long as the slice doesn't allocate
 * a new array (it doesn't; it spreads in `queuePokerSpell`).
 */

import React, { useMemo } from 'react';
import { CardFrame } from '../../components/card';
import { usePokerSpells } from '../../hooks/usePokerSpells';
import type { PokerSpellCard } from '../../types/CardTypes';
import { ARENA_VFX_TARGETS, arenaVfxTargetProps } from '../arenaVfxTargets';
import '../styles/poker-spell-tray.css';

const SPELL_LIMIT = 4;

export interface PokerSpellTrayProps {
	readonly caster: 'player' | 'opponent';
}

export const PokerSpellTray: React.FC<PokerSpellTrayProps> = ({ caster }) => {
	const { pendingSpells } = usePokerSpells();

	const visible = useMemo(
		() => (pendingSpells || []).slice(0, SPELL_LIMIT),
		[pendingSpells],
	);

	const className = `poker-spell-tray ${caster === 'opponent' ? 'poker-spell-tray--opponent' : ''}`;

	if (visible.length === 0) {
		return null;
	}

	return (
		<div className={className} role="region" aria-label={`${caster} poker spell tray`}>
			{visible.map((spell: PokerSpellCard) => (
				<div key={spell.id} className="poker-spell-tray__slot" data-card-motion="">
					<CardFrame
						shape="tile"
						size="small"
						rarity={spell.rarity}
						cardFamily="poker-spell"
						cardKind="poker_spell"
						isPlayable={false}
						{...arenaVfxTargetProps(ARENA_VFX_TARGETS.spellTrayCard)}
					>
						<div
							style={{
								position: 'absolute',
								inset: 0,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontFamily: 'Cinzel, serif',
								fontSize: '0.65rem',
								color: '#a78bfa',
								textAlign: 'center',
								padding: 4,
								pointerEvents: 'none',
							}}
						>
							{spell.name}
						</div>
					</CardFrame>
				</div>
			))}
		</div>
	);
};

export default PokerSpellTray;
