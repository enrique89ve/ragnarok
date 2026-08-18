import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Compass, Play, Check } from 'lucide-react';
import { routes } from '../../../lib/routes';
import { Button } from '../../../components/ui-norse';
import { AccountSlot } from '../../../components/account/AccountSlot';
import { useNFTUsername } from '../../nft/hooks';
import { isSharedNetworkEnvironment } from '../../config/featureFlags';
import { resolveProtectedFlowAccess } from '../../auth/protectedFlowAccess';
import { HiveKeychainLogin } from '../HiveKeychainLogin';
import { OrnateCorners, SigilBackplate, type Tier } from '../../../components/ornaments/RunicSigils';
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

/* ────────────────────────────────────────────────────────────────────────────
 * Faction visual identity — atmospheric radial gradients (mirroring HomePage
 * mode cards) instead of opaque overlay washes. Each faction owns a hue but
 * the surface stays obsidian, so beyond cards feel coherent with the rest of
 * the app instead of like alien posters.
 * ──────────────────────────────────────────────────────────────────────────── */
const FACTION_ATMOSPHERE: Record<string, string> = {
	egyptian:
		'radial-gradient(ellipse 75% 60% at 85% 15%, rgba(217, 74, 18, 0.38), transparent 65%), ' +
		'radial-gradient(ellipse 50% 40% at 20% 90%, rgba(110, 31, 5, 0.30), transparent 70%)',
	celtic:
		'radial-gradient(ellipse 75% 60% at 85% 15%, rgba(79, 122, 54, 0.38), transparent 65%), ' +
		'radial-gradient(ellipse 50% 40% at 20% 90%, rgba(38, 60, 24, 0.30), transparent 70%)',
	eastern:
		'radial-gradient(ellipse 75% 60% at 85% 15%, rgba(165, 49, 10, 0.40), transparent 65%), ' +
		'radial-gradient(ellipse 50% 40% at 20% 90%, rgba(115, 80, 15, 0.32), transparent 70%)',
	twilight:
		'radial-gradient(ellipse 75% 60% at 85% 15%, rgba(122, 91, 214, 0.36), transparent 65%), ' +
		'radial-gradient(ellipse 50% 40% at 20% 90%, rgba(51, 26, 105, 0.32), transparent 70%)',
};

const FACTION_ACCENT: Record<string, string> = {
	norse: 'text-bifrost-300',
	greek: 'text-gold-300',
	egyptian: 'text-ember-300',
	celtic: 'text-rune-300',
	eastern: 'text-blood-300',
	twilight: 'text-bifrost-300',
};

const FACTION_BORDER: Record<string, string> = {
	norse: 'hover:border-bifrost-300/40',
	greek: 'hover:border-gold-300/50',
	egyptian: 'hover:border-ember-300/50',
	celtic: 'hover:border-rune-300/50',
	eastern: 'hover:border-blood-300/50',
	twilight: 'hover:border-bifrost-300/45',
};

const RUNE_CORNERS = ['ᚠᚷᛁ', 'ᛞᛗᛒ', 'ᛇᚺᚠ', 'ᛒᛁᛞ'];
const REALM_SIGIL_FRAME_SRC = '/art/campaign/realm-sigil-frame-v1.webp';
const BEYOND_SCENE_SRC: Record<string, string> = {
	egyptian: '/art/campaign/beyond-duat-chest-v1.png',
	celtic: '/art/campaign/beyond-celtic-chest-v1.png',
	eastern: '/art/campaign/beyond-celestial-chest-v1.png',
	twilight: '/art/campaign/beyond-sealed-chest-v1.png',
};

const BEYOND_SIGIL_TIER: Record<string, Tier> = {
	egyptian: 'mythic',
	celtic: 'standard',
	eastern: 'premium',
	twilight: 'obsidian',
};

const BEYOND_SIGIL_MARK: Record<string, string> = {
	egyptian: 'DU',
	celtic: 'TN',
	eastern: 'CG',
	twilight: 'SG',
};

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

const MAP_STAGE_BOUNDS = {
	minX: 6,
	maxX: 94,
	minY: 18,
	maxY: 88,
};

function fitStagePosition(position: { x: number; y: number }): { x: number; y: number } {
	return {
		x: MAP_STAGE_BOUNDS.minX + (position.x / 100) * (MAP_STAGE_BOUNDS.maxX - MAP_STAGE_BOUNDS.minX),
		y: MAP_STAGE_BOUNDS.minY + (position.y / 100) * (MAP_STAGE_BOUNDS.maxY - MAP_STAGE_BOUNDS.minY),
	};
}

function fitStageRealms<T extends MapRealmShape>(realms: T[]): T[] {
	return realms.map(realm => ({
		...realm,
		position: fitStagePosition(realm.position),
	}));
}

const STAGE_NINE_REALMS = fitStageRealms(NINE_REALMS);
const STAGE_REALM_MAP = new Map(STAGE_NINE_REALMS.map(realm => [realm.id, realm]));
const STAGE_GREEK_REALMS = fitStageRealms(GREEK_REALMS);
const STAGE_GREEK_REALM_MAP = new Map(STAGE_GREEK_REALMS.map(realm => [realm.id, realm]));

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

