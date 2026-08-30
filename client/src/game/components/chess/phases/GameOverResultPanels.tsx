import React from 'react';
import { motion } from 'framer-motion';
import type { CampaignChapter, CampaignMission, Difficulty } from '../../../campaign/campaignTypes';
import { buildCampaignRewardEvidenceContext, getCampaignResultRewardCopy, getMissionStars, useCampaignStore } from '../../../campaign';
import { CAMPAIGN_ID } from '@shared/campaign/constants';
import { useRivalryStore } from '../../../pvp/rivalryStore';
import CeremonyEvidenceButton from '../../CeremonyEvidenceButton';
import { useNFTUsername } from '../../../nft/hooks';
import {
	createP2PQaLocalRewardPreview,
	useMatchStore,
	type P2PQaLocalRewardPreview,
} from '../../../match';
import {
	getRagnarokNetworkConfig,
	type RagnarokNetworkConfig,
} from '../../../config/networkConfig';

type GameOverResult = 'victory' | 'defeat' | 'draw';

type AbandonmentState = {
	readonly secondsRemaining: number;
	readonly onHome: () => void;
};

export type GameOverCampaignContext = {
	readonly mission: CampaignMission;
	readonly chapter: CampaignChapter;
	readonly difficulty: Difficulty;
	readonly localRunId: string | null;
};

export function CampaignResultPanel({
	result,
	playerTurnCount,
	campaign,
	onPrimaryAction,
	onRetry,
	abandonment = null,
}: {
	readonly result: GameOverResult;
	readonly playerTurnCount: number;
	readonly campaign: GameOverCampaignContext;
	readonly onPrimaryAction: () => void;
	readonly onRetry: () => void;
	readonly abandonment?: AbandonmentState | null;
}) {
	const account = useNFTUsername();
	const lastRewardFeedback = useCampaignStore(state => state.lastRewardFeedback);
	const activeRewardFeedback = lastRewardFeedback?.missionId === campaign.mission.id
		? lastRewardFeedback
		: null;
	const rewardCopy = getCampaignResultRewardCopy(activeRewardFeedback);
	const isVictory = result === 'victory';
	const isDraw = result === 'draw';
	const isAbandoned = abandonment !== null && abandonment !== undefined;

	return (
		<>
			<CampaignBossQuip campaign={campaign} isAbandoned={isAbandoned} isDraw={isDraw} isVictory={isVictory} />
			{isAbandoned ? (
				<p className="cgo-subtitle">
					You left the battle. This run is closed locally as an abandoned defeat.
				</p>
			) : (
				<>
					<CampaignSubtitle campaign={campaign} isDraw={isDraw} isVictory={isVictory} />
					<CampaignNarrativeAfter campaign={campaign} isVictory={isVictory} />
				</>
			)}
			<CampaignStars campaign={campaign} isVictory={isVictory} playerTurnCount={playerTurnCount} />
			<CampaignChapterSplash campaign={campaign} isVictory={isVictory} />
			{rewardCopy && !isAbandoned && (
				<CampaignRewardBlock
					account={account}
					activeRewardFeedback={activeRewardFeedback}
					campaign={campaign}
					playerTurnCount={playerTurnCount}
					result={result}
					rewardCopy={rewardCopy}
				/>
			)}
			{isAbandoned ? (
				<AbandonedMatchActions abandonment={abandonment} />
			) : (
				<CampaignResultActions
					campaign={campaign}
					isVictory={isVictory}
					onPrimaryAction={onPrimaryAction}
					onRetry={onRetry}
				/>
			)}
		</>
	);
}

function CampaignBossQuip({
	campaign,
	isAbandoned,
	isDraw,
	isVictory,
}: {
	readonly campaign: GameOverCampaignContext;
	readonly isAbandoned: boolean;
	readonly isDraw: boolean;
	readonly isVictory: boolean;
}) {
	if (isAbandoned || !isVictory || isDraw || !campaign.mission.bossQuips?.onVictory) return null;

	return (
		<motion.p
			className="cgo-boss-quip"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.6, duration: 1.0 }}
		>
			&ldquo;{campaign.mission.bossQuips.onVictory}&rdquo;
		</motion.p>
	);
}

function CampaignSubtitle({
	campaign,
	isDraw,
	isVictory,
}: {
	readonly campaign: GameOverCampaignContext;
	readonly isDraw: boolean;
	readonly isVictory: boolean;
}) {
	const copy = isDraw
		? 'Neither side can force a victory from the remaining board.'
		: isVictory
		? (campaign.mission.narrativeVictory ?? '')
		: (campaign.mission.narrativeDefeat ?? 'The enemy stands triumphant. But your story is not yet over...');

	return (
		<motion.p
			className="cgo-subtitle"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 1.0, duration: 0.8 }}
		>
			{copy}
		</motion.p>
	);
}

