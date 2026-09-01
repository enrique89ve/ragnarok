import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Play, Swords } from 'lucide-react';
import { Button } from '../../../components/ui-norse';
import { buildCampaignRewardEvidenceContext, getCampaignBriefingRewardCopy, useCampaignStore } from '../../campaign';
import type { CampaignChapter, CampaignMission, Difficulty } from '../../campaign/campaignTypes';
import { getCampaignFirstClearRuneReward, TESTNET_RUNE_ECONOMY } from '@shared/protocol-core/runeEconomy';
import { buildRagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import { CAMPAIGN_ID } from '@shared/campaign/constants';
import { getRagnarokNetworkConfig } from '../../config/networkConfig';
import CeremonyEvidenceButton from '../CeremonyEvidenceButton';
import { useNFTUsername } from '../../nft/hooks';
import {
	KICKER_CLASS,
	DISPLAY_TITLE_CLASS,
	SURFACE_CLASS,
	SURFACE_STRONG_CLASS,
	PILL_CLASS,
} from './CampaignPage';

const DIFFICULTY_META: Record<Difficulty, { label: string; blurb: string }> = {
	normal: {
		label: 'Clean First Clear',
		blurb: 'Recommended route for learning the board, boss timing, and mission rhythm.',
	},
	heroic: {
		label: 'Pressure Rises',
		blurb: 'Tighter boss pacing and a more demanding mid-combat escalation pass.',
	},
	mythic: {
		label: 'No Safety Net',
		blurb: 'Full-intensity boss pressure for players who already know the encounter.',
	},
};

const BRIEFING_SYMBOLS = {
	tone: 'T',
	record: 'R',
	boss: '!',
	reward: '+',
};

const DIFFICULTY_SYMBOLS: Record<Difficulty, string> = {
	normal: 'I',
	heroic: 'II',
	mythic: 'III',
};

function getEncounterTone(mission: CampaignMission): string {
	if (mission.isChapterFinale) return 'Final confrontation';
	if (mission.bossRules.length > 0) return 'Boss encounter';
	return 'Campaign advance';
}

function BriefingSigil({
	children,
	tone = 'gold',
}: {
	children: React.ReactNode;
	tone?: 'gold' | 'ember' | 'bifrost' | 'rune';
}) {
	return (
		<span className={`campaign-card-sigil campaign-card-sigil-${tone}`} aria-hidden="true">
			{children}
		</span>
	);
}

function BriefingCard({
	label,
	title,
	children,
	symbol,
	tone = 'gold',
	className = '',
}: {
	label: string;
	title: string;
	children: React.ReactNode;
	symbol: React.ReactNode;
	tone?: 'gold' | 'ember' | 'bifrost' | 'rune';
	className?: string;
}) {
	return (
		<div className={`${SURFACE_CLASS} campaign-brief-card runic-panel ${className}`}>
			<span className="runic-corners" aria-hidden="true" />
			<span className="runic-corners-extra" aria-hidden="true" />
			<div className="campaign-card-heading">
				<BriefingSigil tone={tone}>{symbol}</BriefingSigil>
				<div className="min-w-0">
					<p className={`${KICKER_CLASS} text-left`}>{label}</p>
					<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">{title}</p>
				</div>
			</div>
			<div className="campaign-card-body">
				{children}
			</div>
		</div>
	);
}

interface MapIntroCardProps {
	chapter: CampaignChapter;
	nextMission: CampaignMission | null;
	onPlayPrologue: () => void;
	onStageNextBattle: () => void;
	primaryLabel: string;
	prologueSeen: boolean;
	accentClass: string;
}

export function MapIntroCard({
	chapter,
	nextMission,
	onPlayPrologue,
	onStageNextBattle,
	primaryLabel,
	prologueSeen,
	accentClass,
}: MapIntroCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 18 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
			className={`${SURFACE_STRONG_CLASS} pointer-events-auto w-full max-w-[640px] p-4 text-center sm:p-7`}
		>
			<p className={KICKER_CLASS}>Chapter Theater</p>
			<h2 className={`mt-2 font-display text-xl font-bold tracking-[0.04em] uppercase sm:text-3xl ${accentClass}`}>
				{chapter.name}
			</h2>
			<p className="mt-3 hidden text-[14px] leading-relaxed text-ink-200 sm:block">
				{chapter.description}
			</p>

			<div className={`${SURFACE_CLASS} mt-4 text-left sm:mt-5`}>
				<p className={`${KICKER_CLASS} text-left`}>Next Scene</p>
				<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">
					{nextMission ? nextMission.name : 'This chapter is currently cleared.'}
				</p>
				<p className="mt-2 hidden text-[13px] leading-relaxed text-ink-300 sm:block">
					{nextMission
						? nextMission.description
						: 'Replay the prologue, revisit completed fights, or move through the realm map to review pacing and rewards.'}
				</p>
			</div>

			<div className="mt-4 flex flex-col justify-center gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap">
				<Button variant="default" size="default" className="w-full sm:w-auto" onClick={onPlayPrologue}>
					{prologueSeen ? 'Replay Prologue' : 'Play Prologue'}
				</Button>
				{nextMission && (
					<Button variant="primary" size="default" className="w-full sm:w-auto" onClick={onStageNextBattle}>
						<Play size={13} strokeWidth={2.4} fill="currentColor" />
						{primaryLabel}
					</Button>
				)}
			</div>

			<p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">
				Swipe to explore realms · select a realm to inspect its missions.
			</p>
		</motion.div>
	);
}

