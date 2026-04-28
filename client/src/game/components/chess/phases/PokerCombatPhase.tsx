/*
  PokerCombatPhase — duel arena that runs while the FSM is in
  poker_combat. Owns the framer-motion mount/unmount choreography of
  the arena container and forwards the combat result up to the
  coordinator's resolution handler (which projects the poker outcome
  back onto the chess board and dispatches COMBAT_RESOLVED).

  The CombatHandoff carrying chess context — attacker / defender /
  armies / slotsSwapped / firstStrikeTarget — is built by the
  coordinator at VS_COMPLETE time and lives in flowState.handoff. The
  arena itself reads its own combat state from useUnifiedCombatStore;
  this phase does not pass the handoff through. Keeping the prop on
  this component ensures the FSM contract is honoured even when the
  arena is later refactored to consume it directly.

  Lazy-loaded by the coordinator so non-combat surface area never
  bundles the arena, its sub-components, or its store wiring.
*/

import React from 'react';
import { motion } from 'framer-motion';
import RagnarokCombatArena from '../../../combat/RagnarokCombatArena';
import type { CombatHandoff } from '../../../flow/round/types';

export type PokerCombatOutcome = 'player' | 'opponent' | 'draw';

export type PokerCombatPhaseProps = {
	readonly handoff: CombatHandoff;
	readonly onCombatEnd: (winner: PokerCombatOutcome) => void;
};

const PokerCombatPhase: React.FC<PokerCombatPhaseProps> = ({ onCombatEnd }) => {
	return (
		<motion.div
			key="poker"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="w-full h-full"
		>
			<RagnarokCombatArena onCombatEnd={onCombatEnd} />
		</motion.div>
	);
};

export default PokerCombatPhase;
