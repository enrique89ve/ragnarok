import React, { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { routes } from './lib/routes';
import { getWarbandEntryRoute } from './lib/warbandRoutes';
import { Button, ToastProvider } from './components/ui-norse';
import { AccountSlot } from './components/account/AccountSlot';
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
	ShoppingBag,
	Smartphone,
	Swords,
	Trophy,
	Users,
	WalletCards,
	X,
} from 'lucide-react';
import "./index.css";
import ragnarokLogo from "./assets/images/ragnarok-logo.jpg";
import LoadingScreen from "./game/components/ui/LoadingScreen";
import { EitrMigrationBanner } from "./game/components/migrations/EitrMigrationBanner";
import { ALL_CHAPTERS, getMission } from "./game/campaign/campaignLookup";
import type { Difficulty } from "./game/campaign/campaignTypes";
import { useCampaignStore } from "./game/campaign/campaignStore";
import { useStarterStore } from "./game/stores/starterStore";
import type { AiStyle } from "./game/match/types";
import { useNFTUsername } from './game/nft/hooks';
import { getAuthenticatedHiveUsername, subscribeHiveSessionIdentity } from "./data/HiveSessionIdentity";
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
const HOME_HERO_ART = '/art/landing/home-gods-hero-v6-nftwomen-balanced.webp';

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

