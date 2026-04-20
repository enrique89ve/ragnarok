import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import {
	ALL_CHAPTERS, EASTERN_CHAPTER, BASE_CHAPTER_MISSION_IDS, useCampaignStore,
	NINE_REALMS, REALM_MAP, MISSION_REALM_MAP, getMissionsForRealm, getRealmProgress,
	GREEK_REALMS, GREEK_REALM_MAP, GREEK_MISSION_REALM_MAP, getGreekMissionsForRealm, getGreekRealmProgress, getMission,
} from '../../campaign';
import type { CampaignChapter, CampaignMission, Difficulty } from '../../campaign/campaignTypes';
import type { Realm } from '../../campaign/nineRealms';
import type { GreekRealm } from '../../campaign/greekRealms';
import CinematicCrawl from './CinematicCrawl';
import CosmicCanvas from './CosmicCanvas';
import { MapIntroCard, MissionBriefing } from './CampaignStagePanels';
import './constellation-map.css';

const FACTION_COLORS: Record<string, string> = {
	egyptian: 'from-orange-950/[0.85] via-orange-900/[0.65] to-red-950/70 border-orange-500/25',
	celtic: 'from-emerald-950/[0.85] via-green-900/[0.65] to-slate-950/70 border-emerald-500/25',
	eastern: 'from-red-950/[0.85] via-red-900/[0.65] to-amber-950/70 border-red-500/25',
};

const FACTION_ACCENT: Record<string, string> = {
	norse: 'text-cyan-300',
	greek: 'text-amber-300',
	egyptian: 'text-orange-300',
	celtic: 'text-emerald-300',
	eastern: 'text-red-300',
};

const FACTION_PANEL: Record<string, string> = {
	norse: 'border-cyan-400/20 bg-cyan-400/[0.06]',
	greek: 'border-amber-400/20 bg-amber-400/[0.06]',
	egyptian: 'border-orange-400/20 bg-orange-400/[0.06]',
	celtic: 'border-emerald-400/20 bg-emerald-400/[0.06]',
	eastern: 'border-red-400/20 bg-red-400/[0.06]',
};

const RUNE_CORNERS = ['\u16A0\u16B7\u16C1', '\u16DE\u16D7\u16D2', '\u16C7\u16BA\u16A0', '\u16D2\u16C1\u16DE'];

type View = 'norse' | 'greek' | 'beyond';

type MapRealmShape = {
	id: string;
	position: { x: number; y: number };
	connections: string[];
	color: string;
};

type ConnectionData = {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	color1: string;
	color2: string;
	active: boolean;
};

function getNextUnlockedMission(
	chapter: CampaignChapter,
	completedMissions: Record<string, unknown>,
): CampaignMission | null {
	return chapter.missions.find(mission =>
		!completedMissions[mission.id] &&
		(mission.prerequisiteIds.length === 0 || mission.prerequisiteIds.every(id => !!completedMissions[id])),
	) ?? null;
}

function buildConnectionData<T extends MapRealmShape>(
	realms: T[],
	realmMap: Map<string, T>,
	activeRealms: Set<string>,
): ConnectionData[] {
	const seen = new Set<string>();
	const result: ConnectionData[] = [];

	for (const realm of realms) {
		for (const connectionId of realm.connections) {
			const key = [realm.id, connectionId].sort().join('-');
			if (seen.has(key)) continue;
			seen.add(key);

			const otherRealm = realmMap.get(connectionId);
			if (!otherRealm) continue;

			result.push({
				x1: realm.position.x,
				y1: realm.position.y,
				x2: otherRealm.position.x,
				y2: otherRealm.position.y,
				color1: realm.color,
				color2: otherRealm.color,
				active: activeRealms.has(realm.id) && activeRealms.has(otherRealm.id),
			});
		}
	}

	return result;
}

function StarField() {
	const stars = useMemo(() =>
		Array.from({ length: 70 }, (_, i) => ({
			id: i,
			x: Math.random() * 100,
			y: Math.random() * 100,
			duration: 2 + Math.random() * 4,
			delay: Math.random() * 3,
			opacity: 0.2 + Math.random() * 0.45,
			size: Math.random() > 0.9 ? 3 : Math.random() > 0.72 ? 2 : 1,
		})),
	[]);

	return (
		<>
			{stars.map(star => (
				<div
					key={star.id}
					className="constellation-star"
					style={{
						left: `${star.x}%`,
						top: `${star.y}%`,
						width: star.size,
						height: star.size,
						'--twinkle-duration': `${star.duration}s`,
						'--twinkle-delay': `${star.delay}s`,
						'--star-opacity': star.opacity,
					} as React.CSSProperties}
				/>
			))}
		</>
	);
}

