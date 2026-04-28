/*
  MissionIntroPhase — narrative briefing that runs between the chapter
  cinematic (or campaign entry) and the chess board. Self-contained:
  owns its REALM constants because they are only meaningful here, owns
  its motion choreography, and exposes a single `onComplete` callback
  the coordinator wires to dispatch INTRO_DONE.

  The component reads from the full `CampaignMission` shape because it
  needs realm, name, missionNumber, narrativeBefore, isChapterFinale,
  and bossRules. Trimming that to a minimal DTO would just churn types
  without actually decoupling — the briefing IS a campaign concern.

  Lazy-loaded by the coordinator so non-campaign routes do not bundle
  the briefing UI or framer-motion choreography.
*/

import React from 'react';
import { motion } from 'framer-motion';
import type { CampaignMission } from '../../../campaign/campaignTypes';

const REALM_ICONS: Record<string, string> = {
	asgard: '\u2728', niflheim: '\u2744\uFE0F', muspelheim: '\uD83D\uDD25',
	helheim: '\uD83D\uDC80', jotunheim: '\u26F0\uFE0F', alfheim: '\uD83C\uDF3F',
	vanaheim: '\uD83C\uDF3E', svartalfheim: '\u2692\uFE0F', ginnungagap: '\uD83C\uDF0C',
	midgard: '\uD83C\uDFDB\uFE0F', chaos: '\uD83C\uDF00', tartarus: '\u26D3\uFE0F',
	mount_othrys: '\u26F0\uFE0F', olympus: '\u26A1', athens: '\uD83C\uDFDB\uFE0F',
};

const REALM_COLORS: Record<string, string> = {
	asgard: 'rgba(255, 215, 0, 0.08)', niflheim: 'rgba(100, 180, 255, 0.08)',
	muspelheim: 'rgba(255, 80, 20, 0.1)', helheim: 'rgba(100, 255, 100, 0.06)',
	jotunheim: 'rgba(140, 200, 255, 0.07)', alfheim: 'rgba(180, 140, 255, 0.07)',
	vanaheim: 'rgba(100, 200, 100, 0.07)', svartalfheim: 'rgba(200, 150, 50, 0.07)',
	ginnungagap: 'rgba(100, 50, 200, 0.06)', midgard: 'rgba(180, 160, 120, 0.06)',
	chaos: 'rgba(150, 50, 50, 0.08)', tartarus: 'rgba(80, 0, 0, 0.1)',
	mount_othrys: 'rgba(200, 150, 50, 0.08)', olympus: 'rgba(255, 215, 0, 0.08)',
};

const REALM_TEXT_COLORS: Record<string, string> = {
	asgard: '#ffd700', niflheim: '#7dd3fc', muspelheim: '#f97316',
	helheim: '#4ade80', jotunheim: '#93c5fd', alfheim: '#c084fc',
	vanaheim: '#86efac', svartalfheim: '#fbbf24', ginnungagap: '#a78bfa',
	midgard: '#d4a574', chaos: '#ef4444', tartarus: '#dc2626',
	mount_othrys: '#f59e0b', olympus: '#fcd34d',
};

const DEFAULT_REALM_COLOR = 'rgba(201, 164, 76, 0.08)';
const DEFAULT_REALM_TEXT = '#c9a44c';
const DEFAULT_REALM_ICON = '\u2694\uFE0F';

export type MissionIntroPhaseProps = {
	readonly mission: CampaignMission;
	readonly chapterName: string;
	readonly onComplete: () => void;
};

const MissionIntroPhase: React.FC<MissionIntroPhaseProps> = ({
	mission,
	chapterName,
	onComplete,
}) => {
	const realmKey = mission.realm ?? '';
	const realmColor = REALM_COLORS[realmKey] ?? DEFAULT_REALM_COLOR;
	const realmText = REALM_TEXT_COLORS[realmKey] ?? DEFAULT_REALM_TEXT;
	const realmIcon = REALM_ICONS[realmKey] ?? DEFAULT_REALM_ICON;

	return (
		<div
			className="mission-intro-overlay"
			style={{
				'--realm-color': realmColor,
				'--realm-text': realmText,
			} as React.CSSProperties}
			role="button"
			tabIndex={0}
			onClick={onComplete}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onComplete();
				}
			}}
		>
			<div className="mission-intro-bg" />
			<div className="mission-intro-vignette" />
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1.5 }}
				className="mission-intro-content"
			>
				<motion.div
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 0.5, scale: 1 }}
					transition={{ delay: 0.2, duration: 1 }}
					className="mission-intro-realm-icon"
				>
					{realmIcon}
				</motion.div>
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
					className="mission-intro-chapter"
				>
					{chapterName}
				</motion.p>
				{/*
					Chapter finale missions get a special pulsing crimson badge
					above the title. This is the only "this is THE last mission"
					signal in the UI today; future spectacle work (special music,
					multi-phase boss UI) will hang off the same isChapterFinale flag.
				*/}
				{mission.isChapterFinale && (
					<motion.div
						initial={{ opacity: 0, scale: 0.5 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
						className="mission-intro-finale-badge"
					>
						FINAL CONFRONTATION
					</motion.div>
				)}
				<motion.h2
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
					className="mission-intro-title"
				>
					{mission.name}
				</motion.h2>
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.9 }}
					className="mission-intro-number"
				>
					Mission {mission.missionNumber}
				</motion.p>
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 1.3, duration: 1.2 }}
					className="mission-intro-narrative"
				>
					{mission.narrativeBefore}
				</motion.p>
				{mission.bossRules.length > 0 && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 2.2 }}
						className="mission-intro-boss-rules"
					>
						<p className="mission-intro-boss-label">Boss Modifiers</p>
						{mission.bossRules.map((rule, i) => (
							<p key={`${rule.description}-${i}`} className="mission-intro-boss-rule">{rule.description}</p>
						))}
					</motion.div>
				)}
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 3 }}
					className="mission-intro-prompt"
				>
					Click anywhere to begin battle
				</motion.p>
			</motion.div>
		</div>
	);
};

export default MissionIntroPhase;