/* ────────────────────────────────────────────────────────────────────────────
 * Token-based typographic primitives reused across the campaign tree.
 * Inlined as constants so the design token vocabulary stays first-class
 * without growing a parallel CSS utility set.
 * ──────────────────────────────────────────────────────────────────────────── */
export const KICKER_CLASS =
	'font-mono text-[10px] sm:text-[11px] tracking-[0.32em] uppercase font-semibold text-gold-300';

export const DISPLAY_TITLE_CLASS =
	'font-display font-black tracking-[0.06em] uppercase text-[clamp(1.5rem,2.6vw,2.4rem)] leading-[1.05] text-ink-0';

export const SURFACE_CLASS =
	'rounded-xl border border-obsidian-700 bg-obsidian-900/60 backdrop-blur-sm p-4';

export const SURFACE_STRONG_CLASS =
	'rounded-2xl border border-obsidian-700 bg-linear-to-b from-obsidian-850 to-obsidian-900 ' +
	'shadow-[0_28px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-md';

export const PILL_CLASS =
	'inline-flex items-center justify-center h-7 px-3 rounded-full ' +
	'border border-obsidian-700 bg-obsidian-850 ' +
	'font-mono text-[10px] tracking-[0.18em] uppercase font-bold text-ink-200';

function StarField() {
	const stars = useMemo(() =>
		Array.from({ length: 42 }, (_, i) => ({
			id: i,
			x: Math.random() * 100,
			y: Math.random() * 100,
			duration: 3.5 + Math.random() * 5,
			delay: Math.random() * 3,
			opacity: 0.08 + Math.random() * 0.24,
			size: Math.random() > 0.92 ? 2 : 1,
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
			STAGE_NINE_REALMS
				.filter(realm => getRealmProgress(realm.id, ALL_CHAPTERS.find(chapter => chapter.faction === 'norse')!.missions, completedMissions).completed > 0)
				.map(realm => realm.id),
		);

		return buildConnectionData(STAGE_NINE_REALMS, STAGE_REALM_MAP, activeRealms);
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
			STAGE_GREEK_REALMS
				.filter(realm => getGreekRealmProgress(realm.id, ALL_CHAPTERS.find(chapter => chapter.faction === 'greek')!.missions, completedMissions).completed > 0)
				.map(realm => realm.id),
		);

		return buildConnectionData(STAGE_GREEK_REALMS, STAGE_GREEK_REALM_MAP, activeRealms);
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
			className={`mission-node-card group/mission w-full rounded-xl border p-4 text-left transition-[background-color,border-color,box-shadow] duration-200 ${
				completed
					? 'mission-node-card-completed border-rune-500/40 bg-rune-500/[0.08] hover:bg-rune-500/[0.14] hover:border-rune-300/60'
					: unlocked
						? 'mission-node-card-unlocked border-obsidian-700 bg-obsidian-900/60 hover:border-gold-300/50 hover:bg-obsidian-800/70'
						: 'mission-node-card-locked cursor-not-allowed border-obsidian-700/60 bg-obsidian-950/40 opacity-50'
			}`}
		>
			<div className="flex items-start gap-3">
				<div className={`mission-node-sigil flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-display text-sm font-bold tracking-wider ${
					completed
						? 'bg-rune-500 text-obsidian-950 shadow-[0_0_12px_-2px_rgba(143,181,115,0.55)]'
						: unlocked
							? 'bg-obsidian-800 border border-obsidian-600 text-ink-100 group-hover/mission:border-gold-300/60 group-hover/mission:text-gold-200'
							: 'bg-obsidian-900 border border-obsidian-700 text-ink-400'
				}`}>
					{completed ? <Check size={18} aria-hidden={true} /> : mission.missionNumber}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className={`font-display text-sm font-bold tracking-wide ${
							completed ? 'text-rune-300' : unlocked ? 'text-ink-0' : 'text-ink-400'
						}`}>
							{mission.name}
						</p>
						{mission.isChapterFinale && (
							<span className="inline-flex items-center h-5 rounded-full border border-blood-300/40 bg-blood-500/15 px-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-blood-300">
								Finale
							</span>
						)}
						{!mission.isChapterFinale && mission.bossRules.length > 0 && (
							<span className="inline-flex items-center h-5 rounded-full border border-ember-300/30 bg-ember-300/10 px-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ember-200">
								Boss
							</span>
						)}
					</div>
					<p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">
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
		<button
			type="button"
			aria-label={`${realm.name}: ${progress.completed} of ${progress.total} missions cleared`}
			aria-pressed={selected}
			disabled={!hasMissions}
			className={`realm-node ${!hasMissions ? 'realm-node-locked' : ''} ${selected ? 'realm-node-selected' : ''} ${hasUnlockedMission && !allDone ? 'realm-node-available' : ''}`}
			style={{ left: `${realm.position.x}%`, top: `${realm.position.y}%` }}
			onClick={onClick}
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
				<span className="realm-aura" aria-hidden="true" />
				<img className="realm-sigil-frame" src={REALM_SIGIL_FRAME_SRC} alt="" loading="lazy" />
				<span className="realm-sigil-core" aria-hidden="true" />
				<span className="realm-rune" aria-hidden="true">{realm.runeSymbol}</span>
			</div>
			<span className="realm-name" style={{ color: realm.color }}>{realm.name}</span>
			{!hasMissions && <span className="realm-locked-label">Locked</span>}
		</button>
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
		<button
			type="button"
			aria-label={`${realm.name}: ${progress.completed} of ${progress.total} missions cleared`}
			aria-pressed={selected}
			disabled={!hasMissions}
			className={`realm-node ${!hasMissions ? 'realm-node-locked' : ''} ${selected ? 'realm-node-selected' : ''} ${hasUnlockedMission && !allDone ? 'realm-node-available' : ''}`}
			style={{ left: `${realm.position.x}%`, top: `${realm.position.y}%` }}
			onClick={onClick}
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
				<span className="realm-aura" aria-hidden="true" />
				<img className="realm-sigil-frame" src={REALM_SIGIL_FRAME_SRC} alt="" loading="lazy" />
				<span className="realm-sigil-core" aria-hidden="true" />
				<span className="realm-rune" aria-hidden="true">{realm.symbol}</span>
			</div>
			<span className="realm-name" style={{ color: realm.color }}>{realm.name}</span>
			{!hasMissions && <span className="realm-locked-label">Locked</span>}
		</button>
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
			<button
				type="button"
				className="inline-flex items-center gap-1.5 mb-4 font-mono text-[11px] tracking-[0.18em] uppercase font-bold text-ink-300 hover:text-gold-300 transition-colors"
				onClick={onClose}
			>
				<ChevronLeft size={13} strokeWidth={2.2} />
				Back to Map
			</button>

			<div className="mb-5 pb-4 border-b border-obsidian-700">
				<h3
					className="font-display text-2xl font-bold tracking-[0.04em]"
					style={{ color: realm.color }}
				>
					{realm.name}
				</h3>
				<p className="mt-2 text-[13px] leading-relaxed text-ink-300">{description}</p>

				<div className="mt-4 flex flex-wrap gap-2">
					<span className={PILL_CLASS}>
						{cleared}/{missions.length} cleared
					</span>
					{effect && (
						<span className={PILL_CLASS}>
							{symbol} {effect}
						</span>
					)}
				</div>

				{effect && effectDescription && (
					<p className="mt-3 text-[12px] leading-relaxed text-ink-200">{effectDescription}</p>
				)}
			</div>

			{nextMission ? (
				<div className={`${SURFACE_CLASS} mb-4`}>
					<p className={KICKER_CLASS}>Next Route</p>
					<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">{nextMission.name}</p>
					<p className="mt-2 text-[13px] leading-relaxed text-ink-300">{nextMission.description}</p>
					<Button variant="primary" size="sm" className="mt-4 w-full" onClick={() => onSelectMission(nextMission)}>
						Open Briefing
					</Button>
				</div>
			) : missions.length > 0 && cleared === missions.length ? (
				<div className={`${SURFACE_CLASS} mb-4 border-rune-500/30 bg-rune-500/[0.06]`}>
					<p className={`${KICKER_CLASS} text-rune-300`}>Realm Status</p>
					<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">Realm secured</p>
					<p className="mt-2 text-[13px] leading-relaxed text-ink-300">
						All authored missions cleared. Revisit any mission below for another pass.
					</p>
				</div>
			) : null}

			{allLocked && (
				<div className="mb-4 rounded-xl border border-gold-600/30 bg-gold-300/[0.06] p-3 text-[12.5px] leading-relaxed text-gold-100">
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
	const pageRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();
	const startMission = useCampaignStore(state => state.startMission);
	const markCinematicSeen = useCampaignStore(state => state.markCinematicSeen);
	const currentMissionId = useCampaignStore(state => state.currentMission);
	const completedMissions = useCampaignStore(state => state.completedMissions);
	const seenCinematics = useCampaignStore(state => state.seenCinematics);
	const isAllComplete = useCampaignStore(state => state.isAllBaseChaptersComplete(BASE_CHAPTER_MISSION_IDS));
	const hiveUsername = useNFTUsername();
	const campaignAccess = resolveProtectedFlowAccess({
		accountId: hiveUsername,
		authenticatedAccountId: hiveUsername,
		sharedNetwork: isSharedNetworkEnvironment(),
		surface: 'campaign',
		requiresAuthenticatedSession: false,
	});

	const norseChapter = ALL_CHAPTERS.find(chapter => chapter.faction === 'norse')!;
	const greekChapter = ALL_CHAPTERS.find(chapter => chapter.faction === 'greek')!;
	const beyondChapters = ALL_CHAPTERS.filter(chapter => chapter.faction !== 'norse' && chapter.faction !== 'greek');
	const totalCampaignMissions = useMemo(
		() => ALL_CHAPTERS.reduce((sum, chapter) => sum + chapter.missions.length, 0),
		[],
	);
	const totalClearedMissions = Object.keys(completedMissions).length;
	const sagaPercent = totalCampaignMissions > 0
		? Math.round((totalClearedMissions / totalCampaignMissions) * 100)
		: 0;
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

	useEffect(() => {
		if (campaignAccess.kind !== 'blocked') return;
		setSelectedRealm(null);
		setSelectedMission(null);
		setSelectedChapter(null);
		setCinematicChapter(null);
	}, [campaignAccess.kind]);

	useEffect(() => {
		if (selectedMission || campaignAccess.kind === 'blocked') return;
		const root = pageRef.current;
		if (!root) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		let alive = true;
		let context: { revert: () => void } | null = null;
		const cleanupFns: Array<() => void> = [];

		void import('gsap').then(({ gsap }) => {
			if (!alive) return;
			context = gsap.context(() => {
				gsap.set('.realm-rune', {
					transformOrigin: '50% 50%',
					force3D: true,
				});

				if (root.querySelector('.realm-node-available .realm-sigil-frame')) {
					gsap.to('.realm-node-available .realm-sigil-frame', {
						rotation: 360,
						duration: 24,
						ease: 'none',
						repeat: -1,
						transformOrigin: '50% 50%',
					});
					gsap.to('.realm-node-available .realm-aura', {
						opacity: 0.78,
						scale: 1.12,
						duration: 1.45,
						ease: 'sine.inOut',
						repeat: -1,
						yoyo: true,
						transformOrigin: '50% 50%',
					});
				}
				if (root.querySelector('.realm-node-available:not(.realm-node-selected) .realm-rune')) {
					gsap.to('.realm-node-available:not(.realm-node-selected) .realm-rune', {
						y: -1,
						scale: 1.08,
						filter: 'drop-shadow(0 0 12px var(--realm-glow)) brightness(1.18)',
						duration: 1.35,
						ease: 'sine.inOut',
						repeat: -1,
						yoyo: true,
						stagger: { each: 0.12, from: 'random' },
					});
				}
				if (root.querySelector('.realm-node-selected .realm-sigil-core')) {
					gsap.to('.realm-node-selected .realm-sigil-core', {
						scale: 1.08,
						duration: 1.1,
						ease: 'sine.inOut',
						repeat: -1,
						yoyo: true,
						transformOrigin: '50% 50%',
					});
				}
				if (root.querySelector('.realm-node-selected .realm-rune')) {
					gsap.to('.realm-node-selected .realm-rune', {
						y: -2,
						scale: 1.14,
						filter: 'drop-shadow(0 0 16px var(--realm-glow)) brightness(1.25)',
						duration: 1,
						ease: 'sine.inOut',
						repeat: -1,
						yoyo: true,
					});
				}

				const interactiveNodes = Array.from(root.querySelectorAll<HTMLButtonElement>('.realm-node:not(.realm-node-locked)'));
				for (const node of interactiveNodes) {
					const rune = node.querySelector<HTMLElement>('.realm-rune');
					const core = node.querySelector<HTMLElement>('.realm-sigil-core');
					const aura = node.querySelector<HTMLElement>('.realm-aura');
					if (!rune || !core || !aura) continue;

					const hoverTimeline = gsap.timeline({
						paused: true,
						defaults: {
							duration: 0.26,
							ease: 'power2.out',
							overwrite: 'auto',
						},
					});
					hoverTimeline
						.to(rune, {
							y: -3,
							scale: 1.22,
							rotation: 2.5,
							filter: 'drop-shadow(0 0 18px var(--realm-glow)) brightness(1.32)',
						}, 0)
						.to(core, {
							scale: 1.1,
							filter: 'brightness(1.18)',
						}, 0)
						.to(aura, {
							opacity: 0.88,
							scale: 1.2,
						}, 0);

					const play = () => hoverTimeline.play();
					const reverse = () => hoverTimeline.reverse();
					node.addEventListener('pointerenter', play);
					node.addEventListener('pointerleave', reverse);
					node.addEventListener('focusin', play);
					node.addEventListener('focusout', reverse);
					cleanupFns.push(() => {
						node.removeEventListener('pointerenter', play);
						node.removeEventListener('pointerleave', reverse);
						node.removeEventListener('focusin', play);
						node.removeEventListener('focusout', reverse);
					});
				}
			}, root);
		});

		return () => {
			alive = false;
			for (const cleanup of cleanupFns) cleanup();
			context?.revert();
		};
	}, [campaignAccess.kind, selectedMission, selectedRealm, totalClearedMissions, view]);

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
			STAGE_NINE_REALMS
				.filter(realm => getRealmProgress(realm.id, norseChapter.missions, completedMissions).completed > 0)
				.map(realm => realm.id),
		);
		return buildConnectionData(STAGE_NINE_REALMS, STAGE_REALM_MAP, activeRealms);
	}, [norseChapter.missions, completedMissions]);

	const greekConnections = useMemo(() => {
		const activeRealms = new Set(
			STAGE_GREEK_REALMS
				.filter(realm => getGreekRealmProgress(realm.id, greekChapter.missions, completedMissions).completed > 0)
				.map(realm => realm.id),
		);
		return buildConnectionData(STAGE_GREEK_REALMS, STAGE_GREEK_REALM_MAP, activeRealms);
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
		if (campaignAccess.kind === 'blocked') return;
		if (!selectedMission) return;
		startMission(selectedMission.id, difficulty);
		navigate(routes.campaignGame);
	};

	const chapterProgressLabel = currentDisplayChapter
		? `${chapterProgressById.get(currentDisplayChapter.id) ?? 0}/${currentDisplayChapter.missions.length} in chapter`
		: null;

	const hasCurrentPrologue = currentDisplayChapter?.cinematicIntro != null;
	const hasSeenCurrentPrologue = currentDisplayChapter ? seenCinematics.includes(currentDisplayChapter.id) : false;

	if (campaignAccess.kind === 'blocked') {
		return (
			<div className="relative min-h-dvh w-full overflow-y-auto overflow-x-hidden text-ink-0 bg-(image:--bg-cosmos-nav)">
				<CampaignHeader title="Campaign" subtitle="Hive account required" />
				<div className="n-page-gutter mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-md items-center">
					<div className={`${SURFACE_STRONG_CLASS} w-full p-6 text-center`}>
						<div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-300 mb-3">
							Account required
						</div>
						<h1 className="font-display text-2xl font-black uppercase tracking-[0.12em] text-ink-0 mb-3">
							{campaignAccess.title}
						</h1>
						<p className="text-sm leading-6 text-ink-200 mb-6">
							{campaignAccess.message}
						</p>
						<HiveKeychainLogin />
					</div>
				</div>
			</div>
		);
	}

	if (selectedMission) {
		const chapter = selectedChapter ?? norseChapter;
		return (
			<div className="relative min-h-dvh w-full overflow-y-auto overflow-x-hidden text-ink-0 bg-(image:--bg-cosmos-nav)">
				<div className="rune-border-decoration rune-border-top-left">{RUNE_CORNERS[0]}</div>
				<div className="rune-border-decoration rune-border-top-right">{RUNE_CORNERS[1]}</div>
				<div className="rune-border-decoration rune-border-bottom-left">{RUNE_CORNERS[2]}</div>
				<div className="rune-border-decoration rune-border-bottom-right">{RUNE_CORNERS[3]}</div>

				<CampaignHeader title="Mission Briefing" subtitle={`${chapter.name} · #${selectedMission.missionNumber}`} />

				<div className="n-page-gutter mx-auto max-w-5xl pb-12">
					<MissionBriefing
						mission={selectedMission}
						chapter={chapter}
						onStart={handleStartMission}
						onBack={() => setSelectedMission(null)}
						onWatchPrologue={() => openChapterCinematic(chapter)}
						accentClass={FACTION_ACCENT[chapter.faction]}
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
		<div
			ref={pageRef}
			className="campaign-route-shell relative flex h-dvh w-full flex-col overflow-hidden text-ink-0 bg-(image:--bg-cosmos-nav)"
		>
			<div className="rune-border-decoration rune-border-top-left">{RUNE_CORNERS[0]}</div>
			<div className="rune-border-decoration rune-border-top-right">{RUNE_CORNERS[1]}</div>
			<div className="rune-border-decoration rune-border-bottom-left">{RUNE_CORNERS[2]}</div>
			<div className="rune-border-decoration rune-border-bottom-right">{RUNE_CORNERS[3]}</div>

			<CampaignHeader title="Campaign" subtitle="Saga Theater · S01" />
			<main className="campaign-route-main flex min-h-0 flex-1 flex-col">

			{/* ── Map / Beyond bodies ─────────────────────────────────────────────────────── */}
			<div className={`campaign-stage-shell min-h-0 flex-1 overflow-hidden ${view === 'beyond' ? 'campaign-stage-shell-beyond' : ''}`}>
				<div className={`campaign-stage-hud ${view === 'beyond' ? 'campaign-stage-hud-beyond' : ''}`}>
					<section className={`${SURFACE_STRONG_CLASS} campaign-command-bar relative overflow-hidden`} aria-label="Campaign command">
						<div
							aria-hidden
							className="absolute inset-0 pointer-events-none opacity-65"
							style={{
								background:
									'radial-gradient(ellipse 60% 45% at 88% 8%, rgba(221,184,74,0.18), transparent 65%),' +
									'radial-gradient(ellipse 45% 35% at 12% 92%, rgba(122,169,255,0.12), transparent 70%)',
							}}
						/>

						<div className="campaign-command-grid relative">
							<div className="campaign-command-heading">
								<div className="min-w-0">
									<div className="inline-flex items-center gap-2.5">
										<Compass size={14} className="text-gold-300" strokeWidth={1.8} />
										<span className={KICKER_CLASS}>
											{campaignLead?.title ?? 'Campaign Theater'}
										</span>
									</div>
									<h2 className="campaign-hud-title mt-2 font-display font-black uppercase leading-none tracking-[0.06em] text-ink-0">
										<span className="bg-linear-to-b from-gold-100 via-gold-300 to-gold-500 bg-clip-text text-transparent">
											{campaignLead
												? campaignLead.mission.name
												: currentDisplayChapter
													? currentDisplayChapter.name
													: 'Choose your saga line'}
										</span>
									</h2>
								</div>
								<div className="campaign-command-emblem" aria-hidden="true">
									<img src={REALM_SIGIL_FRAME_SRC} alt="" loading="lazy" />
									<span>{campaignLead ? campaignLead.mission.missionNumber : 'I'}</span>
								</div>
							</div>

							<div className="min-w-0">
								<p className="campaign-hud-copy mt-2 max-w-3xl text-[13px] leading-[1.5] text-ink-200">
									{campaignLead
										? `${campaignLead.chapter.name} · Mission ${campaignLead.mission.missionNumber}`
										: currentDisplayChapter
											? currentDisplayChapter.description
											: 'Beyond opens into later mythologies and the secret gate. Clear the base arcs, then push into the deeper campaign line.'}
								</p>
								<div className="campaign-command-meta">
									<span>Saga {totalClearedMissions}/{totalCampaignMissions}</span>
									{chapterProgressLabel && <span>{chapterProgressLabel}</span>}
									<span>{sagaPercent}% complete</span>
								</div>
							</div>

							<div className="campaign-command-actions">
								{campaignLead && (
									<Button
										variant="primary"
										size="sm"
										className="campaign-primary-action"
										onClick={() => stageMission(campaignLead.mission, campaignLead.chapter, campaignLead.view)}
									>
										<Play size={13} strokeWidth={2.4} fill="currentColor" />
										{campaignLead.cta}
									</Button>
								)}
								{hasCurrentPrologue && (
									<Button
										variant="default"
										size="sm"
										className="campaign-secondary-action"
										onClick={() => openChapterCinematic(currentDisplayChapter)}
									>
										{hasSeenCurrentPrologue ? 'Replay Prologue' : 'Play Prologue'}
									</Button>
								)}
							</div>

						</div>
					</section>

					<nav
						aria-label="Campaign sections"
						className="campaign-hud-tabs flex gap-2 overflow-x-auto [scrollbar-width:none]"
					>
						{(['norse', 'greek', 'beyond'] as const).map(tab => {
							const labels: Record<View, string> = { norse: 'Nine Realms', greek: 'Olympus', beyond: 'Beyond' };
							const active = view === tab;
							return (
								<button
									key={tab}
									type="button"
									onClick={() => {
										setView(tab);
										setSelectedRealm(null);
										if (tab !== 'beyond') setSelectedChapter(null);
									}}
									className={`shrink-0 inline-flex items-center h-9 px-4 rounded-full font-display text-[12px] tracking-[0.18em] uppercase font-bold transition-colors ${
										active
											? 'bg-gold-300/12 border border-gold-300/40 text-gold-300 shadow-[inset_0_0_18px_-6px_rgba(221,184,74,0.4)]'
											: 'bg-obsidian-850/90 border border-obsidian-700 text-ink-200 hover:text-gold-300 hover:border-gold-600'
									}`}
								>
									{labels[tab]}
								</button>
							);
						})}
					</nav>
				</div>
				{view === 'norse' ? (
					<div className="campaign-board-scroll">
						<div className="constellation-map-area">
							<CosmicCanvas realms={STAGE_NINE_REALMS} connections={norseConnections} className="constellation-cosmic-canvas" />
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

							{STAGE_NINE_REALMS.map(realm => (
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
					</div>
				) : view === 'greek' ? (
					<div className="campaign-board-scroll">
						<div className="constellation-map-area">
							<CosmicCanvas realms={STAGE_GREEK_REALMS} connections={greekConnections} className="constellation-cosmic-canvas" />
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

							{STAGE_GREEK_REALMS.map(realm => (
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
					</div>
				) : selectedChapter ? (
					<div className="campaign-beyond-scroll">
						<ChapterDetail
							chapter={selectedChapter}
							chapterProgressById={chapterProgressById}
							nextMissionByChapter={nextMissionByChapter}
							seenCinematics={seenCinematics}
							onBack={() => setSelectedChapter(null)}
							onPlayPrologue={openChapterCinematic}
							onSelectMission={mission => setSelectedMission(mission)}
							onStageNextBattle={() => {
								const nextMission = nextMissionByChapter.get(selectedChapter.id);
								if (nextMission) stageMission(nextMission, selectedChapter, 'beyond');
							}}
						/>
					</div>
				) : (
					<div className="campaign-beyond-scroll">
						<div className="beyond-grid" aria-label="Beyond chapters">
							{beyondChapters.map(chapter => (
								<BeyondCard
									key={chapter.id}
									chapter={chapter}
									progress={chapterProgressById.get(chapter.id) ?? 0}
									nextMission={nextMissionByChapter.get(chapter.id) ?? null}
									prologueSeen={seenCinematics.includes(chapter.id)}
									onPlayPrologue={() => openChapterCinematic(chapter)}
									onOpen={() => setSelectedChapter(chapter)}
								/>
							))}

							{isAllComplete && (
								<BeyondCard
									secret
									chapter={EASTERN_CHAPTER}
									progress={chapterProgressById.get(EASTERN_CHAPTER.id) ?? 0}
									nextMission={nextMissionByChapter.get(EASTERN_CHAPTER.id) ?? null}
									prologueSeen={seenCinematics.includes(EASTERN_CHAPTER.id)}
									onPlayPrologue={() => openChapterCinematic(EASTERN_CHAPTER)}
									onOpen={() => setSelectedChapter(EASTERN_CHAPTER)}
								/>
							)}

							{!isAllComplete && (
								<article
									className="beyond-card beyond-card-locked runic-panel ornate-corners-host ornate-corners-host--obsidian"
									style={{ '--beyond-scene': `url("${BEYOND_SCENE_SRC.twilight}")` } as React.CSSProperties}
								>
									<OrnateCorners />
									<div className="beyond-card-frame">
										<div className="beyond-card-scene" aria-hidden="true">
											<img src={BEYOND_SCENE_SRC.twilight} alt="" loading="lazy" />
											<div className="beyond-card-sigil">
												<SigilBackplate tier="obsidian" />
												<span>{BEYOND_SIGIL_MARK.twilight}</span>
											</div>
										</div>
										<div className="beyond-card-copy">
											<p className={KICKER_CLASS}>Locked Arc</p>
											<h3 className="mt-2 font-display text-2xl font-bold tracking-[0.04em] text-ink-200">
												The Celestial Gate
											</h3>
											<p className="mt-3 text-[13px] leading-relaxed text-ink-300">
												Clear every visible chapter to open the hidden mythology line.
											</p>
										</div>
										<div className={`${SURFACE_CLASS} beyond-card-route`}>
											<p className={`${KICKER_CLASS} text-left`}>Gate Requirement</p>
											<p className="mt-2 font-display text-[15px] font-bold tracking-wide text-ink-0">
												Base arcs first
											</p>
											<p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">
												Finish the visible saga routes before this mythology branch unlocks.
											</p>
										</div>
										<div className="beyond-locked-status">
											Sealed
										</div>
									</div>
								</article>
							)}
						</div>
					</div>
				)}
			</div>
			</main>

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

/* ────────────────────────────────────────────────────────────────────────────
 * Sticky page header — mirrors HomePage so the campaign feels like a sister
 * surface, not a separate app. Shows back link + title + subtitle, all in
 * the canonical Norse type system.
 * ──────────────────────────────────────────────────────────────────────────── */
function CampaignHeader({ title, subtitle }: { title: string; subtitle: string }) {
	const username = useNFTUsername();
	return (
		<header className="sticky top-0 z-40 backdrop-blur-md bg-obsidian-950/80 border-b border-obsidian-700">
			<div className="n-page-gutter mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3">
				<div className="flex items-center gap-3 min-w-0">
					<Link
						to={routes.home}
						className="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-md border border-obsidian-700 bg-obsidian-900/60 text-ink-300 hover:text-gold-300 hover:border-gold-600/60 transition-colors"
						aria-label="Back to home"
					>
						<ChevronLeft size={16} strokeWidth={2} />
					</Link>
					<div className="leading-none min-w-0">
						<div className="font-display text-sm font-bold tracking-[0.18em] uppercase text-gold-300 truncate">
							{title}
						</div>
						<div className="font-mono text-[10px] tracking-[0.16em] text-ink-300 mt-1 truncate">
							{subtitle}
						</div>
					</div>
				</div>
				<AccountSlot
					username={username}
					tier="premium"
					to={routes.wallet}
					secondary="Saga"
				/>
			</div>
		</header>
	);
}

function BeyondCard({
	chapter,
	progress,
	nextMission,
	prologueSeen,
	onPlayPrologue,
	onOpen,
	secret = false,
}: {
	chapter: CampaignChapter;
	progress: number;
	nextMission: CampaignMission | null;
	prologueSeen: boolean;
	onPlayPrologue: () => void;
	onOpen: () => void;
	secret?: boolean;
}) {
	const accent = FACTION_ACCENT[chapter.faction] ?? 'text-ink-100';
	const borderHover = FACTION_BORDER[chapter.faction] ?? 'hover:border-gold-300/45';
	const atmosphere = FACTION_ATMOSPHERE[chapter.faction] ?? FACTION_ATMOSPHERE.twilight;
	const sceneSrc = BEYOND_SCENE_SRC[chapter.faction] ?? BEYOND_SCENE_SRC.twilight;
	const sigilTier = BEYOND_SIGIL_TIER[chapter.faction] ?? 'obsidian';
	const sigilMark = BEYOND_SIGIL_MARK[chapter.faction] ?? 'SG';
	const progressPct = chapter.missions.length > 0
		? Math.round((progress / chapter.missions.length) * 100)
		: 0;

	return (
		<article
			className={`beyond-card beyond-card-${chapter.faction} runic-panel ornate-corners-host ornate-corners-host--${sigilTier} relative overflow-hidden border transition-colors duration-300 ${borderHover} ${
				secret
					? 'border-blood-300/40 bg-linear-to-b from-obsidian-850 to-obsidian-950'
					: 'border-obsidian-700 bg-linear-to-b from-obsidian-850 to-obsidian-950'
			}`}
			style={{
				'--beyond-atmosphere': atmosphere,
				'--beyond-scene': `url("${sceneSrc}")`,
			} as React.CSSProperties}
		>
			<OrnateCorners />

			<div className="beyond-card-frame relative z-10">
				<div className="beyond-card-scene" aria-hidden="true">
					<img src={sceneSrc} alt="" loading="lazy" />
					<div className="beyond-card-sigil">
						<SigilBackplate tier={sigilTier} />
						<span>{sigilMark}</span>
					</div>
				</div>
				<div className="beyond-card-copy">
					<p className={KICKER_CLASS}>
						{secret ? 'Secret Gate' : 'Chapter Theater'}
					</p>
					<h3 className={`mt-2 font-display text-2xl font-bold tracking-[0.04em] uppercase ${accent}`}>
						{secret ? 'The Celestial Gate' : chapter.name}
					</h3>
					<p className="mt-3 text-[13px] leading-relaxed text-ink-200">
						{secret
							? 'Chinese, Japanese, and Hindu myth lines converge beyond the base arcs. The gate is open now.'
							: chapter.description}
					</p>
				</div>

				<div className={`${SURFACE_CLASS} beyond-card-route`}>
					<p className={`${KICKER_CLASS} text-left`}>{secret ? 'Gate Status' : 'Next Route'}</p>
					<p className="mt-2 font-display text-[15px] font-bold tracking-wide text-ink-0">
						{secret
							? `${progress}/${chapter.missions.length} cleared`
							: nextMission?.name ?? 'Chapter cleared'}
					</p>
					<p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">
						{secret
							? 'A later mythology tranche with its own prologue, route, and finale cadence.'
							: (nextMission?.description ?? 'Replay the prologue or revisit completed fights to review the arc.')}
					</p>
				</div>

				<div className="beyond-card-progress">
					<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-obsidian-800">
						<div
								className="h-full rounded-full bg-linear-to-r from-gold-500 to-gold-200 transition-[width] duration-500"
							style={{ width: `${progressPct}%` }}
						/>
					</div>
					<span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-300 shrink-0">
						{progress}/{chapter.missions.length}
					</span>
				</div>

				<div className="beyond-card-actions">
					<Button variant="default" size="sm" onClick={onPlayPrologue}>
						{prologueSeen ? 'Replay Prologue' : 'Play Prologue'}
					</Button>
					<Button variant="primary" size="sm" onClick={onOpen}>
						Open Chapter
					</Button>
				</div>
			</div>
		</article>
	);
}

function ChapterDetail({
	chapter,
	chapterProgressById,
	nextMissionByChapter,
	seenCinematics,
	onBack,
	onPlayPrologue,
	onSelectMission,
	onStageNextBattle,
}: {
	chapter: CampaignChapter;
	chapterProgressById: Map<string, number>;
	nextMissionByChapter: Map<string, CampaignMission | null>;
	seenCinematics: string[];
	onBack: () => void;
	onPlayPrologue: (chapter: CampaignChapter) => void;
	onSelectMission: (mission: CampaignMission) => void;
	onStageNextBattle: () => void;
}) {
	const accent = FACTION_ACCENT[chapter.faction] ?? 'text-ink-0';
	const nextMission = nextMissionByChapter.get(chapter.id) ?? null;
	const progress = chapterProgressById.get(chapter.id) ?? 0;

	return (
		<div className="n-page-gutter mx-auto max-w-5xl pb-12">
			<motion.div
				initial={{ opacity: 0, y: 18 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
				className={`${SURFACE_STRONG_CLASS} p-5 sm:p-7`}
			>
				<button
					type="button"
					onClick={onBack}
					className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.18em] uppercase font-bold text-ink-300 hover:text-gold-300 transition-colors"
				>
					<ChevronLeft size={13} strokeWidth={2.2} />
					Back to chapters
				</button>

				<div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0">
						<p className={KICKER_CLASS}>Chapter Brief</p>
						<h2 className={`mt-2 font-display text-3xl font-bold tracking-[0.04em] uppercase ${accent}`}>
							{chapter.name}
						</h2>
						<p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-200">
							{chapter.description}
						</p>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem] lg:grid-cols-1">
						<div className={SURFACE_CLASS}>
							<p className={`${KICKER_CLASS} text-left`}>Chapter Progress</p>
							<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">
								{progress}/{chapter.missions.length}
							</p>
							<p className="mt-1 text-[12.5px] text-ink-300">Cleared missions inside this arc.</p>
						</div>
						<div className={SURFACE_CLASS}>
							<p className={`${KICKER_CLASS} text-left`}>Next Route</p>
							<p className="mt-2 font-display text-base font-bold tracking-wide text-ink-0">
								{nextMission?.name ?? 'Chapter cleared'}
							</p>
							<p className="mt-1 text-[12.5px] text-ink-300">
								{nextMission?.description ?? 'Replay the chapter or revisit missions as needed.'}
							</p>
						</div>
					</div>
				</div>

				<div className="mt-5 flex flex-wrap gap-2">
					{chapter.cinematicIntro && (
						<Button variant="default" size="default" onClick={() => onPlayPrologue(chapter)}>
							{seenCinematics.includes(chapter.id) ? 'Replay Prologue' : 'Play Prologue'}
						</Button>
					)}
					{nextMission && (
						<Button variant="primary" size="default" onClick={onStageNextBattle}>
							Stage Next Battle
						</Button>
					)}
				</div>
			</motion.div>

			<div className="mt-5 space-y-2">
				{chapter.missions.map(mission => (
					<MissionNode key={mission.id} mission={mission} onSelect={onSelectMission} />
				))}
			</div>
		</div>
	);
}
