import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { routes } from './lib/routes';
import { Button, Panel } from './components/ui-norse';
import { ChevronRight, Compass, LayoutGrid, Play, Settings as SettingsIcon, Swords } from 'lucide-react';
import UnifiedCardSystem from "./game/components/UnifiedCardSystem";
import "./index.css";
import { CardTransformProvider } from "./game/context/CardTransformContext";
import CardTransformBridgeInitializer from "./game/components/CardTransformBridgeInitializer";
import ragnarokLogo from "./assets/images/ragnarok-logo.jpg";
import LoadingScreen from "./game/components/ui/LoadingScreen";
import GoldenCardFilter from "./game/animations/GoldenCardFilter";
import { ALL_CHAPTERS, getMission, useCampaignStore } from "./game/campaign";
import { useStarterStore } from "./game/stores/starterStore";
import { useNFTUsername } from "./game/nft/hooks";
import {
  BridgeRuntimeBoundary,
  CardDataRuntimeBoundary,
  GameplayRuntimeBoundary,
} from "./game/runtime/RuntimeBoundary";

const HiveKeychainLogin = lazy(() => import("./game/components/HiveKeychainLogin").then(m => ({ default: m.HiveKeychainLogin })));
const DailyQuestPanel = lazy(() => import("./game/components/quests/DailyQuestPanel"));
const FriendsPanel = lazy(() => import("./game/components/social/FriendsPanel"));

const RagnarokChessGame = lazy(() => import('./game/components/chess/RagnarokChessGame'));
const WarbandPage = lazy(() => import('./game/components/warband/WarbandPage'));
const MultiplayerGame = lazy(() => import('./game/components/multiplayer/MultiplayerGame').then(m => ({ default: m.MultiplayerGame })));
const PacksPage = lazy(() => import('./game/components/packs/PacksPage'));
const CollectionPage = lazy(() => import('./game/components/collection/CollectionPage'));
const RankedLadderPage = lazy(() => import('./game/components/ladder/RankedLadderPage'));
const CampaignPage = lazy(() => import('./game/components/campaign/CampaignPage'));
const TradingPage = lazy(() => import('./game/components/trading/TradingPage'));
const TournamentListPage = lazy(() => import('./game/components/tournament/TournamentListPage'));
const SpectatorView = lazy(() => import('./game/components/spectator/SpectatorView'));
const MatchHistoryPage = lazy(() => import('./game/components/replay/MatchHistoryPage'));
const SettingsPage = lazy(() => import('./game/components/settings/SettingsPage'));
const TreasuryPage = lazy(() => import('./game/components/treasury/TreasuryPage'));
const MarketplacePage = lazy(() => import('./game/components/marketplace/MarketplacePage'));
const ExplorerPage = lazy(() => import('./game/components/explorer/ExplorerPage'));
const AdminPanel = lazy(() => import('./game/components/admin/AdminPanel'));
const StarterPackCeremony = lazy(() => import('./game/components/StarterPackCeremony'));
const DuatClaimPopup = lazy(() => import('./game/components/DuatClaimPopup'));
const FactionPledgePopup = lazy(() =>
  import('./game/pvp').then(m => ({ default: m.FactionPledgePopup }))
);

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

// PWA install prompt
let deferredInstallPrompt: DeferredInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as DeferredInstallPromptEvent;
  });
}

