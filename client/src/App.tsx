import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { routes } from './lib/routes';
import { Button, Panel, ToastProvider } from './components/ui-norse';
import { ChevronRight, Compass, LayoutGrid, Play, RotateCw, Settings as SettingsIcon, Smartphone, Swords, X } from 'lucide-react';
import "./index.css";
import ragnarokLogo from "./assets/images/ragnarok-logo.jpg";
import LoadingScreen from "./game/components/ui/LoadingScreen";
import { EitrMigrationBanner } from "./game/components/migrations/EitrMigrationBanner";
import { ALL_CHAPTERS, getMission } from "./game/campaign/campaignLookup";
import { useCampaignStore } from "./game/campaign/campaignStore";
import { useStarterStore } from "./game/stores/starterStore";
import { useHiveDataStore } from "./data/HiveDataLayer";
import { createRuntimeStorageKey, getRagnarokNetworkConfig } from "./game/config/networkConfig";
import { getDataLayerMode, isSharedNetworkEnvironment, isTestnetStage } from "./game/config/featureFlags";
import { getRagnarokRuntimePhase } from '@shared/runtimeConfig';
import { resolveProtectedFlowAccess, type ProtectedFlowSurface } from "./game/auth/protectedFlowAccess";
import {
	BridgeRuntimeBoundary,
	CardDataRuntimeBoundary,
	GameplayRuntimeBoundary,
} from "./game/runtime/RuntimeBoundary";
import { getSeasonInfo, formatTimeRemaining } from './game/utils/seasonUtils';
import { isChunkLoadError, recoverFromChunkLoadError } from './lib/chunkLoadRecovery';

const HiveKeychainLogin = lazy(() => import("./game/components/HiveKeychainLogin").then(m => ({ default: m.HiveKeychainLogin })));
const DailyQuestPanel = lazy(() => import("./game/components/quests/DailyQuestPanel"));
const FriendsPanel = lazy(() => import("./game/components/social/FriendsPanel"));

const WarbandPage = lazy(() => import('./game/components/warband/WarbandPage'));
const MultiplayerGame = lazy(() => import('./game/components/multiplayer/MultiplayerGame').then(m => ({ default: m.MultiplayerGame })));
const PacksPage = lazy(() => import('./game/components/packs/PacksPage'));
const CollectionPage = lazy(() => import('./game/components/collection/CollectionPage'));
const RankedLadderPage = lazy(() => import('./game/components/ladder/RankedLadderPage'));
const CampaignPage = lazy(() => import('./game/components/campaign/CampaignPage'));
const MapPage = lazy(() => import('./game/components/map/MapPage'));
const TournamentListPage = lazy(() => import('./game/components/tournament/TournamentListPage'));
const MatchHistoryPage = lazy(() => import('./game/components/replay/MatchHistoryPage'));
const SettingsPage = lazy(() => import('./game/components/settings/SettingsPage'));
const TreasuryPage = lazy(() => import('./game/components/treasury/TreasuryPage'));
const MarketplacePage = lazy(() => import('./game/components/marketplace/MarketplacePage'));
const ExplorerPage = lazy(() => import('./game/components/explorer/ExplorerPage'));
const AdminPanel = lazy(() => import('./game/components/admin/AdminPanel'));

function getRuntimeProductLabel(): string {
	return getRagnarokRuntimePhase(getRagnarokNetworkConfig()) === 'alfa-testnet'
		? 'Alfa Practice'
		: 'Testnet';
}
const WalletPage = lazy(() => import('./game/components/wallet/WalletPage'));
const StarterPackCeremony = lazy(() => import('./game/components/StarterPackCeremony'));
const DuatClaimPopup = lazy(() => import('./game/components/DuatClaimPopup'));
const FactionPledgePopup = lazy(() =>
	import('./game/pvp/FactionPledgePopup').then(m => ({ default: m.FactionPledgePopup }))
);
const SocialPresenceHeartbeat = lazy(() => import('./game/components/social/SocialPresenceHeartbeat'));

