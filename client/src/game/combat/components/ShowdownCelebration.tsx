import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PokerCard } from '../../types/PokerCombatTypes';
import { getCombinedHandName } from '../../types/PokerCombatTypes';
import { PokerCombatAnimation } from './PokerCombatAnimation';
import { proceduralAudio } from '../../audio/proceduralAudio';

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

export const ShowdownCelebration: React.FC<ShowdownCelebrationProps> = ({
	resolution,
	playerHeroId,
	opponentHeroId,
	onComplete
}) => {
	const isShowdown = resolution.resolutionType === 'showdown';
	const [ready, setReady] = useState(false);
	const [combatAnimDone, setCombatAnimDone] = useState(false);

	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;

	useEffect(() => {
		const delayTimer = setTimeout(() => setReady(true), ENTRANCE_DELAY);
		return () => clearTimeout(delayTimer);
	}, []);

	// For draws, skip combat animation after a brief pause
	useEffect(() => {
		if (!ready || resolution.winner !== 'draw') return;
		const t = setTimeout(() => setCombatAnimDone(true), 500);
		return () => clearTimeout(t);
	}, [ready, resolution.winner]);

	// Auto-dismiss 1500ms after combat animation completes (badge display time)
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
			onCompleteRef.current();
		}, 1500);
		return () => clearTimeout(timer);
	}, [combatAnimDone, resolution.winner]);

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
		return resolution.winner === 'player' ? 'Victory!' : 'Defeat';
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
							duration: 0.5
						}}
					>
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
							<motion.div
								className="fold-message"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
							>
								{getHandName()}
							</motion.div>
						)}
						{getDamageText() && (
							<motion.div
								className="damage-text"
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.5 }}
							>
								{getDamageText()}
							</motion.div>
						)}
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
