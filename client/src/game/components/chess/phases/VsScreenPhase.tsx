/*
  VsScreenPhase — fullscreen attacker-vs-defender splash that runs
  between chess collision detection and the poker arena. Pure
  presentation: receives the two pieces and a single onTimeout
  callback the coordinator wires to dispatch VS_COMPLETE with the
  CombatHandoff it builds during the timer.

  Lazy-loaded by the coordinator so casual / multiplayer routes that
  initialise straight into chess never bundle the splash UI on first
  paint. Keep it dependency-light: this component owns no state and
  no store reads.
*/

import React from 'react';
import type { ChessPiece } from '../../../types/ChessTypes';
import VSScreen from '../VSScreen';

const DEFAULT_VS_DURATION_MS = 2500;

export type VsScreenPhaseProps = {
	readonly attacker: ChessPiece;
	readonly defender: ChessPiece;
	readonly onTimeout: () => void;
	readonly durationMs?: number;
};

const VsScreenPhase: React.FC<VsScreenPhaseProps> = ({
	attacker,
	defender,
	onTimeout,
	durationMs = DEFAULT_VS_DURATION_MS,
}) => {
	return (
		<VSScreen
			key="vs"
			attacker={attacker}
			defender={defender}
			onComplete={onTimeout}
			duration={durationMs}
		/>
	);
};

export default VsScreenPhase;
