/*
  GameOverPhase — terminal screen of a round. Owns its three internal
  sub-paths (cinematic / result / bridge) so the coordinator only
  needs to dispatch FSM events: GAME_OVER_ADVANCE for cinematic→result
  progression, plus app-level handlers for "back to campaign" and
  "retry" / "play again".

  Sub-routing summary:
    - cinematic → renders authored victory/defeat scenes (campaign only).
      onCinematicEnd advances to 'result'. Defensive fallback also fires
      onCinematicEnd if the mission flagged cinematic but has no scenes.
    - bridge    → renders authored storyBridge scenes between mission N
      and N+1 (campaign only). onBridgeEnd cleans up + navigates.
    - result    → the canonical victory/defeat card. Different layouts
      for campaign vs casual/PvP.

  Lazy-loaded by the coordinator so non-campaign flows do not bundle
  the campaign-only narrative branches.
*/

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { CampaignMission, CampaignChapter, Difficulty } from '../../../campaign/campaignTypes';
import { getMissionStars } from '../../../campaign';
import { useRivalryStore } from '../../../pvp/rivalryStore';
import CinematicCrawl from '../../campaign/CinematicCrawl';
import type { GameOverSubPhase } from '../../../flow/round/types';

/*
  RivalryBadge — head-to-head PvP record on the result card. Reads the
  most recent rival from useRivalryStore. Renders nothing if no record.
  Lives here (not in the coordinator) because it is exclusively a
  game-over concern.
*/
function RivalryBadge() {
	const rivals = useRivalryStore(s => s.rivals);
	const latest = rivals.length > 0 ? rivals[0] : null;
	if (!latest) return null;
	return (
		<motion.div
			className="cgo-rivalry"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.8, duration: 0.6 }}
		>
			<span className="cgo-rivalry-label">vs {latest.displayName}</span>
			<span className="cgo-rivalry-record">
				<span className="cgo-rivalry-wins">{latest.wins}W</span>
				{' — '}
				<span className="cgo-rivalry-losses">{latest.losses}L</span>
			</span>
		</motion.div>
	);
}

export type GameOverPhaseProps = {
	readonly isVictory: boolean;
	readonly sub: GameOverSubPhase;
	readonly playerTurnCount: number;
	// Campaign-only context. When null the phase renders the casual/PvP
	// result card (no narrative, no stars, no rewards, no retry button).
	readonly campaign:
		| { readonly mission: CampaignMission; readonly chapter: CampaignChapter; readonly difficulty: Difficulty }
		| null;
	readonly onCinematicEnd: () => void;
	readonly onBridgeEnd: () => void;
	readonly onPrimaryAction: () => void;
	readonly onRetry: () => void;
};

