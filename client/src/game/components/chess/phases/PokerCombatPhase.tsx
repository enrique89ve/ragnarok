/*
  PokerCombatPhase — duel arena while the FSM is in poker_combat.

  Local opening hand: OpeningHandMulliganHost until gate + iris + chunk.
  P2P: full arena immediately (prefetch on VS); presentation shell defer only.
*/

import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { CombatHandoff } from '../../../flow/round/types';
import { isOpeningMulliganGatingPoker } from '../../../utils/mulliganUtils';
import { useGameStore } from '../../../stores/gameStore';
import { useMatchStore } from '../../../match';
import { OpeningHandMulliganHost } from '../../../combat/OpeningHandMulliganHost';
import {
	flushPokerCombatChunkPrefetch,
	whenPokerCombatChunkReady,
} from '../../../combat/prefetchPokerCombatChunk';
import { shouldUseOpeningHandMulliganHost } from '../../../combat/openingHandPresentationPolicy';
import { useSettingsStore } from '../../../stores/settingsStore';
import type { HeroDeathPresentation, PokerCombatWinner } from '../../../combat/pokerResolutionOutcome';

const RagnarokCombatArena = lazy(() => import('../../../combat/RagnarokCombatArena'));

export type PokerCombatPhaseProps = {
	readonly handoff: CombatHandoff;
	readonly onCombatEnd: (winner: PokerCombatWinner, presentation?: HeroDeathPresentation) => void;
};

const PokerCombatPhase: React.FC<PokerCombatPhaseProps> = ({ onCombatEnd }) => {
	const isPeerMatch = useMatchStore(state => state.activeMatch?.opponent.kind === 'peer');
	const openingMulliganGatingPoker = useGameStore(state =>
		isOpeningMulliganGatingPoker(state.gameState),
	);
	const useOpeningHost = shouldUseOpeningHandMulliganHost(isPeerMatch, openingMulliganGatingPoker);

	const sawOpeningGateRef = useRef(useOpeningHost);
	const [retainOpeningHost, setRetainOpeningHost] = useState(useOpeningHost);
	const [chunkReady, setChunkReady] = useState(false);
	const [irisSettled, setIrisSettled] = useState(false);
	const animationsEnabled = useSettingsStore(state => state.animationsEnabled);
	const reduceMotion = useSettingsStore(state => state.reduceMotion);
	const arenaRevealMotion = animationsEnabled && !reduceMotion;

	useEffect(() => {
		if (useOpeningHost) {
			sawOpeningGateRef.current = true;
			setRetainOpeningHost(true);
		}
	}, [useOpeningHost]);

	useEffect(() => {
		if (!sawOpeningGateRef.current || useOpeningHost) return;
		flushPokerCombatChunkPrefetch();
		let cancelled = false;
		void whenPokerCombatChunkReady().then(() => {
			if (!cancelled) setChunkReady(true);
		});
		return () => {
			cancelled = true;
		};
	}, [useOpeningHost]);

	const handleChamberExitSettled = useCallback(() => {
		setIrisSettled(true);
	}, []);

	useEffect(() => {
		if (!retainOpeningHost || !irisSettled || !chunkReady) return;
		setRetainOpeningHost(false);
	}, [chunkReady, irisSettled, retainOpeningHost]);

	const arena = (
		<Suspense fallback={null}>
			<RagnarokCombatArena onCombatEnd={onCombatEnd} />
		</Suspense>
	);

	return (
		<motion.div
			key="poker"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="w-full h-full"
		>
			{isPeerMatch ? (
				arena
			) : (
				<div className="poker-combat-phase-stack">
					{retainOpeningHost ? (
						<OpeningHandMulliganHost
							chamberActive={openingMulliganGatingPoker}
							onChamberExitSettled={handleChamberExitSettled}
						/>
					) : null}
					{!retainOpeningHost ? (
						<div
							className={[
								'poker-combat-phase-arena',
								arenaRevealMotion ? 'poker-combat-phase-arena--reveal' : 'poker-combat-phase-arena--instant',
							].join(' ')}
						>
							{arena}
						</div>
					) : null}
				</div>
			)}
		</motion.div>
	);
};

export default PokerCombatPhase;