function NorseConstellationLines({ completedMissions }: { completedMissions: Record<string, unknown> }) {
	const lines = useMemo(() => {
		const activeRealms = new Set(
			NINE_REALMS
				.filter(realm => getRealmProgress(realm.id, ALL_CHAPTERS.find(chapter => chapter.faction === 'norse')!.missions, completedMissions).completed > 0)
				.map(realm => realm.id),
		);

		return buildConnectionData(NINE_REALMS, REALM_MAP, activeRealms);
	}, [completedMissions]);

	return (
		<svg className="constellation-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
			{lines.map((line, index) => (
				<line
					key={index}
					x1={line.x1}
					y1={line.y1}
					x2={line.x2}
					y2={line.y2}
					className={line.active ? 'constellation-line-active' : 'constellation-line'}
				/>
			))}
		</svg>
	);
}

function GreekConstellationLines({ completedMissions }: { completedMissions: Record<string, unknown> }) {
	const lines = useMemo(() => {
		const activeRealms = new Set(
			GREEK_REALMS
				.filter(realm => getGreekRealmProgress(realm.id, ALL_CHAPTERS.find(chapter => chapter.faction === 'greek')!.missions, completedMissions).completed > 0)
				.map(realm => realm.id),
		);

		return buildConnectionData(GREEK_REALMS, GREEK_REALM_MAP, activeRealms);
	}, [completedMissions]);

	return (
		<svg className="constellation-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
			{lines.map((line, index) => (
				<line
					key={index}
					x1={line.x1}
					y1={line.y1}
					x2={line.x2}
					y2={line.y2}
					className={line.active ? 'constellation-line-active' : 'constellation-line'}
				/>
			))}
		</svg>
	);
}