interface MissionBriefingProps {
	mission: CampaignMission;
	chapter: CampaignChapter;
	onStart: (difficulty: Difficulty) => void | Promise<void>;
	onBack: () => void;
	onWatchPrologue: () => void;
	accentClass: string;
}

export function MissionBriefing({
	mission,
	chapter,
	onStart,
	onBack,
	onWatchPrologue,
	accentClass,
}: MissionBriefingProps) {
	const [difficulty, setDifficulty] = useState<Difficulty>('normal');
	const [isStarting, setIsStarting] = useState(false);
	const [startError, setStartError] = useState<string | null>(null);
	const completed = useCampaignStore(state => state.completedMissions[mission.id]);
	const account = useNFTUsername();
	const encounterTone = getEncounterTone(mission);
	const firstClearRune = getCampaignFirstClearRuneReward(mission.id);
	const rewardCopy = getCampaignBriefingRewardCopy({
		completed: Boolean(completed),
		firstClearRune,
		campaignRuneCap: TESTNET_RUNE_ECONOMY.maxCampaignRunePerAccount,
		policy: buildRagnarokRuntimeEvidence(getRagnarokNetworkConfig()).phasePolicy,
	});
	const handleStart = async () => {
		if (isStarting) return;
		setIsStarting(true);
		setStartError(null);
		try {
			await onStart(difficulty);
		} catch (error) {
			setStartError(error instanceof Error ? error.message : 'Battle setup could not be saved.');
			setIsStarting(false);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 22 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
			className="mx-auto max-w-[1120px]"
		>
			{/* Top action row */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<button
					type="button"
					onClick={onBack}
					className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.18em] uppercase font-bold text-ink-300 hover:text-gold-300 transition-colors"
				>
					<ChevronLeft size={13} strokeWidth={2.2} />
					Back to Map
				</button>
				{chapter.cinematicIntro && (
					<Button variant="default" size="sm" onClick={onWatchPrologue}>
						Replay Chapter Prologue
					</Button>
				)}
			</div>

			{/* Hero brief surface */}
			<div className={`${SURFACE_STRONG_CLASS} relative mt-5 overflow-hidden p-5 sm:p-7`}>
				<div
					aria-hidden
					className="absolute inset-0 pointer-events-none opacity-60"
					style={{
						background:
							'radial-gradient(ellipse 60% 40% at 90% 0%, rgba(221,184,74,0.16), transparent 65%),' +
							'radial-gradient(ellipse 35% 25% at 10% 100%, rgba(122,169,255,0.10), transparent 70%)',
					}}
				/>

				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0">
						<div className="inline-flex items-center gap-2.5">
							<Swords size={14} className="text-gold-300" strokeWidth={1.8} />
							<span className={KICKER_CLASS}>Mission Briefing</span>
						</div>
						<h2 className={`${DISPLAY_TITLE_CLASS} mt-2 ${accentClass}`}>
							{mission.name}
						</h2>
						<p className="mt-2 font-mono text-[11px] tracking-[0.16em] uppercase text-ink-300">
							{chapter.name} · Mission {mission.missionNumber}
						</p>
						<p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-200">
							{mission.description}
						</p>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 lg:w-[20rem] lg:grid-cols-1">
						<BriefingCard
							label="Encounter Tone"
							title={encounterTone}
							symbol={BRIEFING_SYMBOLS.tone}
							tone={mission.isChapterFinale ? 'ember' : mission.bossRules.length > 0 ? 'bifrost' : 'gold'}
						>
							<p className="text-[12.5px] leading-relaxed text-ink-300">
								{mission.bossRules.length > 0
									? `${mission.bossRules.length} authored boss rule${mission.bossRules.length === 1 ? '' : 's'} shape this fight.`
									: 'No special boss rules. Emphasis is route clarity and combat rhythm.'}
							</p>
						</BriefingCard>
						<BriefingCard
							label="Campaign Record"
							title={completed ? `${completed.bestTurns} turns` : 'First clear pending'}
							symbol={completed ? '✓' : BRIEFING_SYMBOLS.record}
							tone={completed ? 'rune' : 'gold'}
						>
							{completed ? (
								<p className="text-[12.5px] text-ink-300">
									Best clear on {completed.bestDifficulty}
								</p>
							) : (
								<p className="text-[12.5px] text-ink-300">
									Normal is the cleanest first route through this fight.
								</p>
							)}
						</BriefingCard>
					</div>
				</div>
			</div>

			{/* Boss rules — danger surface */}
			{mission.bossRules.length > 0 && (
				<BriefingCard
					label="Boss Rules"
					title="Encounter modifiers"
					symbol={BRIEFING_SYMBOLS.boss}
					tone="ember"
					className="mt-5 border-ember-300/30 bg-ember-300/[0.05]"
				>
					<div className="space-y-2">
						{mission.bossRules.map((rule, index) => (
							<p key={index} className="text-[13px] leading-relaxed text-ember-100/95">
								{rule.description}
							</p>
						))}
					</div>
				</BriefingCard>
			)}

			{/* Difficulty picker */}
			<div className="mt-5">
				<p className={`${KICKER_CLASS} text-left`}>Difficulty</p>
				<div className="mt-3 grid gap-3 lg:grid-cols-3">
					{(['normal', 'heroic', 'mythic'] as Difficulty[]).map(option => {
						const active = difficulty === option;
						return (
							<button
								key={option}
								type="button"
								onClick={() => setDifficulty(option)}
									className={`campaign-difficulty-card text-left rounded-xl border p-4 transition-[background-color,border-color,box-shadow] duration-200 ${
									active
										? 'border-gold-300/50 bg-linear-to-b from-gold-300/[0.10] to-gold-300/[0.04] shadow-[inset_0_1px_0_rgba(245,237,224,0.06)]'
										: 'border-obsidian-700 bg-obsidian-900/60 hover:border-gold-600/50 hover:bg-obsidian-800/70'
								}`}
							>
								<div className="flex items-center justify-between gap-3">
									<div className="flex min-w-0 items-center gap-3 text-left">
										<BriefingSigil tone={option === 'mythic' ? 'ember' : option === 'heroic' ? 'bifrost' : 'gold'}>
											{DIFFICULTY_SYMBOLS[option]}
										</BriefingSigil>
										<div className="min-w-0">
											<p className={`font-display text-sm font-bold tracking-wide uppercase ${active ? 'text-gold-200' : 'text-ink-0'}`}>
												{option}
											</p>
											<p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">
												{DIFFICULTY_META[option].label}
											</p>
										</div>
									</div>
									<div
										className={`h-3 w-3 rounded-full shrink-0 ${
											active ? 'bg-gold-300 shadow-[0_0_10px_-1px_rgba(221,184,74,0.7)]' : 'bg-obsidian-700'
										}`}
									/>
								</div>
								<p className="mt-3 text-[12.5px] leading-relaxed text-ink-300">
									{DIFFICULTY_META[option].blurb}
								</p>
							</button>
						);
					})}
				</div>
			</div>

			{/* Rewards + Enter Battle */}
			<div className={`${SURFACE_CLASS} campaign-brief-card campaign-reward-card runic-panel mt-5`}>
				<span className="runic-corners" aria-hidden="true" />
				<span className="runic-corners-extra" aria-hidden="true" />
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="campaign-card-heading min-w-0">
						<BriefingSigil tone="rune">{BRIEFING_SYMBOLS.reward}</BriefingSigil>
						<div className="min-w-0">
							<p className={`${KICKER_CLASS} text-left`}>Rewards on Clear</p>
							<div className="mt-3 flex flex-wrap gap-2">
								<span className={PILL_CLASS}>{rewardCopy.label}</span>
							</div>
							<p className="mt-2 max-w-[58ch] text-xs leading-relaxed opacity-70">{rewardCopy.detail}</p>
							<p className="mt-1 text-xs opacity-70">{rewardCopy.capDetail}</p>
						</div>
					</div>

					<div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
						<Button
							variant="primary"
							size="lg"
							className="relative z-10 whitespace-nowrap"
							aria-label="Enter Battle"
							onClick={() => void handleStart()}
							disabled={isStarting}
						>
							<Play size={14} strokeWidth={2.4} fill="currentColor" aria-hidden="true" />
							{isStarting ? 'Preparing Battle' : 'Enter Battle'}
						</Button>
						<CeremonyEvidenceButton
							ceremony="campaign_reward"
							account={account}
							context={buildCampaignRewardEvidenceContext({
								campaignId: CAMPAIGN_ID,
								missionId: mission.id,
								localRunId: null,
								difficulty,
								completed: Boolean(completed),
								firstClearRune,
								rewardEvidence: null,
		location: 'campaign_mission_briefing',
		})}
							className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-obsidian-700 bg-obsidian-900/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-200"
						/>
					</div>
					{startError && (
						<p className="mt-3 text-right text-xs text-ember-200" role="alert">
							{startError}
						</p>
					)}
				</div>
			</div>
		</motion.div>
	);
}
