/**
 * MinionField — one of the two minion rows (opp on top, player on bottom).
 *
 * Renders `SimpleBattlefield` in the requested role. The role determines
 * which side gets the populated cards array (the other side passes `[]`)
 * and which CSS hover-boost class wraps the row.
 *
 * `.zone-opp-field` and `.zone-player-field` get a `z-index: 600` lift
 * when a card inside is being hovered — that rule lives in
 * `layout/board.css` and is keyed off the class names below.
 */

import React from 'react';
import SimpleBattlefield from '../../components/SimpleBattlefield';
import { ARENA_VFX_TARGETS, arenaVfxTargetProps } from '../arenaVfxTargets';

export interface MinionFieldProps {
	readonly role: 'opp' | 'player';
	readonly playerCards: ReadonlyArray<unknown>;
	readonly opponentCards: ReadonlyArray<unknown>;
	readonly onCardClick: (card: any, position?: any) => void;
	readonly onOpponentCardClick: (card: any) => void;
	readonly onOpponentHeroClick?: () => void;
	readonly attackingCard: any;
	readonly isPlayerTurn: boolean;
	readonly registerCardPosition: (card: any, position: any) => void;
	readonly shakingTargets: ReadonlySet<string>;
	readonly isInteractionDisabled: boolean;
}

export const MinionField: React.FC<MinionFieldProps> = ({
	role,
	playerCards,
	opponentCards,
	onCardClick,
	onOpponentCardClick,
	onOpponentHeroClick,
	attackingCard,
	isPlayerTurn,
	registerCardPosition,
	shakingTargets,
	isInteractionDisabled,
}) => {
	const zoneClass = role === 'opp' ? 'zone-opp-field' : 'zone-player-field';
	const vfxTarget = role === 'opp' ? ARENA_VFX_TARGETS.opponentMinion : ARENA_VFX_TARGETS.playerMinion;
	return (
		<section className={`${zoneClass} minion-field minion-field--${role}`} {...arenaVfxTargetProps(vfxTarget)}>
			<SimpleBattlefield
				playerCards={playerCards as any}
				opponentCards={opponentCards as any}
				onCardClick={onCardClick}
				onOpponentCardClick={onOpponentCardClick}
				onOpponentHeroClick={role === 'opp' ? onOpponentHeroClick : undefined}
				attackingCard={attackingCard}
				isPlayerTurn={isPlayerTurn}
				registerCardPosition={registerCardPosition}
				renderMode={role === 'opp' ? 'opponent' : 'player'}
				renderSurface="poker"
				shakingTargets={shakingTargets as Set<string>}
				isInteractionDisabled={isInteractionDisabled}
			/>
		</section>
	);
};

export default MinionField;