const prototypeModules = import.meta.glob('./game/combat/prototypes/PokerViewportSafeAreaPrototype.tsx');
const PokerViewportSafeAreaPrototype = lazy(async () => {
	const loadPrototype = prototypeModules['./game/combat/prototypes/PokerViewportSafeAreaPrototype.tsx'];
	if (!import.meta.env.DEV || loadPrototype === undefined) {
		return { default: () => <Navigate to={routes.home} replace /> };
	}

	return loadPrototype() as Promise<{ default: React.ComponentType }>;
});

const CardVisualRuntimeLayout = lazy(async () => {
	const [
		{ CardTransformProvider },
		bridgeInitializerModule,
		unifiedCardSystemModule,
		goldenCardFilterModule,
	] = await Promise.all([
		import('./game/context/CardTransformContext'),
		import('./game/components/CardTransformBridgeInitializer'),
		import('./game/components/UnifiedCardSystem'),
		import('./game/animations/GoldenCardFilter'),
	]);
	const CardTransformBridgeInitializer = bridgeInitializerModule.default;
	const UnifiedCardSystem = unifiedCardSystemModule.default;
	const GoldenCardFilter = goldenCardFilterModule.default;

	return {
		default: function CardVisualRuntimeLayout() {
			return (
				<CardTransformProvider>
					<CardTransformBridgeInitializer />
					<UnifiedCardSystem />
					<GoldenCardFilter />
					<Outlet />
				</CardTransformProvider>
			);
		},
	};
});

const SingleGameRoute = lazy(async () => {
	const [{ MatchSetupSingle }, coordinatorModule] = await Promise.all([
		import('./game/match'),
		import('./game/coordinator/RagnarokGameCoordinator'),
	]);
	const RagnarokGameCoordinator = coordinatorModule.default;

	return {
		default: function SingleGameRoute() {
			return (
				<StarterEntitlementGate surface="quick_match">
					<MatchSetupSingle difficulty="normal" deckSource="warband">
						<RagnarokGameCoordinator />
					</MatchSetupSingle>
				</StarterEntitlementGate>
			);
		},
	};
});

const CampaignGameRoute = lazy(async () => {
	const [{ MatchSetupCampaign }, coordinatorModule] = await Promise.all([
		import('./game/match'),
		import('./game/coordinator/RagnarokGameCoordinator'),
	]);
	const RagnarokGameCoordinator = coordinatorModule.default;

	return {
		default: function CampaignGameRoute() {
			return (
				<ProtectedAccountGate surface="campaign_battle">
					<StarterEntitlementGate surface="campaign_battle">
						<MatchSetupCampaign fallback={<Navigate to={routes.campaign} replace />}>
							<RagnarokGameCoordinator />
						</MatchSetupCampaign>
					</StarterEntitlementGate>
				</ProtectedAccountGate>
			);
		},
	};
});

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

function normalizeHiveUsername(username: string | null | undefined): string | null {
	const normalized = username?.trim().toLowerCase().replace(/^@/, '') ?? '';
	return normalized.length > 0 ? normalized : null;
}

function useStoredHiveUsername(): string | null {
	return useHiveDataStore(state => normalizeHiveUsername(state.user?.hiveUsername));
}

function useIsHiveMode(): boolean {
	return getDataLayerMode() === 'hive';
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
			<div className="h-screen flex items-center justify-center bg-obsidian-950 text-center px-8">
				<div>
					<p className="font-display text-gold-300 text-xl font-bold tracking-[0.18em] uppercase mb-2">Offline Mode</p>
					<p className="text-ink-200 text-sm">{label} requires an internet connection.</p>
					<p className="text-ink-400 text-xs mt-4">Campaign, Collection, Deck Builder, and Settings work offline.</p>
				</div>
			</div>
		);
	}
	return <>{children}</>;
}

