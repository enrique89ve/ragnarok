import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCampaignStore } from '../../campaign';
import type { CampaignChapter, CampaignMission, CampaignReward, Difficulty } from '../../campaign/campaignTypes';

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

function describeReward(reward: CampaignReward): string {
	switch (reward.type) {
		case 'rune':
			return `${reward.amount ?? 0} Rune`;
		case 'card':
			return `Card #${reward.cardId ?? '?'}`;
		case 'pack':
			return `${reward.amount ?? 0} Packs`;
		case 'eitr':
			return `${reward.amount ?? 0} Eitr`;
		default:
			return 'Campaign Reward';
	}
}

function getEncounterTone(mission: CampaignMission): string {
	if (mission.isChapterFinale) return 'Final confrontation';
	if (mission.bossRules.length > 0) return 'Boss encounter';
	return 'Campaign advance';
}

interface MapIntroCardProps {
	chapter: CampaignChapter;
	nextMission: CampaignMission | null;
	onPlayPrologue: () => void;
	onStageNextBattle: () => void;
	prologueSeen: boolean;
	accentClass: string;
}

export function MapIntroCard({
	chapter,
	nextMission,
	onPlayPrologue,
	onStageNextBattle,
	prologueSeen,
	accentClass,
}: MapIntroCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 18 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
			className="constellation-intro-copy"
		>
			<p className="campaign-kicker">Chapter Theater</p>
			<h2 className={`campaign-display-title ${accentClass}`}>
				{chapter.name}
			</h2>
			<p className="mt-3 text-sm leading-relaxed text-gray-300 sm:text-[15px]">
				{chapter.description}
			</p>

			<div className="campaign-surface-strong mt-5 text-left">
				<p className="campaign-kicker text-left">Next Scene</p>
				<p className="mt-2 text-lg font-semibold text-gray-100">
					{nextMission ? nextMission.name : 'This chapter is currently cleared.'}
				</p>
				<p className="mt-2 text-sm leading-relaxed text-gray-400">
					{nextMission
						? `${nextMission.description} Select a realm to inspect the route, or move straight into the authored briefing from here.`
						: 'Replay the prologue, revisit completed fights, or move through the realm map to review pacing and rewards.'}
				</p>
			</div>

			<div className="constellation-intro-actions">
				<button type="button" className="campaign-secondary-btn" onClick={onPlayPrologue}>
					{prologueSeen ? 'Replay Prologue' : 'Play Prologue'}
				</button>
				{nextMission && (
					<button type="button" className="campaign-primary-btn" onClick={onStageNextBattle}>
						Stage Next Battle
					</button>
				)}
			</div>

			<p className="mt-4 text-xs uppercase tracking-[0.18em] text-gray-500">
				Select a realm to inspect missions, route order, and rewards.
			</p>
		</motion.div>
	);
}

interface MissionBriefingProps {
	mission: CampaignMission;
	chapter: CampaignChapter;
	onStart: (difficulty: Difficulty) => void;
	onBack: () => void;
	onWatchPrologue: () => void;
	accentClass: string;
	panelClass: string;
}