const GameOverPhase: React.FC<GameOverPhaseProps> = ({
	isVictory,
	sub,
	playerTurnCount,
	campaign,
	onCinematicEnd,
	onBridgeEnd,
	onPrimaryAction,
	onRetry,
}) => {
	// Sub-phase 1: victory / defeat cinematic. Campaign-authored only.
	const cinematicScenes = sub === 'cinematic' && campaign
		? (isVictory ? campaign.mission.victoryCinematic : campaign.mission.defeatCinematic)
		: undefined;
	const cinematicHasScenes = !!(cinematicScenes && cinematicScenes.length > 0);
	const cinematicNeedsFallback = sub === 'cinematic' && !!campaign && !cinematicHasScenes;

	// Defensive: mission flagged cinematic sub but no scenes — drop straight
	// into result. The advance-to-result dispatch must happen during commit
	// (not render) to keep the parent FSM transition out of React's render
	// phase. Without the effect, calling onCinematicEnd() inline would mutate
	// parent state during this component's render — illegal in React and
	// double-invoked under StrictMode.
	useEffect(() => {
		if (cinematicNeedsFallback) onCinematicEnd();
	}, [cinematicNeedsFallback, onCinematicEnd]);

	if (sub === 'cinematic' && campaign && cinematicHasScenes) {
		const syntheticIntro = {
			title: isVictory ? 'Victory' : 'Twilight',
			style: campaign.chapter.cinematicIntro?.style ?? 'A Norse Saga',
			scenes: cinematicScenes!,
		};
		return (
			<CinematicCrawl
				key="gameover-cinematic"
				intro={syntheticIntro}
				onComplete={onCinematicEnd}
				openingMusic={isVictory ? 'aesir_triumph' : 'twilight_horn'}
			/>
		);
	}
	if (cinematicNeedsFallback) {
		return null;
	}

	// Sub-phase 3: story bridge between mission N and N+1.
	if (sub === 'bridge' && campaign && (campaign.mission.storyBridge?.length ?? 0) > 0) {
		const syntheticBridge = {
			title: campaign.chapter.name,
			style: campaign.chapter.cinematicIntro?.style ?? 'A Norse Saga',
			scenes: campaign.mission.storyBridge ?? [],
		};
		return (
			<CinematicCrawl
				key="gameover-bridge"
				intro={syntheticBridge}
				onComplete={onBridgeEnd}
				openingMusic="forge_anvil"
			/>
		);
	}

	// Sub-phase 2 (default): the result card.
	return (
		<motion.div
			key="gameover-result"
			initial={{ opacity: 0, scale: 0.92 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
			className="cgo-result"
		>
			<motion.div
				className={`cgo-title ${isVictory ? 'victory' : 'defeat'}`}
				initial={{ opacity: 0, y: -30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
			>
				{isVictory ? 'VICTORY' : 'DEFEAT'}
			</motion.div>

			{campaign ? (
				<>
					{/* Boss victory quip — the boss gloats when the player loses */}
					{!isVictory && campaign.mission.bossQuips?.onVictory && (
						<motion.p
							className="cgo-boss-quip"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.6, duration: 1.0 }}
						>
							&ldquo;{campaign.mission.bossQuips.onVictory}&rdquo;
						</motion.p>
					)}
					<motion.p
						className="cgo-subtitle"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 1.0, duration: 0.8 }}
					>
						{isVictory
							? (campaign.mission.narrativeVictory ?? '')
							: (campaign.mission.narrativeDefeat ?? 'The enemy stands triumphant. But your story is not yet over...')}
					</motion.p>

					{/*
						The full epilogue paragraph — narrativeAfter. Authored on
						every campaign mission. This is the connective tissue
						between "you won the fight" and "what it meant for the
						world." Renders below the subtitle in a scrollable box.
					*/}
					{isVictory && campaign.mission.narrativeAfter && (
						<motion.div
							className="cgo-narrative-scroll"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 1.6, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
						>
							<div className="cgo-narrative-divider">
								<span>&#x16A0;</span>
							</div>
							<p>{campaign.mission.narrativeAfter}</p>
						</motion.div>
					)}

					{/* Star rating — 1-3 stars based on turn count */}
					{isVictory && (
						<motion.div
							className="cgo-stars"
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 1.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
						>
							{[1, 2, 3].map(star => {
								const earned = getMissionStars(playerTurnCount, campaign.mission) >= star;
								return (
									<span key={star} className={`cgo-star ${earned ? 'earned' : 'empty'}`}>
										&#9733;
									</span>
								);
							})}
						</motion.div>
					)}

					{/* Chapter completion splash — fires if this was the last mission */}
					{isVictory && campaign.mission.isChapterFinale && (
						<motion.div
							className="cgo-chapter-splash"
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 1.8, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
						>
							<div className="cgo-chapter-label">Chapter Complete</div>
							<div className="cgo-chapter-name">{campaign.chapter.name}</div>
						</motion.div>
					)}

					{isVictory && campaign.mission.rewards.length > 0 && (
						<motion.div
							className="cgo-rewards"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 2.2, duration: 0.8 }}
						>
							{campaign.mission.rewards.map((r, i) => (
								<div key={`${r.type}-${r.amount ?? 1}-${i}`} className="cgo-reward-pill">
									+{r.amount || 1} {r.type}
								</div>
							))}
							{/* Difficulty-locked bonus rewards */}
							{campaign.difficulty === 'heroic' && (
								<div className="cgo-difficulty-bonus heroic">
									+50 eitr (heroic)
								</div>
							)}
							{campaign.difficulty === 'mythic' && (
								<div className="cgo-difficulty-bonus mythic">
									+150 eitr + bonus pack (mythic)
								</div>
							)}
						</motion.div>
					)}

					<motion.div
						className="cgo-buttons"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 2.6, duration: 0.6 }}
					>
						<button
							type="button"
							onClick={onPrimaryAction}
							className="cgo-btn-primary"
						>
							{isVictory && (campaign.mission.storyBridge?.length ?? 0) > 0
								? 'Continue the Saga'
								: 'Back to Campaign'}
						</button>
						{!isVictory && (
							<button
								type="button"
								onClick={onRetry}
								className="cgo-btn-retry"
							>
								Retry Mission
							</button>
						)}
					</motion.div>
				</>
			) : (
				<>
					<p className="cgo-subtitle">
						{isVictory
							? 'Checkmate! The enemy King has no escape.'
							: 'Checkmate... Your King has been cornered.'}
					</p>
					{/* PvP rivalry record — show head-to-head if we have history */}
					<RivalryBadge />
					<button
						type="button"
						onClick={onPrimaryAction}
						className="cgo-btn-primary"
					>
						Play Again
					</button>
				</>
			)}
		</motion.div>
	);
};

export default GameOverPhase;