const cardLabModules = import.meta.glob('./game/components/dev/CardLabPage.tsx');
const CardLabPage = lazy(async () => {
	const loadLab = cardLabModules['./game/components/dev/CardLabPage.tsx'];
	if (!import.meta.env.DEV || loadLab === undefined) {
		return { default: () => <Navigate to={routes.home} replace /> };
	}

	return loadLab() as Promise<{ default: React.ComponentType }>;
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

const parseSingleDifficulty = (value: string | null): Difficulty => {
	switch (value?.toLowerCase()) {
		case 'heroic':
			return 'heroic';
		case 'mythic':
			return 'mythic';
		case 'normal':
		default:
			return 'normal';
	}
};

const parseSingleStyle = (value: string | null): AiStyle => {
	switch (value?.toLowerCase()) {
		case 'aggressive':
			return 'aggressive';
		case 'defensive':
			return 'defensive';
		case 'human':
			return 'human';
		case 'balanced':
		default:
			return 'balanced';
	}
};

const parseSingleDeckSource = (value: string | null): 'warband' | 'default' => {
	return value === 'default' ? 'default' : 'warband';
};

const SingleGameRoute = lazy(async () => {
	const [{ MatchSetupSingle }, coordinatorModule] = await Promise.all([
		import('./game/match'),
		import('./game/coordinator/RagnarokGameCoordinator'),
	]);
	const RagnarokGameCoordinator = coordinatorModule.default;

	return {
		default: function SingleGameRoute() {
			const [searchParams] = useSearchParams();
			const difficulty = parseSingleDifficulty(searchParams.get('difficulty'));
			const style = parseSingleStyle(searchParams.get('style'));
			const deckSource = parseSingleDeckSource(searchParams.get('deck') ?? searchParams.get('deckSource'));

			return (
				<StarterEntitlementGate surface="quick_match">
					<MatchSetupSingle difficulty={difficulty} deckSource={deckSource} style={style}>
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
				<ProtectedAccountGate surface="campaign_battle" requiresSignedSession>
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

type StarterCeremonySession = {
	readonly accountId: string | null;
};

// PWA install prompt
let deferredInstallPrompt: DeferredInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		deferredInstallPrompt = e as DeferredInstallPromptEvent;
	});
}

function useStoredHiveUsername(): string | null {
	return useNFTUsername();
}

function useAuthenticatedHiveUsername(): string | null {
	return useSyncExternalStore(
		subscribeHiveSessionIdentity,
		getAuthenticatedHiveUsername,
		getAuthenticatedHiveUsername,
	);
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
					<p className="text-ink-400 text-xs mt-4">Account-bound surfaces require an active connected Hive account in shared network builds.</p>
				</div>
			</div>
		);
	}
	return <>{children}</>;
}

function ProtectedAccountGate({
	children,
	surface,
	requiresSignedSession = false,
}: {
	children: React.ReactNode;
	surface: ProtectedFlowSurface;
	requiresSignedSession?: boolean;
}) {
	const hiveUsername = useStoredHiveUsername();
	const authenticatedHiveUsername = useAuthenticatedHiveUsername();
	const access = resolveProtectedFlowAccess({
		accountId: hiveUsername,
		authenticatedAccountId: authenticatedHiveUsername,
		sharedNetwork: isSharedNetworkEnvironment(),
		surface,
		requiresAuthenticatedSession: requiresSignedSession,
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
	requiresSignedSession = false,
}: {
	children: React.ReactNode;
	surface: ProtectedFlowSurface;
	requiresSignedSession?: boolean;
}) {
	const hiveUsername = useStoredHiveUsername();
	const authenticatedHiveUsername = useAuthenticatedHiveUsername();
	const sharedNetwork = isSharedNetworkEnvironment();
	const starterClaimAccountId = hiveUsername;
	const starterClaimed = useStarterStore(state => (
		sharedNetwork
			? Boolean(starterClaimAccountId && state.hasClaimed(starterClaimAccountId))
			: state.hasClaimed(hiveUsername)
	));
	const [starterCeremony, setStarterCeremony] = useState<StarterCeremonySession | null>(null);
	const access = resolveProtectedFlowAccess({
		accountId: hiveUsername,
		authenticatedAccountId: authenticatedHiveUsername,
		sharedNetwork,
		surface,
		requiresAuthenticatedSession: requiresSignedSession,
	});
	const openStarterCeremony = () => {
		if (access.kind === 'allowed') setStarterCeremony({ accountId: access.accountId });
	};

	useEffect(() => {
		if (!starterCeremony) return;
		if (access.kind !== 'allowed' || access.accountId !== starterCeremony.accountId) {
			setStarterCeremony(null);
		}
	}, [access, starterCeremony]);

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
					<Button variant="primary" size="lg" onClick={openStarterCeremony}>
						Reveal Starter Deck
					</Button>
				)}
				<div className="mt-4">
					<Link to={routes.home} className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400 hover:text-gold-300">
						Back Home
					</Link>
				</div>
			</div>

			{starterCeremony && access.kind === 'allowed' && access.accountId === starterCeremony.accountId && (
				<Suspense fallback={null}>
					<StarterPackCeremony
						accountId={access.accountId}
						onComplete={() => setStarterCeremony(null)}
						onCancel={() => setStarterCeremony(null)}
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
 *   ├── page grid          one content column
 *   │     ├── routes (primary mode cards)
 *   │     └── campaign feature card
 *   ├── header account control (connect/login or wallet link)
 *   └── floating Warband drawer (FriendsPanel)
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

const PLAY_MODE_CARDS: ReadonlyArray<ModeCard> = [
	{
		title: 'Single',
		kicker: 'Practice',
		description: 'Muster a warband, test decks, and learn the combat loop without ranked pressure.',
		to: getWarbandEntryRoute('single'),
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
		description: 'Muster a warband, queue into live opponents, and climb with the full combat ruleset.',
		to: getWarbandEntryRoute('multiplayer'),
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
] as const;

const COLLECTION_CARD: ModeCard = {
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
};

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
		<div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/5 py-1.5 last:border-b-0">
			<span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-400">{label}</span>
			<span className={`min-w-0 break-words text-right font-mono text-sm leading-snug ${highlight ? 'text-gold-300' : 'text-ink-100'}`}>
				{value}
			</span>
		</div>
	);
}

function HomeAccountControl({
	hiveUsername,
	onLogin,
}: {
	hiveUsername: string | null;
	onLogin: () => void;
}) {
	if (hiveUsername) {
		return (
			<AccountSlot username={hiveUsername} tier="premium" to={routes.wallet} />
		);
	}

	return (
		<button
			type="button"
			className="n-home-account-control inline-flex min-h-10 shrink-0 items-center gap-2 px-4 py-1 font-mono text-[0.65rem] font-extrabold uppercase tracking-[0.12em]"
			onClick={onLogin}
			aria-label={hiveUsername ? `Sign Hive session for @${hiveUsername}` : 'Connect Hive'}
		>
			<WalletCards size={15} strokeWidth={2} />
			<span>{hiveUsername ? 'Sign Hive' : 'Connect Hive'}</span>
		</button>
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
	const starterClaimAccountId = hiveUsername;
	const starterClaimed = useStarterStore(s => (
		sharedNetwork
			? Boolean(starterClaimAccountId && s.hasClaimed(starterClaimAccountId))
			: s.hasClaimed(hiveUsername)
	));
	const syncLegacyStarterClaim = useStarterStore(s => s.syncLegacyClaimToAccount);
	const [starterCeremony, setStarterCeremony] = useState<StarterCeremonySession | null>(null);
	const [showHiveLogin, setShowHiveLogin] = useState(false);
	const [showWarbandPanel, setShowWarbandPanel] = useState(false);
	const [canInstall, setCanInstall] = useState(!!deferredInstallPrompt);
	const starterClaimAccess = resolveProtectedFlowAccess({
		accountId: hiveUsername,
		authenticatedAccountId: hiveUsername,
		sharedNetwork,
		surface: 'starter_claim',
		requiresAuthenticatedSession: false,
	});
	const openStarterCeremony = () => {
		if (starterClaimAccess.kind === 'allowed') {
			setStarterCeremony({ accountId: starterClaimAccess.accountId });
		}
	};

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
			? hiveUsername
				? 'Sign Hive First'
				: 'Connect Hive First'
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
	const socialHiveUsername = hiveUsername;
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
		const syncAccountId = hiveUsername;
		if ((isHiveMode || sharedNetwork) && !syncAccountId) return;
		// Re-seed of hero decks on account load is handled by ensureBridgeRuntime
		// (bridgeRuntime.ts). Here we only need the legacy claim sync so the
		// starter store reflects the active account.
		syncLegacyStarterClaim(syncAccountId);
	}, [hiveUsername, isHiveMode, sharedNetwork, syncLegacyStarterClaim]);

	useEffect(() => {
		if (hiveUsername) {
			setShowHiveLogin(false);
			return;
		}
		setShowWarbandPanel(false);
	}, [hiveUsername]);

	useEffect(() => {
		if (!starterCeremony) return;
		if (starterClaimAccess.kind !== 'allowed' || starterClaimAccess.accountId !== starterCeremony.accountId) {
			setStarterCeremony(null);
		}
	}, [starterCeremony, starterClaimAccess]);

	useEffect(() => {
		if (!showWarbandPanel) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setShowWarbandPanel(false);
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [showWarbandPanel]);

	const triggerInstall = () => {
		if (deferredInstallPrompt) {
			deferredInstallPrompt.prompt();
			setCanInstall(false);
		}
	};

	const renderModeCard = (mode: ModeCard) => {
		const Icon = mode.icon;
		const a = ACCENT[mode.accent];
		const isCombat = mode.intent === 'combat';
		const requiresAccountBoundCards = isCombat || mode.to === routes.collection;
		const blockedBySession = sharedNetwork && requiresAccountBoundCards && !hiveUsername;
		const blockedByStarter = requiresAccountBoundCards && !starterClaimed && !blockedBySession;
		const locked = blockedBySession || blockedByStarter;
		const visibleCta = blockedBySession
			? hiveUsername ? 'Sign' : 'Connect'
			: blockedByStarter
				? 'Starter'
				: mode.cta;
		const cardContent = (
			<>
				<div
					className="n-mode-card-atmosphere"
					style={{ background: mode.atmosphere }}
				/>

				<Icon className={`n-mode-card-large-icon h-16 w-16 ${a.text} group-hover:scale-110 group-hover:opacity-30`} strokeWidth={1} />

				<div className="relative z-10 flex flex-col h-full justify-between">
					<div>
						<div className={`font-mono text-[10px] uppercase tracking-[0.24em] mb-1 group-hover:text-gold-300 transition-colors ${a.text}`}>{mode.kicker}</div>
						<h3 className="font-display text-lg font-black uppercase tracking-wider text-ink-0 group-hover:text-gold-100 transition-colors">{mode.title}</h3>
						<p className="n-mode-card-description mt-2 text-xs text-ink-300 line-clamp-2 leading-relaxed">
							{mode.description}
						</p>
					</div>

					<div className="mt-6 flex justify-end">
						{isCombat ? (
							<div className="btn-runic btn-runic--gold btn-runic--sm transition-transform group-hover:scale-105">
								<span className="btn-runic-stud" aria-hidden />
								<Play size={10} fill="currentColor" />
								{visibleCta}
								<span className="btn-runic-stud" aria-hidden />
							</div>
						) : (
							<div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink-300 group-hover:text-gold-300 transition-colors">
								{visibleCta}
								<ChevronRight size={12} />
							</div>
						)}
					</div>
				</div>
			</>
		);
		const cardClassName = `n-mode-card n-glass-interactive px-5 py-6 min-h-[180px] group no-underline ${locked ? 'opacity-70' : ''}`;

		if (locked) {
			return (
				<button
					key={mode.title}
					type="button"
					className={`${cardClassName} text-left`}
					onClick={() => {
						if (blockedBySession) {
							setShowHiveLogin(true);
							return;
						}
						openStarterCeremony();
					}}
				>
					{cardContent}
				</button>
			);
		}

		return (
			<Link
				key={mode.title}
				to={mode.to}
				className={cardClassName}
			>
				{cardContent}
			</Link>
		);
	};

	return (
		<div className="n-page-shell n-home-shell bg-(image:--bg-home-nav)">
			{/* ── HEADER ─────────────────────────────────────────────────────── */}
			<header className="sticky top-0 z-50 backdrop-blur-md bg-obsidian-950/80 border-b border-obsidian-700">
				<div className="n-page-gutter mx-auto flex h-[3.25rem] max-w-[1440px] items-center justify-between gap-2 sm:h-14 sm:gap-4">
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
					<HomeAccountControl
						hiveUsername={hiveUsername}
						onLogin={() => setShowHiveLogin(true)}
					/>
				</div>
			</header>

			{/* ── PAGE GRID ── */}
			<div className="n-home-layout n-page-gutter mx-auto mt-4 grid w-full max-w-[1440px] grid-cols-1 items-start gap-4 sm:mt-6 sm:gap-6">
				<main className="grid min-w-0 grid-cols-1 content-start gap-4 pb-28 sm:gap-6 sm:pb-32">
					{/* Banner */}
					<section
						className="n-home-hero flex flex-col gap-8 p-5 sm:p-8 xl:flex-row xl:items-end xl:justify-between"
						style={{ '--n-home-hero-image': `url(${HOME_HERO_ART})` } as React.CSSProperties}
					>
						<div className="n-home-hero-content min-w-0">
							<div className="n-home-hero-eyebrow mb-4 inline-flex items-center gap-2 border border-gold-300/25 bg-obsidian-950/55 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-200">
								<span className="h-1.5 w-1.5 bg-gold-300" aria-hidden="true" />
								Playable Testnet
							</div>
							<h1 className="n-hero-title">
								Enter Ragnarok.<br />Choose your front.
							</h1>
							<p className="n-hero-copy">
								Reveal your starter line, push into campaign, then take the same warband into live PvP.
							</p>
							<div className="n-home-hero-path" aria-label="Primary play path">
								<span>Starter</span>
								<span>Campaign</span>
								<span>PvP</span>
							</div>
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
											onClick={openStarterCeremony}
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
						<aside className="n-home-hero-briefing p-4 sm:p-5 flex flex-col justify-center gap-1">
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
								<div className="h-1 overflow-hidden bg-obsidian-700">
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
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,0.92fr)]">
							{PLAY_MODE_CARDS.map(renderModeCard)}
							<div className="xl:border-l xl:border-gold-300/10 xl:pl-6">
								{renderModeCard(COLLECTION_CARD)}
							</div>
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
			</div>

			{/* ── UTILITY BAR ── */}
			<nav className="n-home-utility-bar fixed bottom-0 left-0 right-0 z-40 border-t border-obsidian-700 bg-obsidian-950/88 px-4 py-3 backdrop-blur-lg">
				<div className="n-home-utility-inner mx-auto flex max-w-5xl justify-start gap-2 overflow-x-auto [scrollbar-width:none]">
					{UTILITY_LINKS.map(link => {
						const Icon = link.icon;
						return (
							<Link
								key={link.label}
								to={link.to}
								className="n-home-utility-link n-glass-interactive flex min-h-[3.125rem] min-w-[70px] flex-col items-center gap-1 p-2 text-[9px] font-bold uppercase tracking-wider text-ink-200 no-underline sm:min-w-[100px] sm:text-[10px]"
							>
								<Icon size={14} className="text-gold-300" />
								<span>{link.shortLabel ?? link.label}</span>
							</Link>
						);
					})}
				</div>
			</nav>

			{socialHiveUsername && (
				<button
					type="button"
					className="n-warband-fab"
					aria-controls="home-warband-drawer"
					aria-expanded={showWarbandPanel}
					aria-label="Open warband contacts"
					onClick={() => setShowWarbandPanel(true)}
				>
					<Users size={17} strokeWidth={2} />
					<span>Warband</span>
				</button>
			)}

			{socialHiveUsername && showWarbandPanel && (
				<div
					className="n-warband-drawer-overlay"
					onClick={() => setShowWarbandPanel(false)}
				>
					<aside
						id="home-warband-drawer"
						className="n-warband-drawer"
						role="dialog"
						aria-modal="true"
						aria-labelledby="home-warband-title"
						onClick={event => event.stopPropagation()}
					>
						<header className="n-warband-drawer-header">
							<div className="min-w-0">
								<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-gold-300/80">Social roster</p>
								<h2 id="home-warband-title" className="font-display text-xl font-black uppercase tracking-wider text-ink-0">Warband</h2>
							</div>
							<button
								type="button"
								className="n-warband-drawer-close"
								aria-label="Close warband contacts"
								onClick={() => setShowWarbandPanel(false)}
							>
								<X size={16} strokeWidth={2} />
							</button>
						</header>
						<div className="n-warband-drawer-body">
							<Suspense fallback={<div className="animate-pulse h-32 bg-obsidian-800" />}>
								<FriendsPanel />
								{socialHiveUsername && (
									<Suspense fallback={<div className="animate-pulse h-32 bg-obsidian-800" />}>
										<SocialPresenceHeartbeat />
									</Suspense>
								)}
							</Suspense>
						</div>
					</aside>
				</div>
			)}

			{starterCeremony && starterClaimAccess.kind === 'allowed' && starterClaimAccess.accountId === starterCeremony.accountId && (
				<Suspense fallback={null}>
					<StarterPackCeremony
						accountId={starterClaimAccess.accountId}
						onComplete={() => setStarterCeremony(null)}
						onCancel={() => setStarterCeremony(null)}
					/>
				</Suspense>
			)}
			{showHiveLogin && <HiveLoginDialog onClose={() => setShowHiveLogin(false)} />}
		</div>
	);
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
	const sessionHiveUsername = hiveUsername;
	const completedMissions = useCampaignStore(state => state.completedMissions);
	const shouldCheckFactionPledge = useMemo(() => {
		const norseChapter = ALL_CHAPTERS.find(chapter => chapter.id === 'norse');
		return Boolean(norseChapter?.missions.every(mission => completedMissions[mission.id]));
	}, [completedMissions]);

	return (
		<>
			<EnvironmentBanner />
			<Outlet />
			{sessionHiveUsername && <Suspense fallback={null}><DuatClaimPopup /></Suspense>}
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
				<Suspense fallback={<LoadingScreen />}>
					<Routes>
						<Route path={routes.map} element={<MapPage />} />
						<Route
							path={routes.pokerViewportPrototype}
							element={import.meta.env.DEV ? <PokerViewportSafeAreaPrototype /> : <Navigate to={routes.home} replace />}
						/>
						<Route
							path={routes.cardLab}
							element={import.meta.env.DEV ? <CardLabPage /> : <Navigate to={routes.home} replace />}
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
									<Route path={routes.collection} element={<StarterEntitlementGate surface="collection"><CollectionPage /></StarterEntitlementGate>} />
									<Route path={routes.trading} element={<Navigate to={`${routes.marketplace}?tab=swaps`} replace />} />
									<Route path={routes.marketplace} element={<OnlineOnly label="Marketplace"><MarketplacePage /></OnlineOnly>} />
									<Route path={routes.treasury} element={<OnlineOnly label="Treasury"><TreasuryPage /></OnlineOnly>} />
									<Route path={routes.wallet} element={<WalletPage />} />
								</Route>

								<Route element={<CardDataRuntimeBoundary />}>
									<Route path={routes.packs} element={<ProtectedAccountGate surface="packs"><PacksPage /></ProtectedAccountGate>} />
								</Route>

								<Route element={<GameOrientationGate><GameplayRuntimeBoundary /></GameOrientationGate>}>
									<Route path={routes.game} element={<Navigate to={routes.home} replace />} />
									<Route path={routes.singleGame} element={<SingleGameRoute />} />
									<Route path={routes.campaignGame} element={<CampaignGameRoute />} />
									<Route path="/game/multiplayer" element={<Navigate to={routes.multiplayer} replace />} />
									<Route path={routes.multiplayer} element={
										<ProtectedAccountGate surface="multiplayer" requiresSignedSession>
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
