import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PokerCard } from '../../types/PokerCombatTypes';
import { getCombinedHandName } from '../../types/PokerCombatTypes';
import { PokerCombatAnimation } from './PokerCombatAnimation';
import { proceduralAudio } from '../../audio/proceduralAudio';
import {
	SHOWDOWN_PRESENTATION_BUDGET_MS,
	createOnceRunner,
} from '../pokerResolutionOutcome';
import '../../poker/styles/poker-showdown.css';

interface ShowdownCelebrationProps {
	resolution: {
		winner: 'player' | 'opponent' | 'draw';
		resolutionType: 'showdown' | 'fold';
		playerHand: { rank: number; cards: PokerCard[] };
		opponentHand: { rank: number; cards: PokerCard[] };
		playerDamage: number;
		opponentDamage: number;
		playerFinalHealth: number;
		opponentFinalHealth: number;
		whoFolded?: 'player' | 'opponent';
		foldPenalty?: number;
	};
	playerHeroId: string;
	opponentHeroId: string;
	onComplete: () => void;
}

const ENTRANCE_DELAY = 400;
const BADGE_DISPLAY_MS = 3200;

const NorseResultFrame = () => (
	<svg
		className="winner-badge-frame"
		viewBox="0 0 640 180"
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		<path className="winner-badge-frame-outer" d="M28 8h584l24 24v116l-24 24H28L4 148V32L28 8Z" />
		<path className="winner-badge-frame-inner" d="M36 18h568l18 18v100l-18 18H36l-18-18V36l18-18Z" />
		<path className="winner-badge-frame-knot" d="M320 8v7M320 154v18l-10-10 10-10 10 10" />
		<path className="winner-badge-frame-rune" d="M4 90h30l12-12M636 90h-30l-12 12M40 20l18 18M600 20l-18 18M40 160l18-18M600 160l-18-18" />
	</svg>
);

function useOnceComplete(onComplete: () => void): () => boolean {
	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;
	const finishRef = useRef<(() => boolean) | null>(null);
	if (finishRef.current === null) {
		finishRef.current = createOnceRunner(() => onCompleteRef.current());
	}
	return finishRef.current;
}