function CampaignNarrativeAfter({
	campaign,
	isVictory,
}: {
	readonly campaign: GameOverCampaignContext;
	readonly isVictory: boolean;
}) {
	if (!isVictory || !campaign.mission.narrativeAfter) return null;

	return (
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
	);
}

function CampaignStars({
	campaign,
	isVictory,
	playerTurnCount,
}: {
	readonly campaign: GameOverCampaignContext;
	readonly isVictory: boolean;
	readonly playerTurnCount: number;
}) {
	if (!isVictory) return null;

	return (
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
	);
}

function CampaignChapterSplash({
	campaign,
	isVictory,
}: {
	readonly campaign: GameOverCampaignContext;
	readonly isVictory: boolean;
}) {
	if (!isVictory || !campaign.mission.isChapterFinale) return null;

	return (
		<motion.div
			className="cgo-chapter-splash"
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 1.8, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
		>
			<div className="cgo-chapter-label">Chapter Complete</div>
			<div className="cgo-chapter-name">{campaign.chapter.name}</div>
		</motion.div>
	);
}

function CampaignRewardBlock({
	account,
	activeRewardFeedback,
	campaign,
	playerTurnCount,
	result,
	rewardCopy,
}: {
	readonly account: string | null;
	readonly activeRewardFeedback: ReturnType<typeof useCampaignStore.getState>['lastRewardFeedback'] | null;
	readonly campaign: GameOverCampaignContext;
	readonly playerTurnCount: number;
	readonly result: GameOverResult;
	readonly rewardCopy: NonNullable<ReturnType<typeof getCampaignResultRewardCopy>>;
}) {
	return (
		<motion.div
			className={`cgo-rewards cgo-rewards--${rewardCopy.tone}`}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 2.2, duration: 0.8 }}
		>
			<div className="cgo-reward-pill">
				{rewardCopy.label}
			</div>
			<p className="cgo-reward-note">{rewardCopy.detail}</p>
			<CeremonyEvidenceButton
				ceremony="campaign_reward"
				account={account}
				context={buildCampaignRewardEvidenceContext({
					campaignId: CAMPAIGN_ID,
					missionId: campaign.mission.id,
					localRunId: campaign.localRunId,
					difficulty: campaign.difficulty,
					result,
					playerTurnCount,
					rewardEvidence: activeRewardFeedback,
					location: 'campaign_game_over',
				})}
				className="cgo-evidence-btn"
			/>
		</motion.div>
	);
}

function CampaignResultActions({
	campaign,
	isVictory,
	onPrimaryAction,
	onRetry,
}: {
	readonly campaign: GameOverCampaignContext;
	readonly isVictory: boolean;
	readonly onPrimaryAction: () => void;
	readonly onRetry: () => void;
}) {
	const primaryLabel = isVictory && (campaign.mission.storyBridge?.length ?? 0) > 0
		? 'Continue the Saga'
		: 'Back to Campaign';

	return (
		<motion.div
			className="cgo-buttons"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 2.6, duration: 0.6 }}
		>
			<button
				type="button"
				onClick={onPrimaryAction}
				className="cgo-btn-primary hover:brightness-110 focus-visible:outline focus-visible:outline-2 active:translate-y-px"
			>
				{primaryLabel}
			</button>
			{!isVictory && (
				<button
					type="button"
					onClick={onRetry}
					className="cgo-btn-retry hover:brightness-110 focus-visible:outline focus-visible:outline-2 active:translate-y-px"
				>
					Retry Mission
				</button>
			)}
		</motion.div>
	);
}

export function CasualResultPanel({
	result,
	onPrimaryAction,
	abandonment = null,
}: {
	readonly result: GameOverResult;
	readonly onPrimaryAction: () => void;
	readonly abandonment?: AbandonmentState | null;
}) {
	const account = useNFTUsername();
	const activeMatch = useMatchStore(state => state.activeMatch);
	const isPeerMatch = activeMatch?.opponent.kind === 'peer';
	const runtime = getRagnarokNetworkConfig();
	const p2pQaRewardPreview = createP2PQaLocalRewardPreview({
		match: activeMatch,
		result,
		runtime,
		account,
	});

	if (abandonment) {
		return (
			<>
				<p className="cgo-subtitle">
					You left the battle. This run is closed locally as an abandoned defeat.
				</p>
				<AbandonedMatchActions abandonment={abandonment} />
			</>
		);
	}

	const primaryLabel = isPeerMatch ? 'New Opponent' : 'Play Again';

	return (
		<>
			<p className="cgo-subtitle">{getCasualResultSubtitle(result, isPeerMatch, runtime.stage)}</p>
			{isPeerMatch && (
				<P2PResultNotice
					preview={p2pQaRewardPreview}
					result={result}
				/>
			)}
			<RivalryBadge />
			<button
				type="button"
				onClick={onPrimaryAction}
				className="cgo-btn-primary hover:brightness-110 focus-visible:outline focus-visible:outline-2 active:translate-y-px"
			>
				{primaryLabel}
			</button>
		</>
	);
}