function ProtectedAccountGate({
	children,
	surface,
}: {
	children: React.ReactNode;
	surface: ProtectedFlowSurface;
}) {
	const hiveUsername = useStoredHiveUsername();
	const access = resolveProtectedFlowAccess({
		accountId: hiveUsername,
		sharedNetwork: isSharedNetworkEnvironment(),
		surface,
	});

	if (access.kind === 'allowed') return <>{children}</>;

	return (
		<div className="min-h-screen bg-obsidian-950 text-ink-0 flex items-center justify-center px-6">
			<div className="w-full max-w-md rounded-xl border border-obsidian-700 bg-obsidian-900/90 p-6 text-center shadow-2xl shadow-black/40">
				<div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-300 mb-3">
					Account required
				</div>
				<h1 className="font-display text-2xl font-black uppercase tracking-[0.12em] text-ink-0 mb-3">
					{access.title}
				</h1>
				<p className="text-sm leading-6 text-ink-200 mb-6">
					{access.message}
				</p>
				<Suspense fallback={null}>
					<HiveKeychainLogin />
				</Suspense>
				<div className="mt-5">
					<Link to={routes.home} className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400 hover:text-gold-300">
						Back Home
					</Link>
				</div>
			</div>
		</div>
	);
}

function StarterEntitlementGate({
	children,
	surface,
}: {
	children: React.ReactNode;
	surface: ProtectedFlowSurface;
}) {
	const hiveUsername = useStoredHiveUsername();
	const sharedNetwork = isSharedNetworkEnvironment();
	const starterClaimed = useStarterStore(state => (
		sharedNetwork
			? Boolean(hiveUsername && state.hasClaimed(hiveUsername))
			: state.hasClaimed(hiveUsername)
	));
	const [showCeremony, setShowCeremony] = useState(false);
	const access = resolveProtectedFlowAccess({
		accountId: hiveUsername,
		sharedNetwork,
		surface,
	});

	if (starterClaimed) return <>{children}</>;

	const requiresAccount = access.kind === 'blocked';

	return (
		<div className="min-h-screen bg-obsidian-950 text-ink-0 flex items-center justify-center px-6">
			<div className="w-full max-w-md rounded-xl border border-obsidian-700 bg-obsidian-900/90 p-6 text-center shadow-2xl shadow-black/40">
				<div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-300 mb-3">
					Starter required
				</div>
				<h1 className="font-display text-2xl font-black uppercase tracking-[0.12em] text-ink-0 mb-3">
					Claim before loadouts
				</h1>
				<p className="text-sm leading-6 text-ink-200 mb-6">
					{requiresAccount
						? access.message
						: 'This surface opens after the account claims its starter entitlement. This keeps deck building tied to the account-scoped protocol state before any battle can start.'}
				</p>
				{requiresAccount ? (
					<Suspense fallback={null}>
						<HiveKeychainLogin />
					</Suspense>
				) : (
					<Button variant="primary" size="lg" onClick={() => setShowCeremony(true)}>
						Reveal Starter Deck
					</Button>
				)}
				<div className="mt-4">
					<Link to={routes.home} className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400 hover:text-gold-300">
						Back Home
					</Link>
				</div>
			</div>

			{showCeremony && (
				<Suspense fallback={null}>
					<StarterPackCeremony
						accountId={hiveUsername}
						onComplete={() => setShowCeremony(false)}
						onCancel={() => setShowCeremony(false)}
					/>
				</Suspense>
			)}
		</div>
	);
}