export const ShowdownCelebration: React.FC<ShowdownCelebrationProps> = ({
	resolution,
	playerHeroId,
	opponentHeroId,
	onComplete
}) => {
	const isShowdown = resolution.resolutionType === 'showdown';
	const [ready, setReady] = useState(false);
	const [combatAnimDone, setCombatAnimDone] = useState(false);
	const finish = useOnceComplete(onComplete);

	useEffect(() => {
		const delayTimer = setTimeout(() => setReady(true), ENTRANCE_DELAY);
		return () => clearTimeout(delayTimer);
	}, []);

	useEffect(() => {
		const budgetTimer = setTimeout(() => {
			finish();
		}, SHOWDOWN_PRESENTATION_BUDGET_MS);
		return () => clearTimeout(budgetTimer);
	}, [finish]);

	// For draws, skip combat animation after a brief pause
	useEffect(() => {
		if (!ready || resolution.winner !== 'draw') return;
		const t = setTimeout(() => setCombatAnimDone(true), 500);
		return () => clearTimeout(t);
	}, [ready, resolution.winner]);

	// Keep the verdict visible long enough for both peers to read the winner
	// and hand comparison before the next poker hand starts.
	useEffect(() => {
		if (!combatAnimDone) return;
		if (resolution.winner === 'draw') {
			proceduralAudio.play('sword_clash');
		} else if (resolution.winner === 'player') {
			proceduralAudio.play('victory');
		} else {
			proceduralAudio.play('defeat');
		}
		const timer = setTimeout(() => {
			finish();
		}, BADGE_DISPLAY_MS);
		return () => clearTimeout(timer);
	}, [combatAnimDone, resolution.winner, finish]);

	// Determine attacker/defender and damage for the combat animation
	const getAnimationProps = () => {
		if (resolution.winner === 'draw') {
			return null;
		}

		const isPlayerWinner = resolution.winner === 'player';
		const attackerHeroId = isPlayerWinner ? playerHeroId : opponentHeroId;
		const defenderHeroId = isPlayerWinner ? opponentHeroId : playerHeroId;

		let damage: number;
		if (resolution.resolutionType === 'fold') {
			damage = resolution.foldPenalty ?? 0;
		} else {
			damage = isPlayerWinner ? resolution.opponentDamage : resolution.playerDamage;
		}

		return {
			attackerHeroId,
			defenderHeroId,
			damage,
			resolutionType: resolution.resolutionType as 'fold' | 'showdown',
			winner: resolution.winner as 'player' | 'opponent',
		};
	};

	const getWinnerText = () => {
		if (resolution.winner === 'draw') return 'Draw!';
		return resolution.winner === 'player' ? 'You Win' : 'Opponent Wins';
	};

	const getHandName = () => {
		if (!isShowdown) {
			return resolution.whoFolded === 'opponent' ? 'Opponent Folded!' : 'You Folded';
		}
		const winningHand = resolution.winner === 'player'
			? resolution.playerHand
			: resolution.opponentHand;
		return getCombinedHandName(winningHand.rank);
	};

	const getDamageText = () => {
		if (resolution.winner === 'draw') return '';
		if (resolution.resolutionType === 'fold') {
			const hpLost = resolution.foldPenalty ?? 0;
			if (hpLost > 0) {
				const loserName = resolution.whoFolded === 'player' ? 'You' : 'Opponent';
				return `${loserName} lost ${hpLost} HP`;
			}
			return '';
		}
		const damage = resolution.winner === 'player'
			? resolution.opponentDamage
			: resolution.playerDamage;
		return damage > 0 ? `-${damage} HP` : '';
	};

	const damageText = getDamageText();

	if (!ready) return null;

	const animProps = getAnimationProps();

	return (
		<AnimatePresence>
			<div className="showdown-celebration-container">
				{/* Phase 1: Combat animation plays first */}
				{animProps && !combatAnimDone && (
					<PokerCombatAnimation
						attackerHeroId={animProps.attackerHeroId}
						defenderHeroId={animProps.defenderHeroId}
						damage={animProps.damage}
						resolutionType={animProps.resolutionType}
						winner={animProps.winner}
						onComplete={() => setCombatAnimDone(true)}
					/>
				)}

				{/* Phase 2: Winner badge slides in after combat animation */}
				{combatAnimDone && (
					<motion.div
						className={`winner-badge ${resolution.winner === 'player' ? 'player-side' : resolution.winner === 'opponent' ? 'opponent-side' : 'center'}`}
						initial={{ opacity: 0, scale: 0.5, y: resolution.winner === 'player' ? 50 : resolution.winner === 'opponent' ? -50 : 0 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.8 }}
						transition={{
							type: 'spring',
							stiffness: 300,
							damping: 20,
							duration: 0.5,
						}}
					>
						<NorseResultFrame />
						<div className="winner-badge-content">
							<div className="winner-badge-kicker">{isShowdown ? 'SHOWDOWN' : 'WAGER RESOLVED'}</div>
							<div className="winner-badge-rule" aria-hidden="true" />
							<div className="winner-badge-text">{getWinnerText()}</div>
							{isShowdown && (
								<>
									<motion.div
										className="winner-hand-name"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.3 }}
									>
										{getHandName()}
									</motion.div>
									{/* Show both hands so player understands why they won/lost */}
									{resolution.winner !== 'draw' && (
										<motion.div
											className="showdown-hand-comparison"
											initial={{ opacity: 0 }}
											animate={{ opacity: 0.7 }}
											transition={{ delay: 0.5 }}
										>
											<span className={resolution.winner === 'player' ? 'hand-winner' : 'hand-loser'}>
												You: {getCombinedHandName(resolution.playerHand.rank)}
											</span>
											<span className="hand-vs">vs</span>
											<span className={resolution.winner === 'opponent' ? 'hand-winner' : 'hand-loser'}>
												Foe: {getCombinedHandName(resolution.opponentHand.rank)}
											</span>
										</motion.div>
									)}
								</>
							)}
							{!isShowdown && (
								<div className={`winner-badge-detail-row${damageText ? ' has-damage' : ''}`}>
									<motion.div
										className="fold-message"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.2 }}
									>
										{getHandName()}
									</motion.div>
									{damageText && (
										<>
											<span className="winner-badge-detail-divider" aria-hidden="true" />
											<motion.div
												className="showdown-damage-text"
												initial={{ opacity: 0, scale: 0.8 }}
												animate={{ opacity: 1, scale: 1 }}
												transition={{ delay: 0.5 }}
											>
												{damageText}
											</motion.div>
										</>
									)}
								</div>
							)}
						</div>
					</motion.div>
				)}

				<motion.div
					className="celebration-backdrop"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.3 }}
				/>
			</div>
		</AnimatePresence>
	);
};

export default ShowdownCelebration;