// Offline wrapper for routes that need a server
function OnlineOnly({ children, label }: { children: React.ReactNode; label: string }) {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (!online) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-center px-8">
        <div>
          <p className="text-amber-400 text-xl font-bold mb-2">Offline Mode</p>
          <p className="text-gray-400 text-sm">{label} requires an internet connection.</p>
          <p className="text-gray-600 text-xs mt-4">Campaign, Collection, Deck Builder, and Settings work offline.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * HOME — Forge & Ember layout (iter 1: distribution only).
 * Structure:
 *   header (sticky)
 *   ├── banner             grid 1fr / 360px : copy + cta | stats panel
 *   ├── page grid          1fr / 380px (lg+) : main column | side rail
 *   │     ├── routes (3 horizontal mode cards)
 *   │     └── campaign feature card
 *   │     side rail:
 *   │     ├── Daily Quests panel
 *   │     └── Warband (FriendsPanel) panel
 *   └── footer (utility pills)
 * Visual polish (atmosphere, custom fonts, hover effects) lands in iter 2.
 * ──────────────────────────────────────────────────────────────────────────── */

/*
 * Mode card visual identity — gives each route its own atmosphere instead of
 * three identical tiles. We don't have hero artwork yet, so each card uses:
 *   - a mode-specific radial gradient (background "atmosphere")
 *   - an oversized decorative icon at the bottom-right (acts as art)
 *   - a vignette to anchor the text block at the bottom
 *   - an accent color (text + bottom strip + arrow + hover border)
 * When real art lands, the radial layer becomes the image and the rest stays.
 */
type AccentKey = 'ember' | 'gold' | 'bifrost';

interface ModeCard {
	title: string;
	kicker: string;
	description: string;
	to: string;
	icon: typeof Swords;
	accent: AccentKey;
	atmosphere: string; // CSS gradient string for the card's background mood
	cta: string;        // verb-led label, varies by intent (combat vs meta)
	intent: 'combat' | 'meta'; // drives Play-icon affordance + visual grouping
}

// `strip` is now a gradient class (transparent → accent → transparent) so the
// bottom accent fades into the obsidian background instead of butting hard
// against the gold Play button. Reads as a runic underline, not a hard rule.
const ACCENT: Record<AccentKey, { text: string; strip: string; border: string; arrow: string }> = {
	ember: {
		text: 'text-ember-300',
		strip: 'bg-linear-to-r from-transparent via-ember-300/80 to-transparent',
		border: 'hover:border-ember-300/50',
		arrow: 'text-ember-300',
	},
	gold: {
		text: 'text-gold-300',
		strip: 'bg-linear-to-r from-transparent via-gold-300/80 to-transparent',
		border: 'hover:border-gold-300/50',
		arrow: 'text-gold-300',
	},
	bifrost: {
		text: 'text-bifrost-300',
		strip: 'bg-linear-to-r from-transparent via-bifrost-300/70 to-transparent',
		border: 'hover:border-bifrost-300/50',
		arrow: 'text-bifrost-300',
	},
};

const MODE_CARDS: ReadonlyArray<ModeCard> = [
	{
		title: 'Ranked PvP',
		kicker: 'Competitive',
		description: 'Queue into live opponents, hold your nerve, and climb with the full combat ruleset.',
		to: routes.multiplayer,
		icon: Swords,
		accent: 'ember',
		atmosphere:
			'radial-gradient(ellipse 75% 60% at 85% 15%, rgba(217, 74, 18, 0.45), transparent 65%), ' +
			'radial-gradient(ellipse 50% 40% at 20% 90%, rgba(110, 31, 5, 0.35), transparent 70%)',
		cta: 'Fight',
		intent: 'combat',
	},
	{
		title: 'Campaign',
		kicker: 'Adventure',
		description: 'Push through faction storylines, boss phases, and realm-driven encounters.',
		to: routes.campaign,
		icon: Compass,
		accent: 'gold',
		atmosphere:
			'radial-gradient(ellipse 75% 60% at 85% 15%, rgba(192, 138, 36, 0.42), transparent 65%), ' +
			'radial-gradient(ellipse 50% 40% at 20% 90%, rgba(77, 52, 10, 0.45), transparent 70%)',
		cta: 'March',
		intent: 'combat',
	},
	{
		title: 'Collection',
		kicker: 'Deckbuilding',
		description: 'Review your cards, inspect rarity treatments, and tune the pieces behind your army.',
		to: routes.collection,
		icon: LayoutGrid,
		accent: 'bifrost',
		// Sober treatment: barely-there bifrost wash. Reads as "tool" not "battle".
		atmosphere:
			'radial-gradient(ellipse 60% 50% at 90% 10%, rgba(74, 111, 224, 0.10), transparent 70%)',
		cta: 'Browse',
		intent: 'meta',
	},
] as const;

// Settings lives next to the Account panel (gear icon) — universal access
// without competing with the route-shortcut chips below.
const UTILITY_LINKS: ReadonlyArray<{ label: string; to: string }> = [
	{ label: 'Packs', to: routes.packs },
	{ label: 'Trading', to: routes.trading },
	{ label: 'Tournaments', to: routes.tournaments },
	{ label: 'History', to: routes.history },
	{ label: 'Treasury', to: routes.treasury },
	{ label: 'Explorer', to: routes.explorer },
] as const;

function StatRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300">{label}</span>
			<span className={`font-display text-base tracking-[0.08em] ${highlight ? 'text-gold-300' : 'text-ink-0'}`}>
				{value}
			</span>
		</div>
	);
}

