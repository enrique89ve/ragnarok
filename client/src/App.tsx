import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { routes } from './lib/routes';
import { Button, Panel, ToastProvider } from './components/ui-norse';
import {
	ChevronRight,
	Compass,
	History as HistoryIcon,
	Landmark,
	LayoutGrid,
	Package as PackageIcon,
	Play,
	RotateCw,
	Search as SearchIcon,
	Settings as SettingsIcon,
	ShoppingBag,
	Smartphone,
	Swords,
	Trophy,
	WalletCards,
	X,
} from 'lucide-react';
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
const UTILITY_LINKS: ReadonlyArray<{ label: string; shortLabel?: string; to: string; icon: typeof Swords }> = [
	{ label: 'Wallet', to: routes.wallet, icon: WalletCards },
	{ label: 'Atlas', to: routes.map, icon: Compass },
	{ label: 'Marketplace', shortLabel: 'Market', to: routes.marketplace, icon: ShoppingBag },
	{ label: 'Packs', to: routes.packs, icon: PackageIcon },
	{ label: 'Tournaments', shortLabel: 'Tourney', to: routes.tournaments, icon: Trophy },
	{ label: 'History', to: routes.history, icon: HistoryIcon },
	{ label: 'Treasury', to: routes.treasury, icon: Landmark },
	{ label: 'Explorer', shortLabel: 'Explore', to: routes.explorer, icon: SearchIcon },
] as const;

function StatRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
	return (
		<div className="flex items-center justify-between border-b border-white/5 py-1.5 last:border-b-0">
			<span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-400">{label}</span>
			<span className={`font-mono text-sm ${highlight ? 'text-gold-300' : 'text-ink-100'}`}>
				{value}
			</span>
		</div>
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
		<div className="n-page-shell bg-(image:--bg-home-nav)">
			{/* ── HEADER ─────────────────────────────────────────────────────── */}
			<header className="sticky top-0 z-50 backdrop-blur-md bg-obsidian-950/80 border-b border-obsidian-700">
				<div className="mx-auto h-[3.25rem] max-w-[1440px] px-3 sm:h-14 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
					<div className="flex min-w-0 items-center gap-2 sm:gap-3">
						<img src={ragnarokLogo} alt="" className="h-8 w-8 shrink-0 rounded-md border border-obsidian-600 object-cover" />
						<div className="min-w-0 leading-none">
							<div className="flex min-w-0 items-center gap-2">
								<div className="min-w-0 truncate font-display text-sm font-bold tracking-[0.18em] text-gold-300">RAGNAROK</div>
								{isTestnetStage() && (
									<span className="shrink-0 rounded border border-gold-300/40 bg-gold-300/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-gold-100">
										{runtimeProductLabel}
									</span>
								)}
							</div>
							<div className="font-mono text-[10px] tracking-[0.16em] text-ink-300 mt-1">
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

			{/* ── PAGE GRID ── */}
			<div className="mx-auto mt-4 grid max-w-[1440px] grid-cols-1 items-start gap-4 px-3 sm:mt-6 sm:gap-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
				<main className="grid min-w-0 grid-cols-1 content-start gap-4 pb-4 sm:gap-6 sm:pb-24">
					{/* Banner */}
					<section className="n-glass-panel-gold flex flex-col gap-10 p-6 sm:p-10 xl:flex-row xl:items-center xl:justify-between">
						<div className="min-w-0">
							<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-300/25 bg-obsidian-950/55 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-200">
								<span className="h-1.5 w-1.5 rounded-full bg-gold-300" aria-hidden="true" />
								Battle lobby
							</div>
							<h1 className="n-hero-title">
								Reveal the line.<br />March into battle.
							</h1>
							<p className="n-hero-copy">
								Campaign is the clean front door — reveal the starter line, stage a mission briefing, and break straight into live combat.
							</p>
							<div className="flex flex-wrap items-center gap-4">
								{!starterClaimed ? (
									starterClaimAccess.kind === 'blocked' ? (
										<button
											className="btn-runic btn-runic--gold"
											onClick={() => setShowHiveLogin(true)}
										>
											<span className="btn-runic-stud" aria-hidden />
											{primaryLabel}
											<span className="btn-runic-stud" aria-hidden />
										</button>
									) : (
										<button
											className="btn-runic btn-runic--gold"
											onClick={() => setShowCeremony(true)}
										>
											<span className="btn-runic-stud" aria-hidden />
											{primaryLabel}
											<span className="btn-runic-stud" aria-hidden />
										</button>
									)
								) : (
									<Link to={routes.campaign} className="no-underline">
										<button className="btn-runic btn-runic--gold">
											<span className="btn-runic-stud" aria-hidden />
											{primaryLabel}
											<span className="btn-runic-stud" aria-hidden />
										</button>
									</Link>
								)}
								{canInstall && (
									<button className="btn-runic btn-runic--obsidian px-6 py-2.5" onClick={triggerInstall}>
										<span className="btn-runic-stud" aria-hidden />
										Install App
										<span className="btn-runic-stud" aria-hidden />
									</button>
								)}
							</div>
						</div>

						{/* Stats panel */}
						<aside className="n-glass-panel p-4 sm:p-5 flex flex-col justify-center gap-1">
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
							<div className="mt-2 pt-3 border-t border-obsidian-700">
								<div className="flex items-center justify-between mb-1.5">
									<span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-400">Saga progress</span>
									<span className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-300">{sagaPercent}%</span>
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
						<header className="section-heading">
							<div className="section-heading-kicker">Primary Routes</div>
							<h2 className="section-heading-title">Choose your front</h2>
						</header>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
							{MODE_CARDS.map(mode => {
								const Icon = mode.icon;
								const a = ACCENT[mode.accent];
								const isCombat = mode.intent === 'combat';
								return (
									<Link
										key={mode.title}
										to={mode.to}
										className="n-mode-card n-glass-interactive px-5 py-6 min-h-[180px] group no-underline"
									>
										<div
											className="n-mode-card-atmosphere"
											style={{ background: mode.atmosphere }}
										/>

										<Icon className={`n-mode-card-large-icon h-16 w-16 ${a.text} group-hover:scale-110 group-hover:opacity-30`} strokeWidth={1} />

										<div className="relative z-10 flex flex-col h-full justify-between">
											<div>
												<div className={`font-mono text-[10px] uppercase tracking-[0.24em] mb-1 group-hover:text-gold-300 transition-colors ${a.text}`}>{mode.kicker}</div>
												<h3 className="font-display text-lg font-black uppercase tracking-wider text-ink-0 group-hover:text-gold-100 transition-colors">{mode.title}</h3>
												<p className="mt-2 text-xs text-ink-300 line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity">
													{mode.description}
												</p>
											</div>

											<div className="mt-6 flex justify-end">
												{isCombat ? (
													<div className="btn-runic btn-runic--gold btn-runic--sm transition-transform group-hover:scale-105">
														<span className="btn-runic-stud" aria-hidden />
														<Play size={10} fill="currentColor" />
														{mode.cta}
														<span className="btn-runic-stud" aria-hidden />
													</div>
												) : (
													<div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink-300 group-hover:text-gold-300 transition-colors">
														{mode.cta}
														<ChevronRight size={12} />
													</div>
												)}
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					</section>

					{/* Daily Quests */}
					<section className="min-w-0">
						<header className="section-heading">
							<div className="section-heading-kicker">Today's Saga</div>
							<h2 className="section-heading-title">Daily quests</h2>
						</header>
						<Suspense fallback={<div className="animate-pulse h-48 rounded-xl bg-obsidian-800" />}>
							<DailyQuestPanel />
						</Suspense>
					</section>
				</main>

				{/* RIGHT RAIL */}
				<aside className="grid min-w-0 grid-cols-1 content-start gap-4 pb-4 sm:gap-5 sm:pb-24 lg:sticky lg:top-[4.75rem]">
					<div className="n-glass-panel-gold">
						<div className="h-1 bg-gradient-to-r from-gold-500 to-gold-300" />
						<div className="p-4">
							<div className="flex items-center justify-between mb-4">
								<h2 className="font-display font-bold uppercase tracking-wider text-gold-300">Account</h2>
								<Link
									to={routes.settings}
									className="n-glass-interactive h-8 w-8 flex items-center justify-center text-ink-400 hover:text-gold-300 transition-colors"
								>
									<SettingsIcon size={12} strokeWidth={2} />
								</Link>
							</div>
							<Suspense fallback={<div className="animate-pulse h-20 rounded-xl bg-obsidian-800" />}>
								<HiveKeychainLogin />
							</Suspense>
						</div>
					</div>

					{hiveUsername && (
						<div className="n-glass-panel">
							<div className="h-1 bg-gradient-to-r from-obsidian-600 to-obsidian-700" />
							<div className="p-4">
								<h2 className="font-display font-bold uppercase tracking-wider text-ink-200 mb-4">Warband</h2>
								<div className="max-h-[420px] overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin]">
									<Suspense fallback={<div className="animate-pulse h-32 rounded-xl bg-obsidian-800" />}>
										<FriendsPanel />
									</Suspense>
								</div>
							</div>
						</div>
					)}
				</aside>
			</div>

			{/* ── UTILITY BAR ── */}
			<nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-obsidian-700 bg-obsidian-950/80 px-4 py-3 backdrop-blur-lg lg:static lg:bg-transparent lg:border-none">
				<div className="mx-auto flex justify-center gap-2 max-w-5xl overflow-x-auto [scrollbar-width:none]">
					{UTILITY_LINKS.map(link => {
						const Icon = link.icon;
						return (
							<Link
								key={link.label}
								to={link.to}
								className="n-glass-interactive flex flex-col items-center gap-1 p-2 min-w-[70px] sm:min-w-[100px] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-ink-200 no-underline"
							>
								<Icon size={14} className="text-gold-300" />
								<span>{link.shortLabel ?? link.label}</span>
							</Link>
						);
					})}
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
