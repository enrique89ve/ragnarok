/*
  VsScreenPhase — fullscreen attacker-vs-defender splash that runs
  between chess collision detection and the poker arena. Renders the
  accepted collision and peer approval controls.

  Lazy-loaded by the coordinator so casual / multiplayer routes that
  initialise straight into chess never bundle the splash UI on first
  paint. Keep it dependency-light: this component owns no state and
  no store reads.
*/

import React from 'react';
import type { ChessPiece } from '../../../types/ChessTypes';
import VSScreen from '../VSScreen';
import type { PokerEntryApprovalView } from '../../../p2p/usePokerEntryApproval';
import {
	VS_DURATION_RANKED_MS,
	VS_MIN_DURATION_RANKED_MS,
	VS_DURATION_SINGLE_MS,
	VS_MIN_DURATION_SINGLE_MS,
} from '../vsScreenTiming';

export type VsScreenPhaseProps = {
	readonly attacker: ChessPiece;
	readonly defender: ChessPiece;
	readonly durationMs?: number;
	readonly minDurationMs?: number;
	readonly approval?: PokerEntryApprovalView | null;
};

const VsScreenPhase: React.FC<VsScreenPhaseProps> = ({
	attacker,
	defender,
	durationMs = VS_DURATION_RANKED_MS,
	minDurationMs = VS_MIN_DURATION_RANKED_MS,
	approval = null,
}) => {
	return (
		<VSScreen
			key="vs"
			attacker={attacker}
			defender={defender}
			duration={durationMs}
			minDurationMs={minDurationMs}
			approval={approval}
		/>
	);
};

export {
	VS_DURATION_SINGLE_MS,
	VS_MIN_DURATION_SINGLE_MS,
};

export default VsScreenPhase;