export function MissionBriefing({
	mission,
	chapter,
	onStart,
	onBack,
	onWatchPrologue,
	accentClass,
	panelClass,
}: MissionBriefingProps) {
	const [difficulty, setDifficulty] = useState<Difficulty>('normal');
	const completed = useCampaignStore(state => state.completedMissions[mission.id]);
	const encounterTone = getEncounterTone(mission);
	const phaseCount = mission.bossPhases?.length ?? 0;
	const bridgeCount = mission.storyBridge?.length ?? 0;

	return (
		<motion.div
			initial={{ opacity: 0, y: 22 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
			className="campaign-briefing-shell"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<button type="button" onClick={onBack} className="campaign-secondary-btn">
					Back to Map
				</button>
				{chapter.cinematicIntro && (
					<button type="button" onClick={onWatchPrologue} className="campaign-secondary-btn">
						Replay Chapter Prologue
					</button>
				)}
			</div>

			<div className={`campaign-surface-strong mt-5 border ${panelClass}`}>
				<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0">
						<p className="campaign-kicker">Mission Briefing</p>
						<h2 className={`mt-2 campaign-display-title ${accentClass}`}>
							{mission.name}
						</h2>
						<p className="mt-2 text-sm text-gray-400 sm:text-[15px]">
							{chapter.name} · Mission {mission.missionNumber}
						</p>
						<p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-300 sm:text-[15px]">
							{mission.description}
						</p>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 lg:w-[20rem] lg:grid-cols-1">
						<div className="campaign-surface">
							<p className="campaign-kicker text-left">Encounter Tone</p>
							<p className="mt-2 text-base font-semibold text-gray-100">{encounterTone}</p>
							<p className="mt-1 text-sm text-gray-400">
								{mission.bossRules.length > 0
									? `${mission.bossRules.length} authored boss rule${mission.bossRules.length === 1 ? '' : 's'} shape this fight.`
									: 'No special boss rules. The emphasis is route clarity and combat rhythm.'}
							</p>
						</div>
						<div className="campaign-surface">
							<p className="campaign-kicker text-left">Campaign Record</p>
							{completed ? (
								<>
									<p className="mt-2 text-base font-semibold text-gray-100">
										{completed.bestTurns} turns
									</p>
									<p className="mt-1 text-sm text-gray-400">
										Best clear on {completed.bestDifficulty}
									</p>
								</>
							) : (
								<>
									<p className="mt-2 text-base font-semibold text-gray-100">First clear pending</p>
									<p className="mt-1 text-sm text-gray-400">
										Normal is the cleanest first route through this fight.
									</p>
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="campaign-surface mt-5">
				<p className="campaign-kicker text-left">Opening Beat</p>
				<p className="mt-3 text-base italic leading-8 text-gray-200 sm:text-[17px]">
					"{mission.narrativeBefore}"
				</p>
			</div>

			<div className="campaign-briefing-grid mt-5">
				<div className="campaign-surface">
					<p className="campaign-kicker text-left">Combat Rhythm</p>
					<p className="mt-2 text-base font-semibold text-gray-100">
						{phaseCount > 0 ? `${phaseCount} escalation beat${phaseCount === 1 ? '' : 's'}` : 'Single-beat combat pass'}
					</p>
					<p className="mt-2 text-sm leading-relaxed text-gray-400">
						{phaseCount > 0
							? 'Expect the opponent to shift tempo mid-fight. Learn the thresholds once, then push harder on later clears.'
							: 'This mission leans on clean board pressure rather than multi-stage boss theatrics.'}
					</p>
				</div>

				<div className="campaign-surface">
					<p className="campaign-kicker text-left">Aftermath</p>
					<p className="mt-2 text-base font-semibold text-gray-100">
						{bridgeCount > 0 ? `${bridgeCount} bridge scene${bridgeCount === 1 ? '' : 's'}` : 'Direct return to campaign'}
					</p>
					<p className="mt-2 text-sm leading-relaxed text-gray-400">
						{bridgeCount > 0
							? 'A short connective cinematic carries the win forward into the next chapter beat before you return to the map.'
							: 'Results flow straight back to the campaign shell with no additional bridge scene.'}
					</p>
				</div>

				<div className="campaign-surface">
					<p className="campaign-kicker text-left">Launch Sequence</p>
					<div className="mt-3 space-y-2 text-sm text-gray-300">
						<p><span className="text-gray-500">01</span> Chapter prologue establishes the arc.</p>
						<p><span className="text-gray-500">02</span> This briefing locks the mission tone and difficulty.</p>
						<p><span className="text-gray-500">03</span> Battle launches directly into the chess and poker flow.</p>
					</div>
				</div>
			</div>

			{mission.bossRules.length > 0 && (
				<div className="campaign-surface mt-5 border border-red-500/[0.18] bg-red-500/[0.06]">
					<p className="campaign-kicker text-left text-red-200">Boss Rules</p>
					<div className="mt-3 space-y-2">
						{mission.bossRules.map((rule, index) => (
							<p key={index} className="text-sm leading-relaxed text-red-100/90">
								{rule.description}
							</p>
						))}
					</div>
				</div>
			)}

			<div className="mt-5">
				<p className="campaign-kicker text-left">Difficulty</p>
				<div className="campaign-difficulty-grid mt-3">
					{(['normal', 'heroic', 'mythic'] as Difficulty[]).map(option => (
						<button
							key={option}
							type="button"
							onClick={() => setDifficulty(option)}
							className={`campaign-difficulty-card ${difficulty === option ? 'campaign-difficulty-card-active' : ''}`}
						>
							<div className="flex items-center justify-between gap-3">
								<div className="text-left">
									<p className="text-sm font-semibold text-gray-100">
										{option.charAt(0).toUpperCase() + option.slice(1)}
									</p>
									<p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">
										{DIFFICULTY_META[option].label}
									</p>
								</div>
								<div className={`h-3 w-3 rounded-full ${difficulty === option ? 'bg-amber-300' : 'bg-white/[0.12]'}`} />
							</div>
							<p className="mt-3 text-sm leading-relaxed text-gray-400">
								{DIFFICULTY_META[option].blurb}
							</p>
						</button>
					))}
				</div>
			</div>

			<div className="campaign-surface mt-5">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="min-w-0">
						<p className="campaign-kicker text-left">Rewards on Clear</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{mission.rewards.map((reward, index) => (
								<span key={index} className="campaign-pill">
									{describeReward(reward)}
								</span>
							))}
						</div>
					</div>

					<button type="button" onClick={() => onStart(difficulty)} className="campaign-primary-btn whitespace-nowrap">
						Enter Battle
					</button>
				</div>
			</div>
		</motion.div>
	);
}