function SideRailPanel({ title, action, children }: {
	title: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<Panel className="p-5">
			<div className="flex items-center justify-between pb-3 mb-4 border-b border-obsidian-700">
				<div className="font-display text-xs tracking-[0.22em] uppercase text-ink-0 inline-flex items-center gap-2">
					<span className="w-1 h-3 rounded-sm bg-gold-300" />
					{title}
				</div>
				{action}
			</div>
			{children}
		</Panel>
	);
}

function HomePage() {
	const starterClaimed = useStarterStore(s => s.claimed);
	const completedMissions = useCampaignStore(s => s.completedMissions);
	const currentMissionId = useCampaignStore(s => s.currentMission);
	const hiveUsername = useNFTUsername();
	const [showCeremony, setShowCeremony] = useState(false);
	const [canInstall, setCanInstall] = useState(!!deferredInstallPrompt);

	const completedMissionCount = Object.keys(completedMissions).length;
	const totalMissionCount = useMemo(
		() => ALL_CHAPTERS.reduce((sum, chapter) => sum + chapter.missions.length, 0),
		[],
	);
	const activeMission = useMemo(
		() => (currentMissionId ? getMission(currentMissionId) : null),
		[currentMissionId],
	);
	const nextMission = useMemo(() => {
		if (activeMission) return activeMission;
		for (const chapter of ALL_CHAPTERS) {
			const mission = chapter.missions.find(candidate =>
				!completedMissions[candidate.id] &&
				(candidate.prerequisiteIds.length === 0 ||
					candidate.prerequisiteIds.every(id => Boolean(completedMissions[id]))),
			);
			if (mission) return { chapter, mission };
		}
		return null;
	}, [activeMission, completedMissions]);

	const primaryLabel = !starterClaimed
		? 'Claim Starter Deck'
		: activeMission
			? 'Resume Campaign'
			: completedMissionCount > 0
				? 'Continue Campaign'
				: 'Start Campaign';
	const activeFocusTitle = !starterClaimed
		? 'Starter Ceremony'
		: activeMission
			? activeMission.mission.name
			: nextMission?.mission.name ?? 'Saga Complete';
	const activeFocusChapter = !starterClaimed
		? 'Prologue · pending'
		: activeMission
			? `${activeMission.chapter.name} · Mission ${activeMission.mission.missionNumber}`
			: nextMission
				? `${nextMission.chapter.name} · Mission ${nextMission.mission.missionNumber}`
				: '—';
	const sagaPercent = totalMissionCount > 0
		? Math.round((completedMissionCount / totalMissionCount) * 100)
		: 0;

	useEffect(() => {
		const handler = () => setCanInstall(true);
		window.addEventListener('beforeinstallprompt', handler);
		return () => window.removeEventListener('beforeinstallprompt', handler);
	}, []);

	const triggerInstall = () => {
		if (deferredInstallPrompt) {
			deferredInstallPrompt.prompt();
			setCanInstall(false);
		}
	};

	return (
		<div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-obsidian-950 text-ink-0">
			{/* ── HEADER ─────────────────────────────────────────────────────── */}
			<header className="sticky top-0 z-50 backdrop-blur-md bg-obsidian-950/80 border-b border-obsidian-700">
				<div className="mx-auto max-w-[1600px] h-14 px-6 flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<img src={ragnarokLogo} alt="" className="w-8 h-8 rounded-md border border-obsidian-600 object-cover" />
						<div className="leading-none">
							<div className="font-display text-sm font-bold tracking-[0.18em] text-gold-300">RAGNAROK</div>
							<div className="font-mono text-[10px] tracking-[0.16em] text-ink-300 mt-1">FORGE &amp; EMBER · S01</div>
						</div>
					</div>
				</div>
			</header>

			{/* ── PAGE GRID: full-height main column + persistent right rail ──── */}
			<div className="mx-auto max-w-[1600px] px-6 mt-7 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-7 items-start">
				{/* MAIN COLUMN: banner + routes + daily quests.
				    pb-24 mirrors the right aside so neither column slides under
				    the anchored utility bar at the bottom. */}
				<main className="grid gap-7 content-start min-w-0 pb-24">
					{/* Banner */}
					<section className="relative grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-9 items-center px-10 py-10 rounded-2xl border border-obsidian-700 bg-linear-to-b from-obsidian-850 to-obsidian-900 overflow-hidden">
						<div>
							<div className="inline-flex items-center gap-2.5 mb-4">
								<span className="w-2 h-2 rounded-full bg-ember-300" />
								<span className="font-mono text-[11px] tracking-[0.32em] uppercase text-gold-300 font-semibold">
									Live · Season 01 · The Forge Kindles
								</span>
							</div>
							<h1 className="font-display font-black uppercase leading-[0.95] tracking-[0.10em] text-[clamp(2.4rem,5vw,4rem)] m-0">
								<span className="bg-linear-to-b from-gold-100 via-gold-300 to-gold-500 bg-clip-text text-transparent">
									Claim the line.<br />March into battle.
								</span>
							</h1>
							<p className="mt-5 mb-7 max-w-[540px] text-ink-200 text-[15px] leading-[1.65]">
								Campaign is the clean front door — claim the starter line, stage a mission briefing, and break straight into live combat.
							</p>
							<div className="flex flex-wrap items-center gap-3">
								{!starterClaimed ? (
									<Button variant="primary" size="lg" onClick={() => setShowCeremony(true)}>
										Claim Starter Deck
									</Button>
								) : (
									<Link to={routes.campaign}>
										<Button variant="primary" size="lg">{primaryLabel}</Button>
									</Link>
								)}
								{canInstall && (
									<Button variant="outline" size="lg" ornate onClick={triggerInstall}>
										Install App
									</Button>
								)}
							</div>
						</div>

						{/* Stats panel */}
						<aside className="rounded-xl border border-gold-300/40 bg-obsidian-900/80 backdrop-blur-md p-6 grid gap-3.5 self-stretch">
							<StatRow label="Saga" value={`${completedMissionCount} / ${totalMissionCount}`} highlight />
							<StatRow label="Active" value={activeFocusTitle} />
							<StatRow label="Chapter" value={activeFocusChapter} />
							<StatRow label="Season" value="01 · Forge" />
							<div className="mt-1 pt-3 border-t border-obsidian-700">
								<div className="flex items-center justify-between mb-1.5">
									<span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300">Saga progress</span>
									<span className="font-mono text-[10px] tracking-[0.18em] uppercase text-gold-300">{sagaPercent}%</span>
								</div>
								<div className="h-1 rounded-full bg-obsidian-700 overflow-hidden">
									<div
										className="h-full bg-linear-to-r from-gold-500 to-gold-200"
										style={{ width: `${sagaPercent}%` }}
									/>
								</div>
							</div>
						</aside>
					</section>

					{/* Routes */}
					<section>
						<header className="mb-4">
							<div className="font-mono text-[11px] tracking-[0.32em] uppercase text-ink-300">Primary Routes</div>
							<h2 className="font-display text-xl tracking-[0.08em] uppercase text-ink-0 mt-1">Choose your front</h2>
						</header>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 [&>:nth-child(3)]:sm:ml-3">
							{MODE_CARDS.map(mode => {
								const Icon = mode.icon;
								const a = ACCENT[mode.accent];
								const isCombat = mode.intent === 'combat';
								return (
									<Link
										key={mode.title}
										to={mode.to}
										className={`relative group flex flex-col min-h-[160px] p-4 rounded-xl border bg-linear-to-b overflow-hidden transition-all duration-300 ${a.border} ${
											isCombat
												? 'border-obsidian-700 from-obsidian-850 to-obsidian-950'
												: 'border-obsidian-700/60 from-obsidian-900 to-obsidian-950'
										}`}
									>
										{/* Atmospheric color layer (mode-specific). Sits below content. */}
										<div
											className="absolute inset-0 opacity-70 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none"
											style={{ background: mode.atmosphere }}
										/>

										{/* Oversized decorative icon — anchors the bottom-right as "art" */}
										<Icon
											className={`absolute -right-2 -bottom-2 w-20 h-20 ${a.text} opacity-[0.08] pointer-events-none`}
											strokeWidth={1}
										/>

										{/* Bottom vignette for text legibility on top of the gradient */}
										<div
											className="absolute inset-0 bg-linear-to-t from-obsidian-950/85 via-obsidian-950/30 to-transparent pointer-events-none"
										/>

										{/* Header row */}
										<div className="relative z-10 flex items-start justify-between mb-auto">
											<span className={`font-mono text-[10px] tracking-[0.32em] uppercase font-semibold ${a.text}`}>
												{mode.kicker}
											</span>
											<span className={`inline-flex items-center justify-center w-7 h-7 rounded-md bg-obsidian-900/70 backdrop-blur-sm border border-obsidian-700 ${a.text}`}>
												<Icon size={13} strokeWidth={1.8} />
											</span>
										</div>

										{/* Body */}
										<div className="relative z-10 mt-auto">
											<h3 className="font-display text-lg font-black tracking-[0.08em] uppercase text-ink-0 mb-1 leading-none">
												{mode.title}
											</h3>
											<p className="text-ink-200 text-[12px] leading-[1.5] mb-3 max-w-[95%]">
												{mode.description}
											</p>

											{/* CTA differentiated by intent — combat is a dramatic ceremonial
											    Play button (gold gradient, diamond ornaments, glow); meta is a
											    sober curatorial link. Both right-aligned to feel like an "action
											    corner" of the card. */}
											<div className="flex justify-end">
												{isCombat ? (
													<div
														className="inline-flex items-center gap-2.5 bg-linear-to-b from-gold-300 to-gold-500 border border-gold-200 px-4 py-2 font-display text-[12px] font-bold tracking-[0.24em] uppercase text-obsidian-950 shadow-[0_0_22px_-6px_rgba(217,168,68,0.65)] transition-all duration-300 group-hover:from-gold-200 group-hover:to-gold-400 group-hover:shadow-[0_0_32px_-4px_rgba(217,168,68,0.95)] group-hover:scale-[1.03]"
														style={{
															clipPath:
																'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
														}}
													>
														<span aria-hidden className="w-[5px] h-[5px] rotate-45 bg-current opacity-80 shrink-0" />
														<Play size={13} strokeWidth={2.4} fill="currentColor" className="shrink-0" />
														{mode.cta}
														<span aria-hidden className="w-[5px] h-[5px] rotate-45 bg-current opacity-80 shrink-0" />
													</div>
												) : (
													<div className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.22em] uppercase text-ink-300 transition-colors group-hover:text-bifrost-300">
														{mode.cta}
														<ChevronRight size={13} strokeWidth={2} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
													</div>
												)}
											</div>
										</div>

										{/* Bottom accent strip — runic underline that fades to the
									    obsidian backdrop on both ends, no longer butts the gold button. */}
										<span className={`absolute bottom-0 left-0 right-0 h-[2px] ${a.strip}`} />
									</Link>
								);
							})}
						</div>
					</section>

					{/* Daily Quests — actionable tasks live in main column, not sidebar.
					    DailyQuestPanel renders its own card grid (parallel to route cards). */}
					<section>
						<header className="mb-4">
							<div className="font-mono text-[11px] tracking-[0.32em] uppercase text-ink-300">Today's Saga</div>
							<h2 className="font-display text-xl tracking-[0.08em] uppercase text-ink-0 mt-1">Daily quests</h2>
						</header>
						<Suspense fallback={<div className="animate-pulse h-48 rounded-xl bg-obsidian-800" />}>
							<DailyQuestPanel />
						</Suspense>
					</section>

				</main>

				{/* RIGHT RAIL — pure identity stack: Account → Warband (post-login).
				    Warband has internal scroll so contacts can grow without breaking layout.
				    Settings lives in the Account panel header (gear icon) — universal
				    access without competing with the route-shortcut chips in the bottom bar. */}
				<aside className="grid gap-5 content-start pb-24">
					<SideRailPanel
						title="Account"
						action={
							<Link
								to={routes.settings}
								title="Settings"
								className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-obsidian-700 bg-obsidian-900/60 text-ink-300 hover:text-gold-300 hover:border-gold-600/60 transition-colors"
							>
								<SettingsIcon size={14} strokeWidth={1.8} />
							</Link>
						}
					>
						<Suspense fallback={<div className="animate-pulse h-20 rounded-xl bg-obsidian-800" />}>
							<HiveKeychainLogin />
						</Suspense>
					</SideRailPanel>
					{hiveUsername && (
						<SideRailPanel title="Warband">
							<div className="max-h-[420px] overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin]">
								<Suspense fallback={<div className="animate-pulse h-32 rounded-xl bg-obsidian-800" />}>
									<FriendsPanel />
								</Suspense>
							</div>
						</SideRailPanel>
					)}
				</aside>
			</div>

			{/* ── ANCHORED UTILITY BAR ───────────────────────────────────────────
			    Sticky bottom — always visible across home scroll. Mirrors the
			    sticky header above to bracket the page. Horizontal scroll on
			    overflow keeps it single-line on narrow viewports. */}
			<nav className="sticky bottom-0 z-40 backdrop-blur-md bg-obsidian-950/85 border-t border-obsidian-700">
				<div className="mx-auto max-w-[1600px] px-6 h-12 flex items-center justify-center gap-2 overflow-x-auto [scrollbar-width:none]">
					{UTILITY_LINKS.map(link => (
						<Link
							key={link.label}
							to={link.to}
							className="shrink-0 inline-flex items-center h-8 px-3.5 rounded-full border border-obsidian-700 bg-obsidian-850 text-ink-200 hover:text-gold-300 hover:border-gold-600 font-display text-xs tracking-[0.18em] uppercase font-bold transition-colors"
						>
							{link.label}
						</Link>
					))}
					{import.meta.env.DEV && (
						<Link
							to={routes.warband}
							className="shrink-0 inline-flex items-center h-8 px-3.5 rounded-full border border-dashed border-obsidian-600 text-ink-300 hover:text-ink-0 font-display text-xs tracking-[0.18em] uppercase opacity-70 hover:opacity-100 transition-opacity"
						>
							Casual Battle (dev)
						</Link>
					)}
				</div>
			</nav>

			{showCeremony && (
				<Suspense fallback={null}>
					<StarterPackCeremony onComplete={() => setShowCeremony(false)} />
				</Suspense>
			)}
		</div>
	);
}

