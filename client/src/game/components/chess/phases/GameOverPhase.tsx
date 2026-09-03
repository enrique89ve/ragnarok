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

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { CampaignMission, CampaignChapter, CinematicIntro, Difficulty, MusicCueId } from '../../../campaign/campaignTypes';
import CinematicCrawl from '../../campaign/CinematicCrawl';
import type { GameOverSubPhase } from '../../../flow/round/types';
import { CampaignResultPanel, CasualResultPanel } from './GameOverResultPanels';
import '../game-over-result.css';

export type GameOverPhaseProps = {
	readonly result: 'victory' | 'defeat' | 'draw';
	readonly sub: GameOverSubPhase;
	readonly playerTurnCount: number;
	// Campaign-only context. When null the phase renders the casual/PvP
	// result card (no narrative, no stars, no rewards, no retry button).
	readonly campaign:
		| {
			readonly mission: CampaignMission;
			readonly chapter: CampaignChapter;
			readonly difficulty: Difficulty;
			readonly localRunId: string | null;
		}
		| null;
	readonly onCinematicEnd: () => void;
	readonly onBridgeEnd: () => void;
	readonly onPrimaryAction: () => void;
	readonly onHome: () => void;
	readonly onRetry: () => void;
	readonly abandonment?: {
		readonly autoHomeSeconds: number;
		readonly kind?: 'left' | 'technical';
	} | null;
};

type CampaignContext = NonNullable<GameOverPhaseProps['campaign']>;
type GameOverResult = GameOverPhaseProps['result'];
type CinematicState =
	| { readonly kind: 'none' }
	| { readonly kind: 'fallback' }
	| {
		readonly kind: 'show';
		readonly intro: CinematicIntro;
		readonly openingMusic: MusicCueId;
	};

const GameOverPhase: React.FC<GameOverPhaseProps> = props => {
	const { campaign, onCinematicEnd, result, sub } = props;
	const cinematicState = getCinematicState(sub, campaign, result);
	const abandonmentState = useAbandonmentCountdown(props.abandonment ?? null, props.onHome);
	// Defensive: mission flagged cinematic sub but no scenes — drop straight
	// into result. The advance-to-result dispatch must happen during commit
	// (not render) to keep the parent FSM transition out of React's render
	// phase. Without the effect, calling onCinematicEnd() inline would mutate
	// parent state during this component's render — illegal in React and
	// double-invoked under StrictMode.
	useEffect(() => {
		if (cinematicState.kind === 'fallback') onCinematicEnd();
	}, [cinematicState.kind, onCinematicEnd]);

	if (cinematicState.kind === 'show') {
		return (
			<CinematicCrawl
				key="gameover-cinematic"
				intro={cinematicState.intro}
				onComplete={onCinematicEnd}
				openingMusic={cinematicState.openingMusic}
			/>
		);
	}
	if (cinematicState.kind === 'fallback') {
		return null;
	}

	return <GameOverBridgeOrResult {...props} abandonmentState={abandonmentState} />;
};

type AbandonmentState = {
	readonly secondsRemaining: number;
	readonly onHome: () => void;
	readonly kind: 'left' | 'technical';
};

function useAbandonmentCountdown(
	abandonment: GameOverPhaseProps['abandonment'],
	onHome: () => void,
): AbandonmentState | null {
	const autoHomeSeconds = abandonment?.autoHomeSeconds ?? null;
	const [secondsRemaining, setSecondsRemaining] = useState(autoHomeSeconds ?? 0);

	useEffect(() => {
		if (autoHomeSeconds === null) return undefined;
		setSecondsRemaining(autoHomeSeconds);
		const interval = window.setInterval(() => {
			setSecondsRemaining(current => Math.max(0, current - 1));
		}, 1000);
		const timeout = window.setTimeout(onHome, autoHomeSeconds * 1000);
		return () => {
			window.clearInterval(interval);
			window.clearTimeout(timeout);
		};
	}, [autoHomeSeconds, onHome]);

	if (autoHomeSeconds === null) return null;
	return {
		secondsRemaining,
		onHome,
		kind: abandonment?.kind ?? 'left',
	};
}

function getCinematicState(
	sub: GameOverSubPhase,
	campaign: CampaignContext | null,
	result: GameOverResult,
): CinematicState {
	if (sub !== 'cinematic' || !campaign || result === 'draw') return { kind: 'none' };
	const scenes = result === 'victory'
		? campaign.mission.victoryCinematic
		: campaign.mission.defeatCinematic;
	if (!scenes || scenes.length === 0) return { kind: 'fallback' };
	return {
		kind: 'show',
		intro: {
			title: result === 'victory' ? 'Victory' : 'Twilight',
			style: campaign.chapter.cinematicIntro?.style ?? 'A Norse Saga',
			scenes,
		},
		openingMusic: result === 'victory' ? 'aesir_triumph' : 'twilight_horn',
	};
}

function GameOverBridgeOrResult(props: GameOverPhaseProps & { readonly abandonmentState: AbandonmentState | null }) {
	const bridgeIntro = getBridgeIntro(props.sub, props.campaign);
	if (bridgeIntro) {
		return (
			<CinematicCrawl
				key="gameover-bridge"
				intro={bridgeIntro}
				onComplete={props.onBridgeEnd}
				openingMusic="forge_anvil"
			/>
		);
	}

	return <GameOverResultCard {...props} />;
}

function getBridgeIntro(
	sub: GameOverSubPhase,
	campaign: CampaignContext | null,
): CinematicIntro | null {
	if (sub !== 'bridge' || !campaign || !campaign.mission.storyBridge?.length) return null;
	return {
		title: campaign.chapter.name,
		style: campaign.chapter.cinematicIntro?.style ?? 'A Norse Saga',
		scenes: campaign.mission.storyBridge,
	};
}

function GameOverResultCard({
	result,
	playerTurnCount,
	campaign,
	onPrimaryAction,
	onRetry,
	abandonmentState,
}: GameOverPhaseProps & { readonly abandonmentState: AbandonmentState | null }) {
	return (
		<motion.div
			key="gameover-result"
			initial={{ opacity: 0, scale: 0.92 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
			className="cgo-result"
		>
			<motion.div
				className={`cgo-title ${getResultTone(result, abandonmentState?.kind)}`}
				initial={{ opacity: 0, y: -30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
			>
				{getResultTitle(result, abandonmentState?.kind)}
			</motion.div>

			{campaign ? (
				<CampaignResultPanel
					campaign={campaign}
					onPrimaryAction={onPrimaryAction}
					onRetry={onRetry}
					playerTurnCount={playerTurnCount}
					result={result}
					abandonment={abandonmentState}
				/>
			) : (
				<CasualResultPanel
					onPrimaryAction={onPrimaryAction}
					result={result}
					abandonment={abandonmentState}
				/>
			)}
		</motion.div>
	);
}

function getResultTone(result: GameOverResult, abandonmentKind?: 'left' | 'technical'): string {
	if (abandonmentKind === 'technical') return 'draw';
	if (result === 'victory') return 'victory';
	if (result === 'draw') return 'draw';
	return 'defeat';
}

function getResultTitle(result: GameOverResult, abandonmentKind?: 'left' | 'technical'): string {
	if (abandonmentKind === 'technical') return 'MATCH CLOSED';
	if (result === 'victory') return 'VICTORY';
	if (result === 'draw') return 'DRAW';
	return 'DEFEAT';
}

export default GameOverPhase;