/* ────────────────────────────────────────────────────────────────────────────
 * HOME — Forge & Ember layout (iter 1: distribution only).
 * Structure:
 *   header (sticky)
 *   ├── banner             grid 1fr / 360px : copy + cta | stats panel
 *   ├── page grid          1fr / 380px (lg+) : main column | side rail
 *   │     ├── routes (primary mode cards)
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
type AccentKey = 'ember' | 'gold' | 'bifrost' | 'rune';

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
	rune: {
		text: 'text-rune-300',
		strip: 'bg-linear-to-r from-transparent via-rune-300/70 to-transparent',
		border: 'hover:border-rune-300/50',
		arrow: 'text-rune-300',
	},
};

const MODE_CARDS: ReadonlyArray<ModeCard> = [
	{
		title: 'Single',
		kicker: 'Practice',
		description: 'Enter a quick AI match, test decks, and learn the combat loop without ranked pressure.',
		to: routes.singleGame,
		icon: Play,
		accent: 'bifrost',
		atmosphere:
			'radial-gradient(ellipse 70% 55% at 85% 18%, rgba(74, 111, 224, 0.24), transparent 68%), ' +
			'radial-gradient(ellipse 45% 42% at 20% 90%, rgba(192, 138, 36, 0.14), transparent 70%)',
		cta: 'Play',
		intent: 'combat',
	},
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
		title: 'Yggdrasil Atlas',
		kicker: 'Lore',
		description: 'Review realm origins, Gate effects, and pledged houses before campaign or PvP.',
		to: routes.map,
		icon: Compass,
		accent: 'rune',
		atmosphere:
			'radial-gradient(ellipse 70% 55% at 85% 18%, rgba(143, 181, 115, 0.28), transparent 68%), ' +
			'radial-gradient(ellipse 45% 42% at 20% 90%, rgba(74, 111, 224, 0.14), transparent 70%)',
		cta: 'Study',
		intent: 'meta',
	},
	{
		title: 'Collection',
		kicker: 'Deckbuilding',
		description: 'Review starter and NFT cards, inspect rarity treatments, and tune the pieces behind your army.',
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
	{ label: 'Wallet', to: routes.wallet },
	{ label: 'Atlas', to: routes.map },
	{ label: 'Marketplace', to: routes.marketplace },
	{ label: 'Packs', to: routes.packs },
	{ label: 'Tournaments', to: routes.tournaments },
	{ label: 'History', to: routes.history },
	{ label: 'Treasury', to: routes.treasury },
	{ label: 'Explorer', to: routes.explorer },
] as const;

function StatRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
	return (
		<div className="flex min-w-0 items-center justify-between gap-3">
			<span className="shrink-0 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300">{label}</span>
			<span className={`min-w-0 max-w-[62%] truncate text-right font-display text-[13px] tracking-[0.04em] sm:text-base sm:tracking-[0.08em] ${highlight ? 'text-gold-300' : 'text-ink-0'}`}>
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

function HiveLoginDialog({ onClose }: { onClose: () => void }) {
	return (
		<div className="fixed inset-0 z-[120] flex items-center justify-center bg-obsidian-950/82 px-4 backdrop-blur-sm">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="home-hive-login-title"
				className="relative w-full max-w-md rounded-xl border border-gold-300/35 bg-obsidian-900/95 p-5 text-ink-0 shadow-2xl shadow-black/50"
			>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close Hive login"
					className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-obsidian-700 bg-obsidian-950/70 text-ink-300 transition-colors hover:border-gold-300/50 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
				>
					<X size={15} strokeWidth={2} />
				</button>
				<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-300">
					Hive login
				</p>
				<h2
					id="home-hive-login-title"
					className="mt-2 font-display text-xl font-black uppercase tracking-[0.12em] text-ink-0"
				>
					Connect Hive
				</h2>
				<div className="mt-4">
					<Suspense fallback={<div className="h-28 animate-pulse rounded-lg bg-obsidian-800" />}>
						<HiveKeychainLogin initiallyExpanded onConnected={onClose} />
					</Suspense>
				</div>
			</div>
		</div>
	);
}

function HomePage() {
	const completedMissions = useCampaignStore(s => s.completedMissions);
	const currentMissionId = useCampaignStore(s => s.currentMission);
	const hiveUsername = useStoredHiveUsername();
	const isHiveMode = useIsHiveMode();
	const sharedNetwork = isSharedNetworkEnvironment();
	const starterClaimed = useStarterStore(s => (
		sharedNetwork
			? Boolean(hiveUsername && s.hasClaimed(hiveUsername))
			: s.hasClaimed(hiveUsername)
	));
	const syncLegacyStarterClaim = useStarterStore(s => s.syncLegacyClaimToAccount);
	const [showCeremony, setShowCeremony] = useState(false);
	const [showHiveLogin, setShowHiveLogin] = useState(false);
	const [canInstall, setCanInstall] = useState(!!deferredInstallPrompt);
	const starterClaimAccess = resolveProtectedFlowAccess({
		accountId: hiveUsername,
		sharedNetwork,
		surface: 'starter_claim',
	});

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
		? starterClaimAccess.kind === 'blocked'
			? 'Connect Hive First'
			: 'Reveal Starter Deck'
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
	const accountInitials = hiveUsername?.slice(0, 2).toUpperCase();
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 60000); // update every minute
		return () => clearInterval(interval);
	}, []);

	const season = getSeasonInfo(now);
	const runtimeProductLabel = getRuntimeProductLabel();

	useEffect(() => {
		const handler = () => setCanInstall(true);
		window.addEventListener('beforeinstallprompt', handler);
		return () => window.removeEventListener('beforeinstallprompt', handler);
	}, []);

	useEffect(() => {
		if ((isHiveMode || sharedNetwork) && !hiveUsername) return;
		// Re-seed of hero decks on account load is handled by ensureBridgeRuntime
		// (bridgeRuntime.ts). Here we only need the legacy claim sync so the
		// starter store reflects the active account.
		syncLegacyStarterClaim(hiveUsername);
	}, [hiveUsername, isHiveMode, sharedNetwork, syncLegacyStarterClaim]);

	useEffect(() => {
		if (hiveUsername) setShowHiveLogin(false);
	}, [hiveUsername]);

	const triggerInstall = () => {
		if (deferredInstallPrompt) {
			deferredInstallPrompt.prompt();
			setCanInstall(false);
		}
	};

	return (
		<div className="home-landscape-shell min-h-dvh w-full overflow-x-hidden text-ink-0 bg-(image:--bg-home-nav)">
			{/* ── HEADER ─────────────────────────────────────────────────────── */}
			<header className="home-landscape-header sticky top-0 z-50 backdrop-blur-md bg-obsidian-950/80 border-b border-obsidian-700">
				<div className="home-landscape-header-inner mx-auto h-[3.25rem] max-w-[1440px] px-3 sm:h-14 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
					<div className="home-landscape-brand flex min-w-0 items-center gap-2 sm:gap-3">
						<img src={ragnarokLogo} alt="" className="home-landscape-logo h-8 w-8 shrink-0 rounded-md border border-obsidian-600 object-cover" />
						<div className="min-w-0 leading-none">
							<div className="flex min-w-0 items-center gap-2">
								<div className="home-landscape-title min-w-0 truncate font-display text-sm font-bold tracking-[0.18em] text-gold-300">RAGNAROK</div>
								{isTestnetStage() && (
									<span className="home-landscape-stage-badge shrink-0 rounded border border-gold-300/40 bg-gold-300/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-gold-100">
										{runtimeProductLabel}
									</span>
								)}
							</div>
							<div className="home-landscape-season font-mono text-[10px] tracking-[0.16em] text-ink-300 mt-1">
								FORGE &amp; EMBER · {season.seasonNumber.toString().padStart(2, '0')}
							</div>
						</div>
					</div>
					{hiveUsername && (
						<Link
							to={routes.wallet}
							title={`@${hiveUsername}`}
							aria-label={`Open wallet for @${hiveUsername}`}
							className="grid h-10 w-10 place-items-center rounded-full border border-gold-300/35 bg-obsidian-900/70 text-ink-200 transition-colors hover:border-gold-300/65 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
						>
							<span className="grid h-8 w-8 place-items-center rounded-full border border-gold-300/45 bg-linear-to-br from-gold-300 to-gold-700 font-display text-xs font-black uppercase text-obsidian-950">
								{accountInitials}
							</span>
						</Link>
					)}
				</div>
			</header>

			{/* ── PAGE GRID: full-height main column + persistent right rail ──── */}
			<div className="home-landscape-main-grid mx-auto mt-4 grid max-w-[1440px] grid-cols-1 items-start gap-4 px-3 sm:mt-6 sm:gap-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
				{/* MAIN COLUMN: banner + routes + daily quests.
				    pb-24 mirrors the right aside so neither column slides under
				    the anchored utility bar at the bottom. */}
				<main className="home-landscape-main-column grid min-w-0 grid-cols-1 content-start gap-4 pb-4 sm:gap-6 sm:pb-24">
					{/* Banner */}
					<section className="home-landscape-hero relative grid min-w-0 grid-cols-1 items-stretch gap-4 overflow-hidden rounded-xl border border-obsidian-700 bg-linear-to-b from-obsidian-850 to-obsidian-900 px-4 py-4 sm:gap-6 sm:px-8 sm:py-8 xl:grid-cols-[minmax(0,1fr)_320px]">
						<div className="min-w-0">
							<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-300/25 bg-obsidian-950/55 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-200">
								<span className="h-1.5 w-1.5 rounded-full bg-gold-300" aria-hidden="true" />
								Battle lobby
							</div>
							<h1 className="home-landscape-hero-title m-0 max-w-full font-display text-[1.55rem] font-black uppercase leading-[1.06] tracking-[0.025em] min-[360px]:text-[1.75rem] sm:text-[2.625rem] sm:leading-[0.95] sm:tracking-[0.10em] xl:text-[2.25rem] xl:tracking-[0.065em] 2xl:text-[2.75rem] 2xl:tracking-[0.10em]">
								<span className="bg-linear-to-b from-gold-100 via-gold-300 to-gold-500 bg-clip-text text-transparent">
									Reveal the line.<br />March into battle.
								</span>
							</h1>
							<p className="mb-4 mt-4 max-w-[540px] text-sm leading-[1.45] text-ink-200 sm:mb-7 sm:mt-5 sm:text-[15px] sm:leading-[1.65]">
								Campaign is the clean front door — reveal the starter line, stage a mission briefing, and break straight into live combat.
							</p>
							<div className="flex flex-wrap items-center gap-3">
								{!starterClaimed ? (
									starterClaimAccess.kind === 'blocked' ? (
										<Button
											variant="primary"
											size="lg"
											className="home-landscape-primary-cta"
											onClick={() => setShowHiveLogin(true)}
										>
											{primaryLabel}
										</Button>
									) : (
										<Button
											variant="primary"
											size="lg"
											className="home-landscape-primary-cta"
											onClick={() => setShowCeremony(true)}
										>
											{primaryLabel}
										</Button>
									)
								) : (
									<Link to={routes.campaign}>
										<Button variant="primary" size="lg" className="home-landscape-primary-cta">{primaryLabel}</Button>
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
						<aside className="grid min-w-0 content-center gap-3 self-stretch overflow-hidden rounded-xl border border-gold-300/40 bg-obsidian-900/80 p-4 backdrop-blur-md sm:p-5">
							<StatRow label="Saga" value={`${completedMissionCount} / ${totalMissionCount}`} highlight />
							<StatRow label="Active" value={activeFocusTitle} />
							<StatRow label="Chapter" value={activeFocusChapter} />
							<StatRow
								label="Season"
								value={`${season.seasonNumber.toString().padStart(2, '0')} · ${season.seasonName}`}
							/>
							<StatRow
								label="Ends In"
								value={formatTimeRemaining(season.timeRemainingMs)}
								highlight
							/>
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
					<section className="min-w-0">
						<header className="mb-4">
							<div className="font-mono text-[11px] tracking-[0.32em] uppercase text-ink-300">Primary Routes</div>
							<h2 className="font-display text-xl tracking-[0.08em] uppercase text-ink-0 mt-1">Choose your front</h2>
						</header>
						<div className="home-mode-grid grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
							{MODE_CARDS.map(mode => {
								const Icon = mode.icon;
								const a = ACCENT[mode.accent];
								const isCombat = mode.intent === 'combat';
								return (
									<Link
										key={mode.title}
										to={mode.to}
										className={`home-landscape-route-card relative group flex min-h-[132px] min-w-0 flex-col overflow-hidden rounded-xl border bg-linear-to-b p-3 transition-all duration-300 sm:min-h-[172px] sm:p-4 ${a.border} ${isCombat
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
											<p className="mb-3 hidden max-w-[95%] text-[12px] leading-[1.5] text-ink-200 sm:block">
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
					<section className="min-w-0">
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
				    Settings lives here on Home; meta pages keep account chrome focused. */}
				<aside className="home-landscape-right-rail grid min-w-0 grid-cols-1 content-start gap-4 pb-4 sm:gap-5 sm:pb-24 lg:sticky lg:top-[4.75rem]">
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
							<div className="home-warband-scroll max-h-[420px] overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin]">
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
			<nav className="home-landscape-utility-bar static bottom-0 z-40 border-t border-obsidian-700 bg-obsidian-950/85 backdrop-blur-md sm:sticky">
				<div className="home-landscape-utility-inner mx-auto flex h-auto max-w-[1440px] items-center justify-start gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:none] sm:h-12 sm:justify-center sm:px-6 sm:py-0 lg:px-8">
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
					<StarterPackCeremony
						accountId={hiveUsername}
						onComplete={() => setShowCeremony(false)}
					/>
				</Suspense>
			)}
			{showHiveLogin && <HiveLoginDialog onClose={() => setShowHiveLogin(false)} />}
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
	componentDidCatch(error: Error) {
		if (isChunkLoadError(error)) {
			void recoverFromChunkLoadError();
		}
	}
	render() {
		if (this.state.error) {
			if (isChunkLoadError(this.state.error)) {
				return (
					<div style={{ padding: 40, color: 'var(--error-text)', background: 'var(--error-bg)', minHeight: '100vh', fontFamily: 'monospace' }}>
						<h1>Updating Ragnarok</h1>
						<p style={{ marginTop: 16, maxWidth: 560, lineHeight: 1.6 }}>
							A new build is available. Reloading with the latest files.
						</p>
						<button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '10px 20px', background: 'var(--error-accent)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--error-bg)', fontWeight: 'bold' }}>Reload now</button>
					</div>
				);
			}

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
	const hiveUsername = useStoredHiveUsername();
	const completedMissions = useCampaignStore(state => state.completedMissions);
	const shouldCheckFactionPledge = useMemo(() => {
		const norseChapter = ALL_CHAPTERS.find(chapter => chapter.id === 'norse');
		return Boolean(norseChapter?.missions.every(mission => completedMissions[mission.id]));
	}, [completedMissions]);

	return (
		<>
			<EnvironmentBanner />
			{hiveUsername && (
				<Suspense fallback={null}>
					<SocialPresenceHeartbeat />
				</Suspense>
			)}
			<Outlet />
			{hiveUsername && <Suspense fallback={null}><DuatClaimPopup /></Suspense>}
			{shouldCheckFactionPledge && <Suspense fallback={null}><FactionPledgePopup /></Suspense>}
		</>
	);
}

function EnvironmentBanner() {
	const config = getRagnarokNetworkConfig();
	const runtimePhase = getRagnarokRuntimePhase(config);
	const productLabel = getRuntimeProductLabel();
	const dismissKey = createRuntimeStorageKey('testnet-banner-dismissed');
	const [dismissed, setDismissed] = useState(() => {
		if (typeof window === 'undefined') return false;
		return window.localStorage.getItem(dismissKey) === 'true';
	});

	if (!isTestnetStage()) return null;
	if (dismissed) return null;

	const dismiss = () => {
		window.localStorage.setItem(dismissKey, 'true');
		setDismissed(true);
	};

	return (
		<aside
			aria-label={`${productLabel} environment`}
			className="environment-banner fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)] rounded-md border border-gold-300/40 bg-obsidian-950/95 px-3 py-2 pr-9 text-xs text-gold-100 shadow-lg shadow-black/40 backdrop-blur"
		>
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
				<span className="font-display font-semibold uppercase tracking-[0.18em] text-gold-300">{productLabel}</span>
				<span className="text-ink-400">/</span>
				<span className="text-ink-200">{runtimePhase === 'alfa-testnet' ? 'stage=testnet' : 'Resettable'}</span>
				<span className="hidden text-ink-400 sm:inline">/</span>
				<span className="hidden font-mono text-ink-300 sm:inline">{config.protocolId}</span>
			</div>
			<button
				type="button"
				aria-label="Dismiss testnet banner"
				onClick={dismiss}
				className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded border border-transparent text-ink-300 transition-colors hover:border-gold-300/30 hover:text-gold-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
			>
				<X className="h-3.5 w-3.5" aria-hidden="true" />
			</button>
		</aside>
	);
}

function GameOrientationGate({ children }: { children: React.ReactNode }) {
	return (
		<div className="game-orientation-gate">
			<div className="game-orientation-content">
				{children}
			</div>
			<aside
				aria-label="Rotate phone to play"
				className="game-orientation-lock"
			>
				<div className="game-orientation-card">
					<div className="game-orientation-icon-row" aria-hidden="true">
						<Smartphone className="game-orientation-phone" strokeWidth={1.8} />
						<RotateCw className="game-orientation-rotate" strokeWidth={2.2} />
					</div>
					<p className="game-orientation-kicker">Battle mode</p>
					<h1 className="game-orientation-title">Turn your phone</h1>
					<p className="game-orientation-copy">
						Combat uses the full battlefield in landscape. Rotate the device to continue.
					</p>
				</div>
			</aside>
		</div>
	);
}

function App() {
	return (
		<ErrorBoundary>
			<EitrMigrationBanner />

			<ToastProvider position="top-right" richColors />
			<HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
				<ViewTransitionBridge />
				<Suspense fallback={<LoadingScreen />}>
					<Routes>
							<Route path={routes.map} element={<MapPage />} />
							<Route
								path={routes.pokerViewportPrototype}
								element={import.meta.env.DEV ? <PokerViewportSafeAreaPrototype /> : <Navigate to={routes.home} replace />}
							/>

							<Route element={<GlobalOverlaysLayout />}>
								<Route path={routes.home} element={<HomePage />} />
								<Route path={routes.campaign} element={<ProtectedAccountGate surface="campaign"><CampaignPage /></ProtectedAccountGate>} />
								<Route path={routes.ladder} element={<RankedLadderPage />} />
								<Route path={routes.explorer} element={<ExplorerPage />} />
								<Route path={routes.admin} element={<AdminPanel />} />
								<Route path={routes.adminNfts} element={<AdminPanel />} />
								<Route path={routes.tournaments} element={<OnlineOnly label="Tournaments"><TournamentListPage /></OnlineOnly>} />
								<Route path={routes.history} element={<MatchHistoryPage />} />
								<Route path={routes.settings} element={<SettingsPage />} />
								<Route path={routes.legacyRuneTestnet} element={<Navigate to={routes.wallet} replace />} />

								<Route element={<CardVisualRuntimeLayout />}>
									<Route element={<BridgeRuntimeBoundary />}>
										<Route path={routes.warband} element={<StarterEntitlementGate surface="warband"><WarbandPage /></StarterEntitlementGate>} />
										<Route path={routes.collection} element={<CollectionPage />} />
										<Route path={routes.trading} element={<Navigate to={`${routes.marketplace}?tab=swaps`} replace />} />
										<Route path={routes.marketplace} element={<OnlineOnly label="Marketplace"><MarketplacePage /></OnlineOnly>} />
										<Route path={routes.treasury} element={<OnlineOnly label="Treasury"><TreasuryPage /></OnlineOnly>} />
										<Route path={routes.wallet} element={<WalletPage />} />
									</Route>

									<Route element={<CardDataRuntimeBoundary />}>
										<Route path={routes.packs} element={<PacksPage />} />
									</Route>

									<Route element={<GameOrientationGate><GameplayRuntimeBoundary /></GameOrientationGate>}>
										<Route path={routes.game} element={<Navigate to={routes.singleGame} replace />} />
										<Route path={routes.singleGame} element={<SingleGameRoute />} />
										<Route path={routes.campaignGame} element={<CampaignGameRoute />} />
										<Route path={routes.multiplayer} element={
											<ProtectedAccountGate surface="multiplayer">
												<StarterEntitlementGate surface="multiplayer"><MultiplayerGame /></StarterEntitlementGate>
											</ProtectedAccountGate>
										} />
									</Route>
								</Route>
							</Route>

							<Route path="*" element={
								<div className="min-h-screen bg-obsidian-950 flex flex-col items-center justify-center text-ink-0 px-6">
									<h1 className="font-display text-6xl font-black tracking-[0.18em] text-gold-300 mb-4">404</h1>
									<p className="font-mono text-[11px] tracking-[0.32em] uppercase text-ink-300 mb-8">Page not found</p>
									<Link to={routes.home} className="px-6 py-3 bg-linear-to-b from-gold-300 to-gold-500 border border-gold-200 text-obsidian-950 font-display font-bold tracking-[0.18em] uppercase rounded-md transition-all hover:from-gold-200 hover:to-gold-400 hover:scale-[1.02]">
										Back to Home
									</Link>
								</div>
							} />
					</Routes>
				</Suspense>
			</HashRouter>
		</ErrorBoundary>
	);
}

export default App;