function MissionNode({
	mission,
	onSelect,
}: {
	mission: CampaignMission;
	onSelect: (mission: CampaignMission) => void;
}) {
	const completed = useCampaignStore(state => state.isMissionCompleted(mission.id));
	const unlocked = useCampaignStore(state => state.isMissionUnlocked(mission.id, mission.prerequisiteIds));

	return (
		<button
			type="button"
			onClick={() => unlocked && onSelect(mission)}
			disabled={!unlocked}
			className={`w-full rounded-2xl border p-4 text-left transition-all ${
				completed
					? 'border-emerald-500/25 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12]'
					: unlocked
						? 'border-white/10 bg-white/[0.06] hover:border-white/[0.18] hover:bg-white/[0.09]'
						: 'cursor-not-allowed border-white/[0.06] bg-black/25 opacity-45'
			}`}
		>
			<div className="flex items-start gap-3">
				<div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
					completed ? 'bg-emerald-500 text-emerald-950' : unlocked ? 'bg-white/10 text-gray-100' : 'bg-white/5 text-gray-500'
				}`}>
					{completed ? '\u2713' : mission.missionNumber}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className={`text-sm font-semibold ${completed ? 'text-emerald-200' : unlocked ? 'text-gray-100' : 'text-gray-500'}`}>
							{mission.name}
						</p>
						{mission.isChapterFinale && (
							<span className="rounded-full border border-red-500/[0.35] bg-red-500/[0.12] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">
								Finale
							</span>
						)}
						{!mission.isChapterFinale && mission.bossRules.length > 0 && (
							<span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
								Boss
							</span>
						)}
					</div>
					<p className="mt-1 text-sm leading-relaxed text-gray-400">
						{mission.description}
					</p>
				</div>
			</div>
		</button>
	);
}

function NorseRealmNode({
	realm,
	selected,
	onClick,
	hasUnlockedMission,
}: {
	realm: Realm;
	selected: boolean;
	onClick: () => void;
	hasUnlockedMission: boolean;
}) {
	const completedMissions = useCampaignStore(state => state.completedMissions);
	const norseChapter = ALL_CHAPTERS.find(chapter => chapter.faction === 'norse')!;
	const progress = getRealmProgress(realm.id, norseChapter.missions, completedMissions);
	const hasMissions = progress.total > 0;
	const allDone = progress.completed === progress.total && progress.total > 0;

	return (
		<div
			className={`realm-node ${!hasMissions ? 'realm-node-locked' : ''} ${selected ? 'realm-node-selected' : ''} ${hasUnlockedMission && !allDone ? 'realm-node-available' : ''}`}
			style={{ left: `${realm.position.x}%`, top: `${realm.position.y}%` }}
			onClick={() => hasMissions && onClick()}
		>
			{hasMissions && progress.total > 0 && (
				<div className="realm-progress">{progress.completed}/{progress.total}</div>
			)}
			{hasUnlockedMission && !allDone && (
				<div className="realm-start-hint">Route Here</div>
			)}
			<div
				className="realm-glow"
				style={{
					'--realm-color': realm.color,
					'--realm-glow': realm.glowColor,
				} as React.CSSProperties}
			>
				<span className="realm-rune">{realm.runeSymbol}</span>
			</div>
			<span className="realm-name" style={{ color: realm.color }}>{realm.name}</span>
			{!hasMissions && <span className="realm-locked-label">Locked</span>}
		</div>
	);
}

function GreekRealmNode({
	realm,
	selected,
	onClick,
	hasUnlockedMission,
}: {
	realm: GreekRealm;
	selected: boolean;
	onClick: () => void;
	hasUnlockedMission: boolean;
}) {
	const completedMissions = useCampaignStore(state => state.completedMissions);
	const greekChapter = ALL_CHAPTERS.find(chapter => chapter.faction === 'greek')!;
	const progress = getGreekRealmProgress(realm.id, greekChapter.missions, completedMissions);
	const hasMissions = progress.total > 0;
	const allDone = progress.completed === progress.total && progress.total > 0;

	return (
		<div
			className={`realm-node ${!hasMissions ? 'realm-node-locked' : ''} ${selected ? 'realm-node-selected' : ''} ${hasUnlockedMission && !allDone ? 'realm-node-available' : ''}`}
			style={{ left: `${realm.position.x}%`, top: `${realm.position.y}%` }}
			onClick={() => hasMissions && onClick()}
		>
			{hasMissions && progress.total > 0 && (
				<div className="realm-progress">{progress.completed}/{progress.total}</div>
			)}
			{hasUnlockedMission && !allDone && (
				<div className="realm-start-hint">Route Here</div>
			)}
			<div
				className="realm-glow"
				style={{
					'--realm-color': realm.color,
					'--realm-glow': realm.glowColor,
				} as React.CSSProperties}
			>
				<span className="realm-rune">{realm.symbol}</span>
			</div>
			<span className="realm-name" style={{ color: realm.color }}>{realm.name}</span>
			{!hasMissions && <span className="realm-locked-label">Locked</span>}
		</div>
	);
}

function RealmMissionPanel({
	realm,
	missions,
	onSelectMission,
	onClose,
}: {
	realm: Realm | GreekRealm;
	missions: CampaignMission[];
	onSelectMission: (mission: CampaignMission) => void;
	onClose: () => void;
}) {
	const description = 'description' in realm ? realm.description : '';
	const effect = 'environmentEffect' in realm ? realm.environmentEffect : '';
	const effectDescription = 'environmentDescription' in realm ? realm.environmentDescription : '';
	const symbol = 'runeSymbol' in realm ? realm.runeSymbol : realm.symbol;
	const completedMissions = useCampaignStore(state => state.completedMissions);
	const nextMission = missions.find(mission =>
		!completedMissions[mission.id] &&
		(mission.prerequisiteIds.length === 0 || mission.prerequisiteIds.every(id => !!completedMissions[id])),
	) ?? null;
	const cleared = missions.filter(mission => !!completedMissions[mission.id]).length;
	const allLocked = missions.length > 0 && missions.every(mission => {
		if (mission.prerequisiteIds.length === 0) return false;
		return !mission.prerequisiteIds.every(id => !!completedMissions[id]);
	});

	return (
		<div className="realm-mission-panel" style={{ '--realm-color': realm.color } as React.CSSProperties}>
			<button type="button" className="realm-panel-back" onClick={onClose}>&larr; Back to Map</button>

			<div className="realm-panel-header">
				<div className="realm-panel-name" style={{ color: realm.color }}>{realm.name}</div>
				<p className="realm-panel-description">{description}</p>
				<div className="realm-panel-meta">
					<span>{cleared}/{missions.length} cleared</span>
					{effect && <span>{symbol} {effect}</span>}
				</div>
				{effect && (
					<div className="realm-panel-effect">
						<span>{effectDescription}</span>
					</div>
				)}
			</div>

			{nextMission ? (
				<div className="realm-panel-guidance">
					<p className="campaign-kicker text-left">Next Route</p>
					<p className="mt-2 text-base font-semibold text-gray-100">{nextMission.name}</p>
					<p className="mt-2 text-sm leading-relaxed text-gray-400">{nextMission.description}</p>
					<button type="button" className="campaign-primary-btn mt-4" onClick={() => onSelectMission(nextMission)}>
						Open Briefing
					</button>
				</div>
			) : missions.length > 0 && cleared === missions.length ? (
				<div className="realm-panel-guidance">
					<p className="campaign-kicker text-left">Realm Status</p>
					<p className="mt-2 text-base font-semibold text-gray-100">Realm secured</p>
					<p className="mt-2 text-sm leading-relaxed text-gray-400">
						All authored missions in this realm are cleared. Revisit any mission below whenever you want another pass.
					</p>
				</div>
			) : null}

			{allLocked && (
				<div className="realm-panel-locked-hint">
					All missions here require an earlier victory first. Follow the glowing realm marker to stay on the authored route.
				</div>
			)}

			<div className="space-y-2">
				{missions.map(mission => (
					<MissionNode key={mission.id} mission={mission} onSelect={onSelectMission} />
				))}
			</div>
		</div>
	);
}

export default function CampaignPage() {
	const [view, setView] = useState<View>('norse');
	const [selectedRealm, setSelectedRealm] = useState<string | null>(null);
	const [selectedMission, setSelectedMission] = useState<CampaignMission | null>(null);
	const [selectedChapter, setSelectedChapter] = useState<CampaignChapter | null>(null);
	const [cinematicChapter, setCinematicChapter] = useState<CampaignChapter | null>(null);
	const navigate = useNavigate();
	const startMission = useCampaignStore(state => state.startMission);
	const markCinematicSeen = useCampaignStore(state => state.markCinematicSeen);
	const currentMissionId = useCampaignStore(state => state.currentMission);
	const completedMissions = useCampaignStore(state => state.completedMissions);
	const seenCinematics = useCampaignStore(state => state.seenCinematics);
	const isAllComplete = useCampaignStore(state => state.isAllBaseChaptersComplete(BASE_CHAPTER_MISSION_IDS));

	const norseChapter = ALL_CHAPTERS.find(chapter => chapter.faction === 'norse')!;
	const greekChapter = ALL_CHAPTERS.find(chapter => chapter.faction === 'greek')!;
	const beyondChapters = ALL_CHAPTERS.filter(chapter => chapter.faction !== 'norse' && chapter.faction !== 'greek');
	const totalCampaignMissions = useMemo(
		() => ALL_CHAPTERS.reduce((sum, chapter) => sum + chapter.missions.length, 0),
		[],
	);
	const totalClearedMissions = Object.keys(completedMissions).length;
	const currentMissionData = useMemo(
		() => (currentMissionId ? getMission(currentMissionId) : null),
		[currentMissionId],
	);

	const selectedNorseRealm = view === 'norse' && selectedRealm ? REALM_MAP.get(selectedRealm) ?? null : null;
	const selectedGreekRealm = view === 'greek' && selectedRealm ? GREEK_REALM_MAP.get(selectedRealm) ?? null : null;

	const chapterProgressById = useMemo(() => {
		const progress = new Map<string, number>();
		for (const chapter of ALL_CHAPTERS) {
			progress.set(
				chapter.id,
				chapter.missions.filter(mission => !!completedMissions[mission.id]).length,
			);
		}
		return progress;
	}, [completedMissions]);

	const nextMissionByChapter = useMemo(() => {
		const nextMissionMap = new Map<string, CampaignMission | null>();
		for (const chapter of ALL_CHAPTERS) {
			nextMissionMap.set(chapter.id, getNextUnlockedMission(chapter, completedMissions));
		}
		return nextMissionMap;
	}, [completedMissions]);

	const currentDisplayChapter = useMemo(() => {
		if (view === 'norse') return norseChapter;
		if (view === 'greek') return greekChapter;
		return selectedChapter;
	}, [view, norseChapter, greekChapter, selectedChapter]);

	useEffect(() => {
		if (selectedMission || cinematicChapter) return;
		const chapterToAutoplay = currentDisplayChapter;
		if (!chapterToAutoplay?.cinematicIntro) return;
		if (seenCinematics.includes(chapterToAutoplay.id)) return;
		setCinematicChapter(chapterToAutoplay);
	}, [currentDisplayChapter, selectedMission, cinematicChapter, seenCinematics]);

	const norseRealmsWithUnlocked = useMemo(() => {
		const result = new Set<string>();
		for (const mission of norseChapter.missions) {
			const realmId = MISSION_REALM_MAP[mission.id];
			if (!realmId) continue;
			const unlocked = mission.prerequisiteIds.length === 0 || mission.prerequisiteIds.every(id => !!completedMissions[id]);
			const done = !!completedMissions[mission.id];
			if (unlocked && !done) result.add(realmId);
		}
		return result;
	}, [norseChapter.missions, completedMissions]);

	const greekRealmsWithUnlocked = useMemo(() => {
		const result = new Set<string>();
		for (const mission of greekChapter.missions) {
			const realmId = GREEK_MISSION_REALM_MAP[mission.id];
			if (!realmId) continue;
			const unlocked = mission.prerequisiteIds.length === 0 || mission.prerequisiteIds.every(id => !!completedMissions[id]);
			const done = !!completedMissions[mission.id];
			if (unlocked && !done) result.add(realmId);
		}
		return result;
	}, [greekChapter.missions, completedMissions]);

	const norseConnections = useMemo(() => {
		const activeRealms = new Set(
			NINE_REALMS
				.filter(realm => getRealmProgress(realm.id, norseChapter.missions, completedMissions).completed > 0)
				.map(realm => realm.id),
		);
		return buildConnectionData(NINE_REALMS, REALM_MAP, activeRealms);
	}, [norseChapter.missions, completedMissions]);

	const greekConnections = useMemo(() => {
		const activeRealms = new Set(
			GREEK_REALMS
				.filter(realm => getGreekRealmProgress(realm.id, greekChapter.missions, completedMissions).completed > 0)
				.map(realm => realm.id),
		);
		return buildConnectionData(GREEK_REALMS, GREEK_REALM_MAP, activeRealms);
	}, [greekChapter.missions, completedMissions]);

	const campaignLead = useMemo<{
		view: View;
		chapter: CampaignChapter;
		mission: CampaignMission;
		title: string;
		copy: string;
		cta: string;
	} | null>(() => {
		if (currentMissionData) {
			const leadView: View = currentMissionData.chapter.faction === 'norse'
				? 'norse'
				: currentMissionData.chapter.faction === 'greek'
					? 'greek'
					: 'beyond';
			return {
				view: leadView,
				chapter: currentMissionData.chapter,
				mission: currentMissionData.mission,
				title: 'Active Mission',
				copy: 'This mission is already staged. Resume the launch briefing and move directly back into the authored battle flow.',
				cta: 'Resume Briefing',
			};
		}

		if (!currentDisplayChapter) return null;

		const nextMission = nextMissionByChapter.get(currentDisplayChapter.id) ?? null;
		if (!nextMission) return null;

		return {
			view: view === 'beyond' ? 'beyond' : view,
			chapter: currentDisplayChapter,
			mission: nextMission,
			title: 'Next Battle',
			copy: 'The campaign route is now staged around one clean handoff: chapter theater, briefing, then live combat.',
			cta: 'Stage Next Battle',
		};
	}, [currentMissionData, currentDisplayChapter, nextMissionByChapter, view]);

	const stageMission = (mission: CampaignMission, chapter: CampaignChapter, nextView?: View) => {
		if (nextView) {
			setView(nextView);
		}
		setSelectedRealm(null);
		setSelectedChapter(chapter);
		setSelectedMission(mission);
	};

	const openChapterCinematic = (chapter: CampaignChapter | null) => {
		if (!chapter?.cinematicIntro) return;
		setCinematicChapter(chapter);
	};

	const handleStartMission = (difficulty: Difficulty) => {
		if (!selectedMission) return;
		startMission(selectedMission.id, difficulty);
		navigate(routes.game);
	};

	const chapterProgressLabel = currentDisplayChapter
		? `${chapterProgressById.get(currentDisplayChapter.id) ?? 0}/${currentDisplayChapter.missions.length} in chapter`
		: null;

	const hasCurrentPrologue = currentDisplayChapter?.cinematicIntro != null;
	const hasSeenCurrentPrologue = currentDisplayChapter ? seenCinematics.includes(currentDisplayChapter.id) : false;
	const currentDisplayNextMission = currentDisplayChapter ? nextMissionByChapter.get(currentDisplayChapter.id) ?? null : null;

	if (selectedMission) {
		const chapter = selectedChapter ?? norseChapter;
		return (
			<div className="constellation-container">
				<div className="rune-border-decoration rune-border-top-left">{RUNE_CORNERS[0]}</div>
				<div className="rune-border-decoration rune-border-top-right">{RUNE_CORNERS[1]}</div>
				<div className="rune-border-decoration rune-border-bottom-left">{RUNE_CORNERS[2]}</div>
				<div className="rune-border-decoration rune-border-bottom-right">{RUNE_CORNERS[3]}</div>

				<div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
					<MissionBriefing
						mission={selectedMission}
						chapter={chapter}
						onStart={handleStartMission}
						onBack={() => setSelectedMission(null)}
						onWatchPrologue={() => openChapterCinematic(chapter)}
						accentClass={FACTION_ACCENT[chapter.faction]}
						panelClass={FACTION_PANEL[chapter.faction]}
					/>
				</div>

				{cinematicChapter?.cinematicIntro && (
					<CinematicCrawl
						intro={cinematicChapter.cinematicIntro}
						onComplete={() => {
							markCinematicSeen(cinematicChapter.id);
							setCinematicChapter(null);
						}}
					/>
				)}
			</div>
		);
	}

	return (
		<div className="constellation-container">
			<div className="rune-border-decoration rune-border-top-left">{RUNE_CORNERS[0]}</div>
			<div className="rune-border-decoration rune-border-top-right">{RUNE_CORNERS[1]}</div>
			<div className="rune-border-decoration rune-border-bottom-left">{RUNE_CORNERS[2]}</div>
			<div className="rune-border-decoration rune-border-bottom-right">{RUNE_CORNERS[3]}</div>

			<div className="constellation-nav">
				<div className="flex items-center gap-4">
					<Link to={routes.home}>
						<button type="button" className="text-sm text-gray-400 transition-colors hover:text-white">
							&larr; Back
						</button>
					</Link>
					<h1 className="constellation-title">Campaign</h1>
				</div>
			</div>

			<div className="constellation-tabs">
				<button
					type="button"
					className={`constellation-tab ${view === 'norse' ? 'constellation-tab-active' : ''}`}
					onClick={() => {
						setView('norse');
						setSelectedRealm(null);
						setSelectedChapter(null);
					}}
				>
					Nine Realms
				</button>
				<button
					type="button"
					className={`constellation-tab ${view === 'greek' ? 'constellation-tab-active' : ''}`}
					onClick={() => {
						setView('greek');
						setSelectedRealm(null);
						setSelectedChapter(null);
					}}
				>
					Olympus
				</button>
				<button
					type="button"
					className={`constellation-tab ${view === 'beyond' ? 'constellation-tab-active' : ''}`}
					onClick={() => {
						setView('beyond');
						setSelectedRealm(null);
					}}
				>
					Beyond
				</button>
			</div>

			<div className="mx-4 mb-6 rounded-[28px] border border-white/10 bg-black/[0.28] px-4 py-4 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:px-5 sm:py-5">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="min-w-0">
						<p className="campaign-kicker">
							{campaignLead?.title ?? 'Campaign Theater'}
						</p>
						<h2 className="mt-2 campaign-display-title text-gray-100">
							{campaignLead
								? campaignLead.mission.name
								: currentDisplayChapter
									? currentDisplayChapter.name
									: 'Choose a mythology and stage the next authored battle'}
						</h2>
						<p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-400 sm:text-[15px]">
							{campaignLead
								? `${campaignLead.chapter.name} · Mission ${campaignLead.mission.missionNumber}. ${campaignLead.copy}`
								: currentDisplayChapter
									? currentDisplayChapter.description
									: 'Beyond opens into later mythologies and the secret gate. Clear the base arcs, then push into the deeper campaign line.'}
						</p>
					</div>

					<div className="flex flex-col gap-3 lg:items-end">
						<div className="flex flex-wrap items-center gap-2 lg:justify-end">
							<span className="campaign-pill">
								{totalClearedMissions}/{totalCampaignMissions} cleared
							</span>
							{chapterProgressLabel && (
								<span className="campaign-pill">
									{chapterProgressLabel}
								</span>
							)}
						</div>

						<div className="flex flex-wrap items-center gap-2 lg:justify-end">
							{hasCurrentPrologue && (
								<button
									type="button"
									onClick={() => openChapterCinematic(currentDisplayChapter)}
									className="campaign-secondary-btn"
								>
									{hasSeenCurrentPrologue ? 'Replay Prologue' : 'Play Prologue'}
								</button>
							)}

							{campaignLead && (
								<button
									type="button"
									onClick={() => stageMission(campaignLead.mission, campaignLead.chapter, campaignLead.view)}
									className="campaign-primary-btn"
								>
									{campaignLead.cta}
								</button>
							)}
						</div>

						{currentDisplayNextMission && !campaignLead && (
							<p className="text-sm text-gray-500">
								Next route: {currentDisplayNextMission.name}
							</p>
						)}
					</div>
				</div>
			</div>

			{view === 'norse' ? (
				<div className="constellation-map-area">
					<CosmicCanvas realms={NINE_REALMS} connections={norseConnections} className="constellation-cosmic-canvas" />
					<div className="constellation-map-shroud" />
					<StarField />
					<NorseConstellationLines completedMissions={completedMissions} />

					{!selectedNorseRealm && (
						<div className="constellation-intro absolute inset-0 flex items-center justify-center px-6">
							<MapIntroCard
								chapter={norseChapter}
								nextMission={nextMissionByChapter.get(norseChapter.id) ?? null}
								onPlayPrologue={() => openChapterCinematic(norseChapter)}
								onStageNextBattle={() => {
									const nextMission = nextMissionByChapter.get(norseChapter.id);
									if (nextMission) stageMission(nextMission, norseChapter, 'norse');
								}}
								prologueSeen={seenCinematics.includes(norseChapter.id)}
								accentClass={FACTION_ACCENT[norseChapter.faction]}
							/>
						</div>
					)}

					{NINE_REALMS.map(realm => (
						<NorseRealmNode
							key={realm.id}
							realm={realm}
							selected={selectedRealm === realm.id}
							onClick={() => setSelectedRealm(selectedRealm === realm.id ? null : realm.id)}
							hasUnlockedMission={norseRealmsWithUnlocked.has(realm.id)}
						/>
					))}

					<AnimatePresence>
						{selectedNorseRealm && (
							<motion.div
								initial={{ opacity: 0, x: 30 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 30 }}
								transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
							>
								<RealmMissionPanel
									realm={selectedNorseRealm}
									missions={getMissionsForRealm(selectedNorseRealm.id, norseChapter.missions)}
									onSelectMission={mission => {
										setSelectedMission(mission);
										setSelectedChapter(norseChapter);
									}}
									onClose={() => setSelectedRealm(null)}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			) : view === 'greek' ? (
				<div
					className="constellation-map-area"
					style={{ background: 'radial-gradient(ellipse at 50% 28%, #101735 0%, #0a1023 42%, #040711 100%)' }}
				>
					<CosmicCanvas realms={GREEK_REALMS} connections={greekConnections} className="constellation-cosmic-canvas" />
					<div className="constellation-map-shroud constellation-map-shroud-greek" />
					<StarField />
					<GreekConstellationLines completedMissions={completedMissions} />

					{!selectedGreekRealm && (
						<div className="constellation-intro absolute inset-0 flex items-center justify-center px-6">
							<MapIntroCard
								chapter={greekChapter}
								nextMission={nextMissionByChapter.get(greekChapter.id) ?? null}
								onPlayPrologue={() => openChapterCinematic(greekChapter)}
								onStageNextBattle={() => {
									const nextMission = nextMissionByChapter.get(greekChapter.id);
									if (nextMission) stageMission(nextMission, greekChapter, 'greek');
								}}
								prologueSeen={seenCinematics.includes(greekChapter.id)}
								accentClass={FACTION_ACCENT[greekChapter.faction]}
							/>
						</div>
					)}

					{GREEK_REALMS.map(realm => (
						<GreekRealmNode
							key={realm.id}
							realm={realm}
							selected={selectedRealm === realm.id}
							onClick={() => setSelectedRealm(selectedRealm === realm.id ? null : realm.id)}
							hasUnlockedMission={greekRealmsWithUnlocked.has(realm.id)}
						/>
					))}

					<AnimatePresence>
						{selectedGreekRealm && (
							<motion.div
								initial={{ opacity: 0, x: 30 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 30 }}
								transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
							>
								<RealmMissionPanel
									realm={selectedGreekRealm}
									missions={getGreekMissionsForRealm(selectedGreekRealm.id, greekChapter.missions)}
									onSelectMission={mission => {
										setSelectedMission(mission);
										setSelectedChapter(greekChapter);
									}}
									onClose={() => setSelectedRealm(null)}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			) : selectedChapter ? (
				<div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
					<motion.div
						initial={{ opacity: 0, y: 18 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
						className="campaign-surface-strong"
					>
						<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div className="min-w-0">
								<button
									type="button"
									onClick={() => setSelectedChapter(null)}
									className="text-sm text-gray-500 transition-colors hover:text-gray-200"
								>
									&larr; Back to chapters
								</button>
								<p className="campaign-kicker mt-4">Chapter Brief</p>
								<h2 className={`mt-2 campaign-display-title ${FACTION_ACCENT[selectedChapter.faction]}`}>
									{selectedChapter.name}
								</h2>
								<p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-400 sm:text-[15px]">
									{selectedChapter.description}
								</p>
							</div>

							<div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem] lg:grid-cols-1">
								<div className="campaign-surface">
									<p className="campaign-kicker text-left">Chapter Progress</p>
									<p className="mt-2 text-base font-semibold text-gray-100">
										{chapterProgressById.get(selectedChapter.id) ?? 0}/{selectedChapter.missions.length}
									</p>
									<p className="mt-1 text-sm text-gray-400">Cleared missions inside this arc.</p>
								</div>
								<div className="campaign-surface">
									<p className="campaign-kicker text-left">Next Route</p>
									<p className="mt-2 text-base font-semibold text-gray-100">
										{(nextMissionByChapter.get(selectedChapter.id) ?? null)?.name ?? 'Chapter cleared'}
									</p>
									<p className="mt-1 text-sm text-gray-400">
										{(nextMissionByChapter.get(selectedChapter.id) ?? null)?.description ?? 'Replay the chapter or revisit missions as needed.'}
									</p>
								</div>
							</div>
						</div>

						<div className="mt-5 flex flex-wrap gap-2">
							{selectedChapter.cinematicIntro && (
								<button type="button" className="campaign-secondary-btn" onClick={() => openChapterCinematic(selectedChapter)}>
									{seenCinematics.includes(selectedChapter.id) ? 'Replay Prologue' : 'Play Prologue'}
								</button>
							)}
							{(nextMissionByChapter.get(selectedChapter.id) ?? null) && (
								<button
									type="button"
									className="campaign-primary-btn"
									onClick={() => {
										const nextMission = nextMissionByChapter.get(selectedChapter.id);
										if (nextMission) stageMission(nextMission, selectedChapter, 'beyond');
									}}
								>
									Stage Next Battle
								</button>
							)}
						</div>
					</motion.div>

					<div className="mt-5 space-y-2">
						{selectedChapter.missions.map(mission => (
							<MissionNode
								key={mission.id}
								mission={mission}
								onSelect={selected => setSelectedMission(selected)}
							/>
						))}
					</div>
				</div>
			) : (
				<div className="beyond-grid">
					{beyondChapters.map(chapter => {
						const progress = chapterProgressById.get(chapter.id) ?? 0;
						const nextMission = nextMissionByChapter.get(chapter.id) ?? null;
						return (
							<article
								key={chapter.id}
								className={`beyond-card bg-gradient-to-br ${FACTION_COLORS[chapter.faction]}`}
							>
								<p className="campaign-kicker">Chapter Theater</p>
								<h3 className={`mt-2 text-2xl font-semibold ${FACTION_ACCENT[chapter.faction]}`}>
									{chapter.name}
								</h3>
								<p className="mt-3 text-sm leading-relaxed text-gray-300">
									{chapter.description}
								</p>

								<div className="campaign-surface mt-5">
									<p className="campaign-kicker text-left">Next Route</p>
									<p className="mt-2 text-base font-semibold text-gray-100">
										{nextMission?.name ?? 'Chapter cleared'}
									</p>
									<p className="mt-2 text-sm leading-relaxed text-gray-400">
										{nextMission?.description ?? 'All missions in this chapter are complete. Replay the prologue or reopen the chapter to review the arc.'}
									</p>
								</div>

								<div className="mt-5 flex items-center gap-2">
									<div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
										<div
											className="h-full rounded-full bg-amber-400 transition-all"
											style={{ width: `${(progress / chapter.missions.length) * 100}%` }}
										/>
									</div>
									<span className="text-xs font-medium text-gray-400">
										{progress}/{chapter.missions.length}
									</span>
								</div>

								<div className="beyond-card-buttons">
									<button type="button" className="campaign-secondary-btn" onClick={() => openChapterCinematic(chapter)}>
										{seenCinematics.includes(chapter.id) ? 'Replay Prologue' : 'Play Prologue'}
									</button>
									<button
										type="button"
										className="campaign-primary-btn"
										onClick={() => setSelectedChapter(chapter)}
									>
										Open Chapter
									</button>
								</div>
							</article>
						);
					})}

					{isAllComplete && (
						<article className="beyond-card bg-gradient-to-br from-red-950/[0.88] via-red-900/70 to-amber-950/[0.72] border-red-500/30">
							<p className="campaign-kicker">Secret Gate</p>
							<h3 className="mt-2 text-2xl font-semibold text-red-200">
								The Celestial Gate
							</h3>
							<p className="mt-3 text-sm leading-relaxed text-gray-300">
								Chinese, Japanese, and Hindu myth lines converge beyond the base arcs. The gate is open now.
							</p>

							<div className="campaign-surface mt-5">
								<p className="campaign-kicker text-left">Gate Status</p>
								<p className="mt-2 text-base font-semibold text-gray-100">
									{chapterProgressById.get(EASTERN_CHAPTER.id) ?? 0}/{EASTERN_CHAPTER.missions.length} cleared
								</p>
								<p className="mt-2 text-sm leading-relaxed text-gray-400">
									A later mythology tranche with its own prologue, route, and finale cadence.
								</p>
							</div>

							<div className="beyond-card-buttons">
								<button type="button" className="campaign-secondary-btn" onClick={() => openChapterCinematic(EASTERN_CHAPTER)}>
									{seenCinematics.includes(EASTERN_CHAPTER.id) ? 'Replay Prologue' : 'Play Prologue'}
								</button>
								<button type="button" className="campaign-primary-btn" onClick={() => setSelectedChapter(EASTERN_CHAPTER)}>
									Open Chapter
								</button>
							</div>
						</article>
					)}

					{!isAllComplete && (
						<div className="beyond-card border-dashed border-white/10 bg-white/4">
							<p className="campaign-kicker">Locked Arc</p>
							<h3 className="mt-2 text-2xl font-semibold text-gray-200">The Celestial Gate</h3>
							<p className="mt-3 text-sm leading-relaxed text-gray-400">
								Clear every visible chapter to open the hidden mythology line.
							</p>
						</div>
					)}
				</div>
			)}

			{cinematicChapter?.cinematicIntro && (
				<CinematicCrawl
					intro={cinematicChapter.cinematicIntro}
					onComplete={() => {
						markCinematicSeen(cinematicChapter.id);
						setCinematicChapter(null);
					}}
				/>
			)}
		</div>
	);
}
