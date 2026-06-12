/**
 * <PokerSpellTray> — Family 2 (poker-spell) in-arena surface.
 *
 * Renders the player's `pendingPokerSpells` queue as small CardFrame
 * instances with `cardFamily="poker-spell"` so the indigo accent +
 * cast-glow keyframe (defined in CardFrame.css) apply. The opponent
 * tray mirrors the same queue today (the poker-spell state is shared
 * at the slice level — the SPELL_PET phase is a public preview before
 * resolution). When opponent-only spell tracking lands, split the
 * selector.
 *
 * Empty state: "No spells queued" in the caster's accent color
 * (indigo for player, red for opponent — defined in poker-spell-tray.css).
 *
 * Selector: `usePokerSpells().pendingSpells` — the live Zustand slice
 * state. Re-renders are stable as long as the slice doesn't allocate
 * a new array (it doesn't; it spreads in `queuePokerSpell`).
 */

import React, { useMemo } from 'react';
import { CardFrame } from '../../components/card';
import { usePokerSpells } from '../../hooks/usePokerSpells';
import type { PokerSpellCard } from '../../types/CardTypes';
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
		return (
			<div className={className} role="region" aria-label={`${caster} poker spell tray`}>
				<span className="poker-spell-tray__empty">No spells queued</span>
			</div>
		);
	}

	return (
		<div className={className} role="region" aria-label={`${caster} poker spell tray`}>
			{visible.map((spell: PokerSpellCard) => (
				<div key={spell.id} className="poker-spell-tray__slot">
					<CardFrame
						shape="tile"
						size="small"
						rarity={spell.rarity}
						cardFamily="poker-spell"
						cardKind="poker_spell"
						isPlayable={false}
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