/*
  ViewTransitionBridge — triggers the View Transitions API on route changes.
  This pairs with the ::view-transition-old/new CSS in index.css to create
  a subtle fade+scale between pages. Falls back silently on browsers that
  don't support the API (Safari, older Firefox).
*/
function ViewTransitionBridge() {
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (prevPath.current === location.pathname) return;
    prevPath.current = location.pathname;
    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => { });
    }
  }, [location.pathname]);

  return null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: 'var(--error-text)', background: 'var(--error-bg)', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1>Runtime Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 20 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 10, color: 'var(--error-stack)', fontSize: 12 }}>{this.state.error.stack}</pre>
          <button onClick={() => { this.setState({ error: null }); window.location.hash = '/'; }} style={{ marginTop: 20, padding: '10px 20px', background: 'var(--error-accent)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--error-bg)', fontWeight: 'bold' }}>Back to Home</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function GlobalOverlaysLayout() {
  return (
    <>
      <Outlet />
      <Suspense fallback={null}><DuatClaimPopup /></Suspense>
      <Suspense fallback={null}><FactionPledgePopup /></Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <CardTransformProvider>
        <CardTransformBridgeInitializer />
        <UnifiedCardSystem />
        <GoldenCardFilter />

        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ViewTransitionBridge />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route element={<BridgeRuntimeBoundary />}>
                <Route element={<GlobalOverlaysLayout />}>
                  <Route path={routes.home} element={<HomePage />} />
                  <Route path={routes.warband} element={<WarbandPage />} />
                  <Route path={routes.campaign} element={<CampaignPage />} />
                  <Route path={routes.collection} element={<CollectionPage />} />
                  <Route path={routes.ladder} element={<RankedLadderPage />} />
                  <Route path={routes.trading} element={<OnlineOnly label="Trading"><TradingPage /></OnlineOnly>} />
                  <Route path={routes.marketplace} element={<OnlineOnly label="Marketplace"><MarketplacePage /></OnlineOnly>} />
                  <Route path={routes.treasury} element={<OnlineOnly label="Treasury"><TreasuryPage /></OnlineOnly>} />
                  <Route path={routes.explorer} element={<ExplorerPage />} />
                  <Route path={routes.admin} element={<AdminPanel />} />
                  <Route path={routes.tournaments} element={<OnlineOnly label="Tournaments"><TournamentListPage /></OnlineOnly>} />
                  <Route path={routes.history} element={<MatchHistoryPage />} />
                  <Route path={routes.settings} element={<SettingsPage />} />

                  <Route element={<CardDataRuntimeBoundary />}>
                    <Route path={routes.packs} element={<PacksPage />} />
                  </Route>

                  <Route element={<GameplayRuntimeBoundary />}>
                    <Route path={routes.game} element={<RagnarokChessGame />} />
                    <Route path={routes.multiplayer} element={<MultiplayerGame />} />
                    <Route path={routes.spectate} element={<SpectatorView />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={
                <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
                  <h1 className="text-5xl font-bold text-amber-400 mb-4">404</h1>
                  <p className="text-gray-400 text-lg mb-8">Page not found</p>
                  <Link to={routes.home} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors">
                    Back to Home
                  </Link>
                </div>
              } />
            </Routes>
          </Suspense>
        </HashRouter>
      </CardTransformProvider>
    </ErrorBoundary>
  );
}

export default App;