function AbandonedMatchActions({
	abandonment,
}: {
	readonly abandonment: AbandonmentState;
}) {
	return (
		<motion.div
			className="cgo-buttons cgo-abandon-actions"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 0.8, duration: 0.45 }}
		>
			<button
				type="button"
				onClick={abandonment.onHome}
				className="cgo-btn-primary hover:brightness-110 focus-visible:outline focus-visible:outline-2 active:translate-y-px"
			>
				Return Home
			</button>
			<p className="cgo-auto-home" aria-live="polite">
				Returning home in {abandonment.secondsRemaining}s
			</p>
		</motion.div>
	);
}

function getCasualResultSubtitle(
	result: GameOverResult,
	isPeerMatch: boolean,
	stage: RagnarokNetworkConfig['stage'],
): string {
	if (isPeerMatch) {
		if (stage === 'local') {
			if (result === 'draw') return 'Local relay QA draw. No Hive result was written.';
			if (result === 'victory') return 'You won this local relay QA match. No Hive XP or RUNE was written.';
			return 'You lost this local relay QA match. No Hive XP or RUNE was written.';
		}
		if (stage === 'mainnet') {
			if (result === 'draw') return 'The peer match ended in a draw.';
			if (result === 'victory') return 'You won this peer match.';
			return 'You lost this peer match.';
		}
		if (result === 'draw') return 'Local testnet draw. Neither king was forced; this is not a ranked Hive result.';
		if (result === 'victory') return 'You won. The amounts below are the testnet calculation, not a Hive credit.';
		return 'You lost this local testnet match. No Hive XP or RUNE was written.';
	}
	if (result === 'draw') return 'The remaining board cannot produce a forced win.';
	if (result === 'victory') return 'Checkmate! The enemy King has no escape.';
	return 'Checkmate... Your King has been cornered.';
}

function P2PResultNotice({
	preview,
	result,
}: {
	readonly preview: P2PQaLocalRewardPreview | null;
	readonly result: GameOverResult;
}) {
	if (preview) {
		return (
			<>
				<P2PQaRewardPreviewPanel preview={preview} />
				<P2PTesterRules />
			</>
		);
	}

	return (
		<>
			<p className="cgo-p2p-result-note">
				P2P result: {getP2PResultLabel(result)}. Local result only — no Hive write.
			</p>
			<P2PTesterRules />
		</>
	);
}

function P2PTesterRules() {
	return (
		<ul className="cgo-p2p-rules" aria-label="Testnet combat rules">
			<li>Pawn or King captures, and any capture of a pawn, resolve instantly. Kings cannot be taken.</li>
			<li>Other hero collisions go to poker. There is no mulligan; the hand starts at First Blood.</li>
			<li>A poker draw leaves both pieces alive and the attacker does not take the square.</li>
		</ul>
	);
}

function getP2PResultLabel(result: GameOverResult): string {
	if (result === 'draw') return 'draw';
	if (result === 'victory') return 'you won';
	return 'you lost';
}

function P2PQaRewardPreviewPanel({
	preview,
}: {
	readonly preview: P2PQaLocalRewardPreview;
}) {
	return (
		<motion.div
			className="cgo-p2p-qa-preview"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.75, duration: 0.45 }}
		>
			<div className="cgo-p2p-qa-preview__header">
				<span>{preview.label}</span>
				<span>{preview.scope === 'qa_local' ? 'local qa' : 'local testnet'}</span>
			</div>
			<div className="cgo-p2p-qa-preview__values" aria-label={preview.label}>
				<span>
					<strong>{formatRewardAmount(preview.runeShown)}</strong>
					RUNE
				</span>
				<span>
					<strong>{formatRewardAmount(preview.matchXpShown)}</strong>
					Match XP
				</span>
				<span>
					<strong>{preview.cardXpShown}</strong>
					CardXP
				</span>
			</div>
			<p>{preview.persistence} {preview.settlementNote}</p>
		</motion.div>
	);
}

function formatRewardAmount(value: number): string {
	return value > 0 ? `+${value}` : String(value);
}

function RivalryBadge() {
	const rivals = useRivalryStore(state => state.rivals);
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
