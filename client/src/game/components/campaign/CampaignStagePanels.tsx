import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Play, Swords } from 'lucide-react';
import { Button } from '../../../components/ui-norse';
import { useCampaignStore } from '../../campaign';
import type { CampaignChapter, CampaignMission, CampaignReward, Difficulty } from '../../campaign/campaignTypes';
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
			className={`${SURFACE_STRONG_CLASS} pointer-events-auto w-full max-w-[640px] p-6 sm:p-7 text-center`}
		>
			<p className={KICKER_CLASS}>Chapter Theater</p>
			<h2 className={`mt-2 font-display text-2xl sm:text-3xl font-bold tracking-[0.04em] uppercase ${accentClass}`}>
				{chapter.name}
			</h2>
			<p className="mt-3 text-[14px] leading-relaxed text-ink-200">
				{chapter.description}
			</p>

			<div className={`${SURFACE_CLASS} mt-5 text-left`}>
				<p className={`${KICKER_CLASS} text-left`}>Next Scene</p>
				<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">
					{nextMission ? nextMission.name : 'This chapter is currently cleared.'}
				</p>
				<p className="mt-2 text-[13px] leading-relaxed text-ink-300">
					{nextMission
						? `${nextMission.description} Select a realm to inspect the route, or move straight into the authored briefing from here.`
						: 'Replay the prologue, revisit completed fights, or move through the realm map to review pacing and rewards.'}
				</p>
			</div>

			<div className="mt-6 flex flex-wrap justify-center gap-2.5">
				<Button variant="default" size="default" onClick={onPlayPrologue}>
					{prologueSeen ? 'Replay Prologue' : 'Play Prologue'}
				</Button>
				{nextMission && (
					<Button variant="primary" size="default" onClick={onStageNextBattle}>
						<Play size={13} strokeWidth={2.4} fill="currentColor" />
						Stage Next Battle
					</Button>
				)}
			</div>

			<p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">
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
	const completed = useCampaignStore(state => state.completedMissions[mission.id]);
	const encounterTone = getEncounterTone(mission);
	const phaseCount = mission.bossPhases?.length ?? 0;
	const bridgeCount = mission.storyBridge?.length ?? 0;

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
						<div className={SURFACE_CLASS}>
							<p className={`${KICKER_CLASS} text-left`}>Encounter Tone</p>
							<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">{encounterTone}</p>
							<p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">
								{mission.bossRules.length > 0
									? `${mission.bossRules.length} authored boss rule${mission.bossRules.length === 1 ? '' : 's'} shape this fight.`
									: 'No special boss rules. Emphasis is route clarity and combat rhythm.'}
							</p>
						</div>
						<div className={SURFACE_CLASS}>
							<p className={`${KICKER_CLASS} text-left`}>Campaign Record</p>
							{completed ? (
								<>
									<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">
										{completed.bestTurns} turns
									</p>
									<p className="mt-1 text-[12.5px] text-ink-300">
										Best clear on {completed.bestDifficulty}
									</p>
								</>
							) : (
								<>
									<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">First clear pending</p>
									<p className="mt-1 text-[12.5px] text-ink-300">
										Normal is the cleanest first route through this fight.
									</p>
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Opening beat — quote */}
			<div className={`${SURFACE_CLASS} mt-5 border-l-2 border-l-gold-300/50`}>
				<p className={`${KICKER_CLASS} text-left`}>Opening Beat</p>
				<p className="mt-3 font-display text-base sm:text-[17px] italic leading-[1.7] text-ink-100">
					"{mission.narrativeBefore}"
				</p>
			</div>

			{/* Briefing 3-up */}
			<div className="mt-5 grid gap-3 lg:grid-cols-3">
				<div className={SURFACE_CLASS}>
					<p className={`${KICKER_CLASS} text-left`}>Combat Rhythm</p>
					<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">
						{phaseCount > 0 ? `${phaseCount} escalation beat${phaseCount === 1 ? '' : 's'}` : 'Single-beat combat pass'}
					</p>
					<p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">
						{phaseCount > 0
							? 'Expect the opponent to shift tempo mid-fight. Learn the thresholds once, then push harder on later clears.'
							: 'This mission leans on clean board pressure rather than multi-stage boss theatrics.'}
					</p>
				</div>

				<div className={SURFACE_CLASS}>
					<p className={`${KICKER_CLASS} text-left`}>Aftermath</p>
					<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">
						{bridgeCount > 0 ? `${bridgeCount} bridge scene${bridgeCount === 1 ? '' : 's'}` : 'Direct return to campaign'}
					</p>
					<p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">
						{bridgeCount > 0
							? 'A short connective cinematic carries the win forward into the next chapter beat before you return to the map.'
							: 'Results flow straight back to the campaign shell with no additional bridge scene.'}
					</p>
				</div>

				<div className={SURFACE_CLASS}>
					<p className={`${KICKER_CLASS} text-left`}>Launch Sequence</p>
					<ol className="mt-3 space-y-2 text-[13px] text-ink-200">
						<li className="flex gap-2"><span className="font-mono text-ink-400">01</span> Chapter prologue establishes the arc.</li>
						<li className="flex gap-2"><span className="font-mono text-ink-400">02</span> This briefing locks tone & difficulty.</li>
						<li className="flex gap-2"><span className="font-mono text-ink-400">03</span> Battle launches into chess + poker flow.</li>
					</ol>
				</div>
			</div>

			{/* Boss rules — danger surface */}
			{mission.bossRules.length > 0 && (
				<div className={`${SURFACE_CLASS} mt-5 border-ember-300/30 bg-ember-300/[0.05]`}>
					<p className={`${KICKER_CLASS} text-left text-ember-200`}>Boss Rules</p>
					<div className="mt-3 space-y-2">
						{mission.bossRules.map((rule, index) => (
							<p key={index} className="text-[13px] leading-relaxed text-ember-100/95">
								{rule.description}
							</p>
						))}
					</div>
				</div>
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
								className={`text-left rounded-xl border p-4 transition-all duration-200 ${
									active
										? 'border-gold-300/50 bg-linear-to-b from-gold-300/[0.10] to-gold-300/[0.04] shadow-[inset_0_1px_0_rgba(245,237,224,0.06)]'
										: 'border-obsidian-700 bg-obsidian-900/60 hover:border-gold-600/50 hover:bg-obsidian-800/70'
								}`}
							>
								<div className="flex items-center justify-between gap-3">
									<div className="text-left min-w-0">
										<p className={`font-display text-sm font-bold tracking-wide uppercase ${active ? 'text-gold-200' : 'text-ink-0'}`}>
											{option}
										</p>
										<p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">
											{DIFFICULTY_META[option].label}
										</p>
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
			<div className={`${SURFACE_CLASS} mt-5`}>
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="min-w-0">
						<p className={`${KICKER_CLASS} text-left`}>Rewards on Clear</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{mission.rewards.map((reward, index) => (
								<span key={index} className={PILL_CLASS}>
									{describeReward(reward)}
								</span>
							))}
						</div>
					</div>

					<Button
						variant="primary"
						size="lg"
						className="whitespace-nowrap"
						onClick={() => onStart(difficulty)}
					>
						<Play size={14} strokeWidth={2.4} fill="currentColor" />
						Enter Battle
					</Button>
				</div>
			</div>
		</motion.div>
	);
}
