/**
 * AdminPanel.tsx — Genesis Ceremony & NFT Administration
 *
 * Only accessible to the configured Ragnarok admin account. Provides UI for:
 * 1. Genesis broadcast (one-time protocol init)
 * 2. Batch minting (all collectible cards)
 * 3. Seal (permanently lock minting)
 * 4. Pack minting & distribution (v1.1)
 * 5. Live supply dashboard
 * 6. Chain sync controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
	ArrowLeft,
	CheckCircle2,
	Circle,
	Clock3,
	LockKeyhole,
	LogOut,
	Package,
	PlayCircle,
	RefreshCw,
	ServerCog,
	ShieldAlert,
	ShieldCheck,
	XCircle,
	type LucideIcon,
} from 'lucide-react';
import { routes } from '../../../lib/routes';
import { useNFTUsername } from '../../nft/hooks';
import { cardRegistry } from '../../data/cardRegistry';
import { debug } from '../../config/debugConfig';
import { getRagnarokCollectionId } from '../../config/networkConfig';
import {
	ADMIN_MINTABLE_PACK_KEYS,
	PACK_DEFINITIONS,
	TESTNET_RUNE_PACK_POOL,
	formatHbdPrice,
	getActiveHbdPackSaleScenario,
	getHbdPackSaleScenarioAllocations,
	getHbdPackSaleScenarioTotals,
	getRunePackPoolTotals,
} from '@shared/protocol-core/packCatalog';
import { fetchChainStatus, type ChainStatusResponse } from '../../../data/chainAPI';
import type { AdminP2PStatus, AdminServerConfig, AdminSessionStatus } from '../../../data/blockchain/adminAdapters';

// Lazy-import admin functions to avoid loading blockchain code on non-admin pages
async function getAdminFns() {
	const mod = await import('../../../data/blockchain/genesisAdmin');
	return mod;
}
async function getMintSession() {
	const mod = await import('../../../../../shared/protocol-core/broadcast-utils');
	return mod as typeof import('../../../../../shared/protocol-core/broadcast-utils');
}
async function getReplayDB() {
	return import('../../../data/blockchain/replayDB');
}
async function getReplayEngine() {
	return import('../../../data/blockchain/replayEngine');
}

const ADMIN_MINTABLE_PACKS = ADMIN_MINTABLE_PACK_KEYS.map((key) => PACK_DEFINITIONS[key]);
const ADMIN_BATCH_SIZE = 50;
const DEFAULT_ADMIN_PACK_KEY = ADMIN_MINTABLE_PACKS[0]?.key ?? 'standard';

// ── Types ──

interface GenesisState {
	version: string;
	sealed: boolean;
	sealedAtBlock: number | null;
	totalSupply: number;
	cardDistribution: Record<string, number>;
	readerHash: string;
	genesisBlock: number;
}

interface SupplyInfo {
	rarity: string;
	cap: number;
	minted: number;
}

type Tab = 'status' | 'nfts' | 'genesis' | 'mint' | 'seal' | 'packs' | 'sync';
type CeremonyStepStatus = 'complete' | 'current' | 'locked';

interface CeremonyStepDefinition {
	readonly num: number;
	readonly label: string;
	readonly tab: Tab;
	readonly status: CeremonyStepStatus;
	readonly metric: string;
	readonly help: string;
}

type CutoverCheckId = AdminServerConfig['closedBetaCutover']['checks'][number]['id'];
type IndexerStatusState =
	| { readonly status: 'loading'; readonly data: ChainStatusResponse | null; readonly error: null; readonly updatedAt: number | null }
	| { readonly status: 'ready'; readonly data: ChainStatusResponse; readonly error: null; readonly updatedAt: number }
	| { readonly status: 'error'; readonly data: ChainStatusResponse | null; readonly error: string; readonly updatedAt: number | null };
type AdminP2PStatusState =
	| { readonly status: 'loading'; readonly data: AdminP2PStatus | null; readonly error: null; readonly updatedAt: number | null }
	| { readonly status: 'ready'; readonly data: AdminP2PStatus; readonly error: null; readonly updatedAt: number }
	| { readonly status: 'error'; readonly data: AdminP2PStatus | null; readonly error: string; readonly updatedAt: number | null };

const CUTOVER_CHECK_LABELS: Record<CutoverCheckId, string> = {
	testnet_profile: 'Testnet profile',
	closed_beta_reset_epoch: 'Closed Beta epoch',
	qa_full_catalog_disabled: 'QA catalog disabled',
	isolated_storage_namespace: 'Isolated storage',
	collection_id_configured: 'Collection id',
	nftlox_protocol_configured: 'NFTLox protocol',
	resettable_non_economic: 'Resettable testnet',
	ownership_authority_scope: 'Ownership authority',
};

// ── Component ──

export default function AdminPanel() {
	const hiveUsername = useNFTUsername();
	const location = useLocation();
	const initialTab: Tab = location.pathname === routes.adminNfts ? 'nfts' : 'status';
	const [tab, setTab] = useState<Tab>(initialTab);
	const [genesis, setGenesis] = useState<GenesisState | null>(null);
	const [supply, setSupply] = useState<SupplyInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
	const [mintProgress, setMintProgress] = useState({ done: 0, total: 0, running: false });
	const [adminConfig, setAdminConfig] = useState<AdminServerConfig | null>(null);
	const [adminConfigError, setAdminConfigError] = useState<string | null>(null);
	const [adminSession, setAdminSession] = useState<AdminSessionStatus | null>(null);
	const [adminSessionError, setAdminSessionError] = useState<string | null>(null);
	const [adminSessionLoading, setAdminSessionLoading] = useState(false);
	const [adminSessionAuthorizing, setAdminSessionAuthorizing] = useState(false);
	const [indexerStatus, setIndexerStatus] = useState<IndexerStatusState>({
		status: 'loading',
		data: null,
		error: null,
		updatedAt: null,
	});
	const [p2pStatus, setP2PStatus] = useState<AdminP2PStatusState>({
		status: 'loading',
		data: null,
		error: null,
		updatedAt: null,
	});
	const [packType, setPackType] = useState<string>(DEFAULT_ADMIN_PACK_KEY);
	const [packQuantity, setPackQuantity] = useState(1);

	// ── Auth Guard ──
	const isLocalReadOnlyRuntime = adminConfig?.stage === 'local' && !adminConfig.multisigConfigured;
	const isAdminWallet = Boolean(hiveUsername && adminConfig && hiveUsername === adminConfig.adminAccount);
	const isAdmin = Boolean(
		isLocalReadOnlyRuntime
		|| (
			isAdminWallet
			&& adminConfig
			&& adminSession?.authenticated
			&& adminSession.account === adminConfig.adminAccount
		),
	);

	useEffect(() => {
		let cancelled = false;
		async function loadAdminConfig() {
			try {
				const { getAdminServerConfig } = await import('../../../data/blockchain/adminAdapters');
				const config = await getAdminServerConfig({ requireMultisig: false });
				if (!cancelled) {
					setAdminConfig(config);
					setAdminConfigError(null);
				}
			} catch (err) {
				if (!cancelled) {
					setAdminConfig(null);
					setAdminConfigError(err instanceof Error ? err.message : 'Admin config unavailable');
				}
			}
		}
		void loadAdminConfig();
		return () => {
			cancelled = true;
		};
	}, []);

	const refreshAdminSession = useCallback(async () => {
		setAdminSessionLoading(true);
		try {
			const { getAdminSessionStatus } = await import('../../../data/blockchain/adminAdapters');
			const status = await getAdminSessionStatus();
			setAdminSession(status);
			setAdminSessionError(status.authenticated ? null : status.reason ?? null);
		} catch (err) {
			setAdminSession(null);
			setAdminSessionError(err instanceof Error ? err.message : 'Admin session unavailable');
		} finally {
			setAdminSessionLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!adminConfig) return;
		if (isLocalReadOnlyRuntime) return;
		void refreshAdminSession();
	}, [adminConfig, isLocalReadOnlyRuntime, refreshAdminSession]);

	useEffect(() => {
		setTab(location.pathname === routes.adminNfts ? 'nfts' : 'status');
	}, [location.pathname]);

	const refreshIndexerStatus = useCallback(async () => {
		try {
			const status = await fetchChainStatus();
			setIndexerStatus({
				status: 'ready',
				data: status,
				error: null,
				updatedAt: Date.now(),
			});
		} catch (err) {
			setIndexerStatus(previous => ({
				status: 'error',
				data: previous.data,
				error: err instanceof Error ? err.message : 'Indexer status unavailable',
				updatedAt: previous.updatedAt,
			}));
		}
	}, []);

	useEffect(() => {
		void refreshIndexerStatus();
		const timer = window.setInterval(() => {
			void refreshIndexerStatus();
		}, 15_000);
		return () => window.clearInterval(timer);
	}, [refreshIndexerStatus]);

	const refreshP2PStatus = useCallback(async () => {
		try {
			const { getAdminP2PStatus } = await import('../../../data/blockchain/adminAdapters');
			const status = await getAdminP2PStatus();
			setP2PStatus({
				status: 'ready',
				data: status,
				error: null,
				updatedAt: Date.now(),
			});
		} catch (err) {
			setP2PStatus(previous => ({
				status: 'error',
				data: previous.data,
				error: err instanceof Error ? err.message : 'P2P status unavailable',
				updatedAt: previous.updatedAt,
			}));
		}
	}, []);

	useEffect(() => {
		void refreshP2PStatus();
		const timer = window.setInterval(() => {
			void refreshP2PStatus();
		}, 15_000);
		return () => window.clearInterval(timer);
	}, [refreshP2PStatus]);

	// ── Load Genesis State ──
	const refreshState = useCallback(async () => {
		try {
			const db = await getReplayDB();
			const g = await db.getGenesisState();
			setGenesis(g as GenesisState);

			const supplyData: SupplyInfo[] = [];
			for (const rarity of ['common', 'rare', 'epic', 'mythic']) {
				const s = await db.getSupplyCounter(`pack:${rarity}`);
				supplyData.push({
					rarity,
					cap: s?.cap ?? 0,
					minted: s?.minted ?? 0,
				});
			}
			setSupply(supplyData);
		} catch (err) {
			debug.warn('[AdminPanel] Failed to load genesis state:', err);
		}
	}, []);

	useEffect(() => {
		void refreshState();
	}, [refreshState]);

	// ── Handlers ──

	const handleGenesis = async () => {
		if (!confirm('Broadcast GENESIS? This is a one-time operation that initializes the NFT protocol.')) return;
		setLoading(true);
		setResult(null);
		try {
			const admin = await getAdminFns();
			const res = await admin.broadcastGenesis();
			setResult({
				success: res.success,
				message: res.success
					? `Genesis broadcast! TxID: ${res.trxId} (block ${res.blockNum})`
					: `Failed: ${res.error}`,
			});
			if (res.success) await refreshState();
		} catch (err) {
			setResult({ success: false, message: String(err) });
		}
		setLoading(false);
	};

	const handleSeal = async () => {
		if (!confirm('SEAL the protocol? This PERMANENTLY locks direct minting. This cannot be undone.')) return;
		if (!confirm('Are you ABSOLUTELY SURE? After sealing, no more mint_batch ops will ever be accepted.')) return;
		setLoading(true);
		setResult(null);
		try {
			const admin = await getAdminFns();
			const res = await admin.broadcastSeal();
			setResult({
				success: res.success,
				message: res.success
					? `Sealed! TxID: ${res.trxId} (block ${res.blockNum}). Minting is permanently locked.`
					: `Failed: ${res.error}`,
			});
			if (res.success) await refreshState();
		} catch (err) {
			setResult({ success: false, message: String(err) });
		}
		setLoading(false);
	};

	const handleBatchMint = async () => {
		if (!adminConfig) { setResult({ success: false, message: 'Admin config is unavailable' }); return; }
		const collectible = cardRegistry.filter(c => c.collectible !== false && c.rarity);
		const batches: typeof collectible[] = [];
		for (let i = 0; i < collectible.length; i += ADMIN_BATCH_SIZE) {
			batches.push(collectible.slice(i, i + ADMIN_BATCH_SIZE));
		}

		// Check for recoverable session from a previous crash
		const session = await getMintSession();
		const savedSession = session.loadMintSession();
		let startBatch = 0;
		if (savedSession && savedSession.status === 'minting') {
			const progress = session.getSessionProgress(savedSession);
			if (confirm(`Resume previous mint session? ${progress.completed}/${progress.total} batches complete (${progress.percentage}%). Click Cancel to start fresh.`)) {
				startBatch = progress.completed;
			} else {
				session.clearMintSession();
			}
		} else if (!confirm(`Mint ${collectible.length} cards in ${batches.length} batches of ${ADMIN_BATCH_SIZE}? Each batch requires a Keychain signature.`)) {
			return;
		}

		// Initialize or recover session
		const mintSession = (savedSession && startBatch > 0 ? savedSession : {
			sessionId: `mint_${Date.now()}`,
			status: 'minting' as const,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			collectionId: getRagnarokCollectionId(),
			totalCards: collectible.length,
			batches: batches.map((b, idx) => ({
				batchNumber: idx,
				status: 'pending' as const,
				cardCount: b.length,
				trxId: undefined as string | undefined,
				error: undefined as string | undefined,
				timestamp: undefined as number | undefined,
			})),
		}) as NonNullable<ReturnType<typeof session.loadMintSession>>;

		setMintProgress({ done: startBatch, total: batches.length, running: true });
		setResult(null);

		const admin = await getAdminFns();
		let succeeded = startBatch;
		let lastError = '';

		for (let i = startBatch; i < batches.length; i++) {
			const batch = batches[i];
			const cards = batch.map((c, idx) => ({
				nft_id: `alpha-${c.id}-${idx}`,
				card_id: Number(c.id),
				rarity: (c.rarity || 'common').toLowerCase(),
				name: c.name,
				type: c.type,
				race: (c as unknown as Record<string, unknown>).race as string | undefined,
				foil: 'standard',
			}));

			// Mark batch as broadcasting and save session for crash recovery
			mintSession.batches[i].status = 'broadcasting';
			mintSession.updatedAt = Date.now();
			session.saveMintSession(mintSession);

			try {
				const res = await admin.broadcastMint({ to: adminConfig.adminAccount, cards });
				if (res.success) {
					succeeded++;
					mintSession.batches[i].status = 'confirmed';
					mintSession.batches[i].trxId = res.trxId;
					mintSession.batches[i].timestamp = Date.now();
				} else {
					lastError = res.error || 'Unknown error';
					mintSession.batches[i].status = 'failed';
					mintSession.batches[i].error = lastError;
					debug.warn(`[AdminPanel] Batch ${i + 1} failed:`, res.error);
				}
			} catch (err) {
				lastError = String(err);
				mintSession.batches[i].status = 'failed';
				mintSession.batches[i].error = lastError;
				debug.warn(`[AdminPanel] Batch ${i + 1} exception:`, err);
			}

			// Persist progress after every batch
			mintSession.updatedAt = Date.now();
			session.saveMintSession(mintSession);

			setMintProgress({ done: i + 1, total: batches.length, running: i + 1 < batches.length });
		}

		setMintProgress(p => ({ ...p, running: false }));

		// Clear session on full success, keep on partial failure for recovery
		if (succeeded === batches.length) {
			mintSession.status = 'complete';
			session.clearMintSession();
		} else {
			mintSession.status = 'failed';
			session.saveMintSession(mintSession);
		}

		setResult({
			success: succeeded === batches.length,
			message: succeeded === batches.length
				? `All ${batches.length} batches minted successfully (${collectible.length} cards)`
				: `${succeeded}/${batches.length} batches succeeded. Last error: ${lastError}. Session saved — resume on next visit.`,
		});
		await refreshState();
	};

	const handleMintPacks = async () => {
		if (!adminConfig) { setResult({ success: false, message: 'Admin config is unavailable' }); return; }
		const quantity = Number.isInteger(packQuantity) ? packQuantity : 0;
		if (quantity < 1 || quantity > 10) {
			setResult({ success: false, message: 'Choose 1 to 10 packs.' });
			return;
		}

		if (!confirm(`Mint ${quantity} ${packType} pack(s) into admin inventory?`)) return;
		setLoading(true);
		setResult(null);
		try {
			const admin = await getAdminFns();
			const res = await admin.broadcastPackMint({ packType, quantity, to: adminConfig.adminAccount });
			setResult({
				success: res.success,
				message: res.success
					? `Minted ${quantity} ${packType} pack(s)! TxID: ${res.trxId}`
					: `Failed: ${res.error}`,
			});
		} catch (err) {
			setResult({ success: false, message: String(err) });
		}
		setLoading(false);
	};

	const handleDistributePacks = async () => {
		setResult({
			success: false,
			message: 'Pack distribution is disabled until the admin route can bundle the required atomic HIVE transfer.',
		});
	};

	const handleSync = async () => {
		if (!hiveUsername) return;
		setLoading(true);
		setResult(null);
		try {
			const engine = await getReplayEngine();
			await engine.forceSync(hiveUsername!);
			await refreshState();
			setResult({ success: true, message: 'Chain sync complete. State refreshed.' });
		} catch (err) {
			setResult({ success: false, message: `Sync failed: ${err}` });
		}
		setLoading(false);
	};

	const handleAuthorizeAdminSession = async () => {
		setAdminSessionAuthorizing(true);
		setResult(null);
		try {
			const { requestAdminPanelSession } = await import('../../../data/blockchain/adminAdapters');
			const res = await requestAdminPanelSession(adminConfig ?? undefined);
			if (!res.success) {
				setAdminSessionError(res.error);
				setResult({ success: false, message: res.error });
				return;
			}
			setAdminSession(res.session);
			setAdminSessionError(null);
			setResult({ success: true, message: 'Admin session authorized.' });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setAdminSessionError(message);
			setResult({ success: false, message });
		} finally {
			setAdminSessionAuthorizing(false);
		}
	};

	const handleLogoutAdminSession = async () => {
		setLoading(true);
		setResult(null);
		try {
			const { logoutAdminPanelSession } = await import('../../../data/blockchain/adminAdapters');
			await logoutAdminPanelSession();
			setAdminSession(null);
			setAdminSessionError('Admin session closed.');
			setResult({ success: true, message: 'Admin session closed.' });
		} catch (err) {
			setResult({ success: false, message: err instanceof Error ? err.message : String(err) });
		} finally {
			setLoading(false);
		}
	};

	// ── Access Denied ──
	if (!adminConfig && !adminConfigError) {
		return (
			<div className="h-full flex items-center justify-center bg-gray-950">
				<div className="text-center">
					<div className="text-2xl font-bold text-amber-300 mb-2">Loading admin config...</div>
					<p className="text-gray-400">Validating the server admin authority.</p>
				</div>
			</div>
		);
	}

	if (adminConfig && !adminConfig.multisigConfigured && !isLocalReadOnlyRuntime) {
		return (
			<div className="h-full flex items-center justify-center bg-gray-950 px-6">
				<div className="w-full max-w-lg rounded-lg border border-amber-700/40 bg-gray-900/70 p-6 text-center shadow-lg shadow-black/20">
					<ShieldAlert className="mx-auto mb-4 h-10 w-10 text-amber-300" aria-hidden="true" />
					<h1 className="text-2xl font-bold text-amber-300 mb-2">Admin Operator Offline</h1>
					<p className="text-sm leading-6 text-gray-400">
						The admin panel can read runtime status, but private admin broadcasts require a dedicated operator account.
					</p>
					<div className="mt-5 space-y-2 text-left text-sm">
						<AdminConsumerRow label="Stage" value={adminConfig.stage} ok={adminConfig.stage === 'testnet'} />
						<AdminConsumerRow label="Phase" value={adminConfig.runtimePhase} ok={adminConfig.runtimePhase === 'closed-beta'} />
						<AdminConsumerRow label="Reset epoch" value={adminConfig.resetEpoch} ok={adminConfig.resetEpoch.length > 0} />
						<AdminConsumerRow label="Admin" value={`@${adminConfig.adminAccount}`} ok={adminConfig.adminAccount.length > 0} />
						<AdminConsumerRow label="Operator" value="Missing" ok={false} />
					</div>
					<p className="mt-4 rounded-md border border-gray-800 bg-gray-950/60 px-3 py-2 text-xs text-gray-400">
						Admin broadcasts are locked for this runtime. Use an operator-enabled server before opening admin actions.
					</p>
					<Link to={routes.home} className="inline-block mt-6 text-amber-400 hover:text-amber-300 underline">Back to Home</Link>
				</div>
			</div>
		);
	}

	if (isAdminWallet && !isAdmin) {
		return (
			<div className="h-full flex items-center justify-center bg-gray-950">
				<div className="text-center max-w-md px-6">
					<ShieldAlert className="mx-auto mb-4 h-10 w-10 text-amber-300" aria-hidden="true" />
					<div className="text-2xl font-bold text-amber-300 mb-2">Admin Session Required</div>
					<p className="text-gray-400 mb-4">
						Authorize panel access with one Posting Keychain signature. The signed custom JSON payload is verified by the server but is not broadcast to Hive.
					</p>
					{adminSessionError && (
						<p className="text-red-300 text-sm mb-4">{adminSessionError}</p>
					)}
					<button type="button"
						onClick={handleAuthorizeAdminSession}
						disabled={adminSessionLoading || adminSessionAuthorizing}
						className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
						<ShieldCheck className="h-4 w-4" aria-hidden="true" />
						{adminSessionAuthorizing
							? 'Authorizing...'
							: adminSessionLoading
								? 'Checking Session...'
								: 'Authorize Admin Session'}
					</button>
					<div className="text-gray-500 text-xs mt-4">
						Admin @{adminConfig?.adminAccount} · Operator @{adminConfig?.adminOperatorAccount}
					</div>
					<Link to={routes.home} className="inline-block mt-6 text-amber-400 hover:text-amber-300 underline">Back to Home</Link>
				</div>
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div className="h-full flex items-center justify-center bg-gray-950">
				<div className="text-center">
					<XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" aria-hidden="true" />
					<h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
					<p className="text-gray-400 mb-6">
						{adminConfigError
							? adminConfigError
							: hiveUsername
								? `@${hiveUsername} is not authorized.`
								: `Log in with Hive Keychain as @${adminConfig?.adminAccount ?? 'the configured admin'}.`}
					</p>
					<Link to={routes.home} className="text-amber-400 hover:text-amber-300 underline">Back to Home</Link>
				</div>
			</div>
		);
	}

	// ── Computed ──
	const collectibleCards = cardRegistry.filter(c => c.collectible !== false && c.rarity);
	const collectibleCount = collectibleCards.length;
	const isSealed = genesis?.sealed === true;
	const hasGenesis = !!genesis?.version;
	const batchCount = Math.ceil(collectibleCount / ADMIN_BATCH_SIZE);
	const mintedCardTotal = supply.reduce((total, counter) => total + counter.minted, 0);
	const mintProgressDone = mintProgress.total > 0
		? mintProgress.done >= mintProgress.total && !mintProgress.running
		: false;
	const mintComplete = collectibleCount > 0 && (mintedCardTotal >= collectibleCount || mintProgressDone);
	const mintedPercent = collectibleCount > 0
		? Math.min(100, Math.round((mintedCardTotal / collectibleCount) * 100))
		: 0;
	const currentFlowTab: Tab = !hasGenesis
		? 'genesis'
		: !mintComplete && !isSealed
			? 'mint'
			: !isSealed
				? 'seal'
				: 'packs';
	const flowSteps: CeremonyStepDefinition[] = [
		{
			num: 1,
			label: 'Broadcast Genesis',
			tab: 'genesis',
			status: hasGenesis ? 'complete' : 'current',
			metric: hasGenesis ? `v${genesis?.version ?? 1}` : 'Required',
			help: 'Creates the protocol, supply caps, and engine hash.',
		},
		{
			num: 2,
			label: 'Mint All Cards',
			tab: 'mint',
			status: mintComplete ? 'complete' : hasGenesis && !isSealed ? 'current' : 'locked',
			metric: `${Math.min(mintedCardTotal, collectibleCount).toLocaleString()} / ${collectibleCount.toLocaleString()}`,
			help: `${batchCount} batches, ${ADMIN_BATCH_SIZE} cards per approval.`,
		},
		{
			num: 3,
			label: 'Seal Protocol',
			tab: 'seal',
			status: isSealed ? 'complete' : hasGenesis && mintComplete ? 'current' : 'locked',
			metric: isSealed ? `Block ${genesis?.sealedAtBlock ?? 'pending'}` : 'Permanent',
			help: 'Locks direct minting after cards are minted.',
		},
		{
			num: 4,
			label: 'Mint Packs',
			tab: 'packs',
			status: isSealed ? 'current' : 'locked',
			metric: isSealed ? 'Ready' : 'After seal',
			help: 'Creates sealed pack inventory for the admin account.',
		},
		{
			num: 5,
			label: 'Distribute',
			tab: 'packs',
			status: 'locked',
			metric: 'Disabled',
			help: 'Blocked until atomic HIVE transfer bundling is implemented.',
		},
	];
	const activeFlowStep = flowSteps.find(step => step.tab === currentFlowTab && step.status === 'current')
		?? flowSteps.find(step => step.status === 'current')
		?? flowSteps[flowSteps.length - 1];
	const sessionExpiresLabel = adminSession?.expiresAt
		? new Date(adminSession.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		: 'Not active';
	const closedBetaCutover = adminConfig?.closedBetaCutover ?? null;
	const cutoverBlocked = closedBetaCutover?.inviteBlocked === true;
	const runtimePhaseLabel = adminConfig?.runtimePhase ?? 'unknown';
	const adminActionsLocked = adminConfig?.multisigConfigured !== true;
	const panelEyebrow = isLocalReadOnlyRuntime ? 'Admin Runtime' : 'Genesis Command Center';
	const panelTitle = isLocalReadOnlyRuntime
		? 'Runtime Status'
		: activeFlowStep?.label ?? 'Review protocol status';
	const panelHelp = isLocalReadOnlyRuntime
		? 'Review the active local server profile. Chain-changing admin actions are unavailable in this runtime.'
		: activeFlowStep?.help ?? 'Review the current chain state before broadcasting an admin operation.';
	const authorityLabel = isLocalReadOnlyRuntime ? 'Runtime' : 'Authority';
	const authorityValue = isLocalReadOnlyRuntime
		? runtimePhaseLabel
		: adminConfig?.adminAccount ? `@${adminConfig.adminAccount}` : 'missing';
	const phaseOk = isLocalReadOnlyRuntime || adminConfig?.runtimePhase === 'closed-beta';
	const inviteGateValue = cutoverBlocked ? 'Blocked' : 'Runtime pass';
	const inviteGateOk = isLocalReadOnlyRuntime || !cutoverBlocked;
	const collectibleByRarity = collectibleCards.reduce<Record<string, number>>((totals, card) => {
		const rarity = String(card.rarity).toLowerCase();
		return { ...totals, [rarity]: (totals[rarity] ?? 0) + 1 };
	}, {});
	const activeSaleScenario = getActiveHbdPackSaleScenario();
	const hbdSaleAllocations = getHbdPackSaleScenarioAllocations(activeSaleScenario);
	const hbdSaleTotals = getHbdPackSaleScenarioTotals(activeSaleScenario);
	const runePackPoolTotals = getRunePackPoolTotals(TESTNET_RUNE_PACK_POOL);
	const nftPlanRows = hbdSaleAllocations.map((allocation) => {
		const pack = PACK_DEFINITIONS[allocation.packKey];
		const runeCost = pack.runeCost ?? 0;
		return {
			...allocation,
			packName: pack.name,
			runeCost,
			runeExposure: runeCost * allocation.packCap,
		};
	});
	const totalNftInstancesToCreate = hbdSaleTotals.cardInstanceCap;
	const packMarketCapLabel = formatHbdPrice(hbdSaleTotals.grossThousandths);
	const visibleTabs: { id: Tab; label: string; icon: LucideIcon }[] = isLocalReadOnlyRuntime
		? [
			{ id: 'status', label: 'Status', icon: ServerCog },
			{ id: 'nfts', label: 'NFT Plan', icon: Package },
		]
		: [
			{ id: 'status', label: 'Status', icon: ServerCog },
			{ id: 'nfts', label: 'NFT Plan', icon: Package },
			{ id: 'genesis', label: 'Genesis', icon: PlayCircle },
			{ id: 'mint', label: 'Batch Mint', icon: Circle },
			{ id: 'seal', label: 'Seal', icon: LockKeyhole },
			{ id: 'packs', label: 'Packs', icon: Package },
			{ id: 'sync', label: 'Sync', icon: RefreshCw },
		];

	return (
		<div className="h-full overflow-y-auto bg-linear-to-b from-gray-950 via-red-950/20 to-gray-950 p-6 text-ink-0">
			<div className="mx-auto max-w-6xl">
				{/* Header */}
				<header className="mb-6 flex items-center justify-between gap-4">
					<Link to={routes.home}>
						<motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
							className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
							<ArrowLeft className="h-4 w-4" aria-hidden="true" />
							Home
						</motion.button>
						</Link>
						<div className="text-right">
							<div className="text-amber-400 font-bold text-sm">
								{isLocalReadOnlyRuntime ? 'Local runtime' : hiveUsername ? `@${hiveUsername}` : 'No wallet'}
							</div>
						<div className="text-gray-500 text-xs">
							{adminConfig?.stage} · {runtimePhaseLabel} · expires {sessionExpiresLabel}
						</div>
					</div>
				</header>

					<section className="mb-5 grid gap-4 lg:grid-cols-[1.45fr_0.85fr]">
						<div className="rounded-lg border border-amber-600/30 bg-gray-900/70 p-5 shadow-lg shadow-black/20">
							<div className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
								{panelEyebrow}
							</div>
							<h1 className="text-2xl font-bold text-white md:text-3xl">
								{panelTitle}
							</h1>
							<p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
								{panelHelp}
							</p>
							<div className="mt-4 flex flex-wrap gap-3">
								{!isLocalReadOnlyRuntime && (
									<button
										type="button"
										onClick={() => {
											if (activeFlowStep) setTab(activeFlowStep.tab);
											setResult(null);
										}}
										className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200"
									>
										<PlayCircle className="h-4 w-4" aria-hidden="true" />
										Open next step
									</button>
								)}
								<button
									type="button"
								onClick={refreshState}
								className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
							>
								<RefreshCw className="h-4 w-4" aria-hidden="true" />
								Refresh state
							</button>
						</div>
					</div>

						<aside className="rounded-lg border border-gray-700/70 bg-gray-900/60 p-5">
							<div className="mb-4 flex items-center justify-between gap-3">
								<div>
									<div className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">{authorityLabel}</div>
									<div className="mt-1 text-sm font-semibold text-white">{authorityValue}</div>
								</div>
								<ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
							</div>
							<div className="space-y-2 text-sm">
								{isLocalReadOnlyRuntime ? (
									<>
										<AdminConsumerRow label="Stage" value={adminConfig?.stage ?? 'unknown'} ok={adminConfig?.stage === 'local'} />
										<AdminConsumerRow label="Profile" value={runtimePhaseLabel} ok />
										<AdminConsumerRow label="Reset epoch" value={adminConfig?.resetEpoch ?? 'unknown'} ok={Boolean(adminConfig?.resetEpoch)} />
										<AdminConsumerRow label="Admin actions" value="Read only" ok />
									</>
								) : (
									<>
										<AdminConsumerRow label="Operator" value={`@${adminConfig?.adminOperatorAccount ?? 'missing'}`} ok={Boolean(adminConfig?.adminOperatorAccount)} />
										<AdminConsumerRow label="Session" value={adminSession?.authenticated ? 'Authorized' : 'Required'} ok={Boolean(adminSession?.authenticated)} />
										<AdminConsumerRow label="Phase" value={runtimePhaseLabel} ok={phaseOk} />
										<AdminConsumerRow label="QA catalog" value={adminConfig?.qaFullCatalogEnabled ? 'Enabled' : 'Disabled'} ok={adminConfig?.qaFullCatalogEnabled === false} />
										<AdminConsumerRow label="Invite gate" value={inviteGateValue} ok={inviteGateOk} />
										<AdminConsumerRow label="Protocol" value={hasGenesis ? `v${genesis.version}` : 'Not initialized'} ok={hasGenesis} />
										<AdminConsumerRow label="Cards minted" value={`${Math.min(mintedCardTotal, collectibleCount).toLocaleString()} / ${collectibleCount.toLocaleString()}`} ok={mintComplete} />
									</>
								)}
							</div>
						{!isLocalReadOnlyRuntime && (
							<button
								type="button"
								onClick={handleLogoutAdminSession}
								disabled={loading}
								className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-300 transition-colors hover:border-red-500/50 hover:text-red-200 disabled:opacity-50"
							>
								<LogOut className="h-3.5 w-3.5" aria-hidden="true" />
								Close session
							</button>
						)}
					</aside>
				</section>

				{!isLocalReadOnlyRuntime && (
					<section className="mb-6 rounded-lg border border-gray-700/50 bg-gray-900/60 p-4">
						<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
							<h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">Launch Flow</h2>
							<div className="text-xs text-gray-500">{mintedPercent}% card mint progress</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
							{flowSteps.map(step => (
								<CeremonyStep
									key={`${step.num}-${step.label}`}
									step={step}
									onSelect={() => {
										setTab(step.tab);
										setResult(null);
									}}
								/>
							))}
						</div>
					</section>
				)}

				{/* Tabs */}
				<nav className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-gray-800 bg-gray-900/50 p-1 md:grid-cols-7" aria-label="Admin panel sections">
					{visibleTabs.map(t => (
						<button
							key={t.id}
							type="button"
							onClick={() => { setTab(t.id); setResult(null); }}
							className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${tab === t.id
								? 'bg-amber-600/20 text-amber-300 border border-amber-600/40'
								: 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
						>
							<t.icon className="h-4 w-4" aria-hidden="true" />
							{t.label}
						</button>
					))}
				</nav>

				{/* Result Banner */}
				{result && (
					<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
						className={`mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${result.success
							? 'bg-green-900/30 border-green-600/40 text-green-300'
							: 'bg-red-900/30 border-red-600/40 text-red-300'}`}>
						{result.success
							? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
							: <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
						<span>{result.message}</span>
					</motion.div>
				)}

					{/* ═══ STATUS TAB ═══ */}
					{tab === 'status' && (
						<div className="space-y-4">
							{isLocalReadOnlyRuntime ? (
								<>
									<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
										<StatCard label="Stage" value={adminConfig?.stage ?? 'unknown'} color="blue" />
										<StatCard label="Phase" value={runtimePhaseLabel} color="green" />
										<StatCard label="Reset Epoch" value={adminConfig?.resetEpoch ?? 'unknown'} color="blue" />
										<StatCard label="Protocol ID" value={adminConfig?.protocolId ?? 'unknown'} color="blue" />
									</div>
									<section className="rounded-lg border border-gray-700/50 bg-gray-900/60 p-4">
											<h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-300">Local Runtime</h3>
											<div className="grid gap-2 md:grid-cols-2">
												<AdminConsumerRow label="Storage" value={adminConfig?.storageNamespace ?? 'unknown'} ok={Boolean(adminConfig?.storageNamespace)} />
												<AdminConsumerRow label="Reset policy" value={adminConfig?.resettable ? 'Resettable' : 'Permanent'} ok={adminConfig?.resettable === true} />
												<AdminConsumerRow label="Economy" value={adminConfig?.economic ? 'Economic' : 'Disabled'} ok={adminConfig?.economic === false} />
												<AdminConsumerRow label="Actions" value="Read only" ok />
											</div>
										<div className="mt-3 rounded-md border border-gray-800 bg-gray-950/60 px-3 py-2 text-xs text-gray-400">
											Local development mode is for inspection only. Chain-changing admin controls are hidden or disabled.
										</div>
									</section>
								</>
							) : (
								<>
									<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
										<StatCard label="Protocol" value={hasGenesis ? `v${genesis.version}` : 'Not initialized'} color={hasGenesis ? 'green' : 'red'} />
										<StatCard label="Sealed" value={isSealed ? `Yes (block ${genesis.sealedAtBlock})` : 'No'} color={isSealed ? 'amber' : 'gray'} />
										<StatCard label="Collectible Cards" value={String(collectibleCount)} color="blue" />
										<StatCard label="Pack Market Cap" value={packMarketCapLabel} color="purple" />
										<StatCard label="RUNE Circulation" value={TESTNET_RUNE_PACK_POOL.runeCap.toLocaleString()} color="amber" />
										<StatCard label="WASM Hash" value={genesis?.readerHash ? genesis.readerHash.slice(0, 12) + '...' : 'N/A'} color="purple" />
									</div>

									<section className="rounded-lg border border-gray-700/50 bg-gray-900/60 p-4">
										<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
											<h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">Runtime Cutover</h3>
											<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cutoverBlocked
												? 'border-red-700/50 bg-red-950/40 text-red-200'
												: 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200'}`}>
												{cutoverBlocked
													? <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
													: <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
												{cutoverBlocked ? 'Invites blocked' : 'Runtime checks pass'}
											</span>
										</div>
										<div className="grid gap-3 md:grid-cols-4">
											<StatCard label="Phase" value={runtimePhaseLabel} color={adminConfig?.runtimePhase === 'closed-beta' ? 'green' : 'amber'} />
											<StatCard label="Reset Epoch" value={adminConfig?.resetEpoch ?? 'missing'} color={adminConfig?.resetEpoch ? 'blue' : 'red'} />
											<StatCard label="QA Catalog" value={adminConfig?.qaFullCatalogEnabled ? 'Enabled' : 'Disabled'} color={adminConfig?.qaFullCatalogEnabled ? 'red' : 'green'} />
											<StatCard label="NFTLox" value={adminConfig?.nftLoxProtocolId ?? 'missing'} color={adminConfig?.nftLoxProtocolId ? 'blue' : 'red'} />
										</div>
										{closedBetaCutover && (
											<div className="mt-3 grid gap-2 md:grid-cols-2">
												{closedBetaCutover.checks.map((check) => (
													<AdminConsumerRow
														key={check.id}
														label={formatCutoverCheckId(check.id)}
														value={check.status === 'pass' ? 'Pass' : 'Blocked'}
														ok={check.status === 'pass'}
													/>
												))}
											</div>
										)}
										{closedBetaCutover?.operatorSignoffRequired && (
											<div className="mt-3 rounded-md border border-amber-700/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
												Operator sign-off is still required for final NFTLoX schema, ownership proof, tester cohort, and invite timing.
											</div>
										)}
									</section>

									<h3 className="text-amber-300 font-bold text-sm uppercase tracking-wider mt-6 mb-2">Supply Counters</h3>
									{supply.length > 0 ? (
										<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
											{supply.map(s => (
												<div key={s.rarity} className="bg-gray-900/60 rounded-lg p-3 border border-gray-700/50">
													<div className="text-gray-400 text-xs uppercase">{s.rarity}</div>
													<div className="text-white font-bold text-lg">{s.minted.toLocaleString()}</div>
													<div className="text-gray-500 text-xs">/ {s.cap.toLocaleString()} cap</div>
													{s.cap > 0 && (
														<div className="mt-1 h-1 bg-gray-800 rounded-full overflow-hidden">
															<div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (s.minted / s.cap) * 100)}%` }} />
														</div>
													)}
												</div>
											))}
										</div>
									) : (
										<div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/40 p-4 text-sm text-gray-500">
											No supply counters yet. Broadcast Genesis, then refresh state.
										</div>
									)}
							</>
						)}

						<IndexerStatusCard
							state={indexerStatus}
							onRefresh={refreshIndexerStatus}
						/>

						<P2PStatusCard
							state={p2pStatus}
							onRefresh={refreshP2PStatus}
						/>

						<button
							type="button"
							onClick={refreshState}
							className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
						>
							<RefreshCw className="h-4 w-4" aria-hidden="true" />
							Refresh State
						</button>
					</div>
				)}

				{/* ═══ NFT PLAN TAB ═══ */}
				{tab === 'nfts' && (
					<div className="space-y-4">
						<section className="rounded-lg border border-gray-700/50 bg-gray-900/60 p-6">
							<div className="mb-4 flex flex-wrap items-start justify-between gap-4">
								<div>
									<h3 className="text-lg font-bold text-amber-300">NFT Creation Plan</h3>
									<p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
										Read-only projection from the live card registry and shared pack economy. No NFT mint, pack mint, or distribution broadcast is connected here yet.
									</p>
								</div>
								<span className="rounded-full border border-amber-700/40 bg-amber-950/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-200">
									Not connected
								</span>
							</div>

							<div className="grid gap-3 md:grid-cols-4">
								<StatCard label="Card Templates" value={collectibleCount.toLocaleString()} color="blue" />
								<StatCard label="NFT Instances" value={totalNftInstancesToCreate.toLocaleString()} color="green" />
								<StatCard label="Pack Supply" value={hbdSaleTotals.packCap.toLocaleString()} color="amber" />
								<StatCard label="Estimated Market Cap" value={packMarketCapLabel} color="purple" />
							</div>

							<div className="mt-4 grid gap-3 md:grid-cols-4">
								<StatCard label="RUNE Circulation" value={TESTNET_RUNE_PACK_POOL.runeCap.toLocaleString()} color="amber" />
								<StatCard label="RUNE Pack Exposure" value={runePackPoolTotals.runeExposure.toLocaleString()} color="blue" />
								<StatCard label="Sale Scenario" value={activeSaleScenario.key} color="gray" />
								<StatCard label="Target Accounts" value={TESTNET_RUNE_PACK_POOL.targetAccounts.toLocaleString()} color="green" />
							</div>

							<div className="mt-5 rounded-lg border border-gray-800 bg-gray-950/50 p-4">
								<h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Card Templates by Rarity</h4>
								<div className="grid gap-2 md:grid-cols-4">
									{['common', 'rare', 'epic', 'mythic'].map((rarity) => (
										<AdminConsumerRow
											key={rarity}
											label={rarity}
											value={(collectibleByRarity[rarity] ?? 0).toLocaleString()}
											ok={(collectibleByRarity[rarity] ?? 0) > 0}
										/>
									))}
								</div>
							</div>
						</section>

						<section className="rounded-lg border border-gray-700/50 bg-gray-900/60 p-6">
							<h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-300">Pack Supply and Economy</h3>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[760px] border-collapse text-left text-sm">
									<thead>
										<tr className="border-b border-gray-800 text-xs uppercase tracking-[0.14em] text-gray-500">
											<th className="py-2 pr-4">Pack</th>
											<th className="py-2 pr-4 text-right">Packs</th>
											<th className="py-2 pr-4 text-right">Cards / Pack</th>
											<th className="py-2 pr-4 text-right">NFT Instances</th>
											<th className="py-2 pr-4 text-right">Unit Price</th>
											<th className="py-2 pr-4 text-right">Gross HBD</th>
											<th className="py-2 text-right">RUNE Exposure</th>
										</tr>
									</thead>
									<tbody>
										{nftPlanRows.map((row) => (
											<tr key={row.packKey} className="border-b border-gray-800/70 text-gray-200">
												<td className="py-3 pr-4 font-semibold text-white">{row.packName}</td>
												<td className="py-3 pr-4 text-right">{row.packCap.toLocaleString()}</td>
												<td className="py-3 pr-4 text-right">{row.cardCount.toLocaleString()}</td>
												<td className="py-3 pr-4 text-right">{row.cardInstanceCap.toLocaleString()}</td>
												<td className="py-3 pr-4 text-right">{formatHbdPrice(row.unitPriceThousandths)}</td>
												<td className="py-3 pr-4 text-right">{formatHbdPrice(row.grossThousandths)}</td>
												<td className="py-3 text-right">{row.runeExposure.toLocaleString()}</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr className="text-sm font-bold text-amber-200">
											<td className="pt-3 pr-4">Total</td>
											<td className="pt-3 pr-4 text-right">{hbdSaleTotals.packCap.toLocaleString()}</td>
											<td className="pt-3 pr-4 text-right">-</td>
											<td className="pt-3 pr-4 text-right">{hbdSaleTotals.cardInstanceCap.toLocaleString()}</td>
											<td className="pt-3 pr-4 text-right">-</td>
											<td className="pt-3 pr-4 text-right">{packMarketCapLabel}</td>
											<td className="pt-3 text-right">{runePackPoolTotals.runeExposure.toLocaleString()}</td>
										</tr>
									</tfoot>
								</table>
							</div>
							<p className="mt-4 text-xs leading-5 text-gray-500">
								Market cap estimate is gross HBD sellout capacity for the active shared sale scenario. RUNE circulation is the testnet season cap; RUNE pack exposure is the redeemable pack pool pressure from the same shared catalog.
							</p>
						</section>
					</div>
				)}

				{/* ═══ GENESIS TAB ═══ */}
				{tab === 'genesis' && (
					<div className="space-y-4">
						<div className="bg-gray-900/60 rounded-lg p-6 border border-gray-700/50">
							<h3 className="text-amber-300 font-bold text-lg mb-2">Broadcast Genesis</h3>
							<p className="text-gray-400 text-sm mb-4">
								One-time operation. Sets the collection id, supply caps, reward caps, and WASM engine hash.
							</p>
							{hasGenesis ? (
								<div className="text-green-400 text-sm p-3 bg-green-900/20 rounded-lg border border-green-700/30">
									Genesis already broadcast at block {genesis.genesisBlock}. Protocol version: {genesis.version}
								</div>
								) : (
									<motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
										onClick={handleGenesis} disabled={loading || adminActionsLocked}
										className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
										{loading ? 'Broadcasting...' : 'Broadcast Genesis'}
								</motion.button>
							)}
						</div>
					</div>
				)}

				{/* ═══ BATCH MINT TAB ═══ */}
				{tab === 'mint' && (
					<div className="space-y-4">
						<div className="bg-gray-900/60 rounded-lg p-6 border border-gray-700/50">
							<h3 className="text-amber-300 font-bold text-lg mb-2">Batch Mint All Cards</h3>
							<p className="text-gray-400 text-sm mb-4">
								Mints all {collectibleCount.toLocaleString()} collectible cards in batches of {ADMIN_BATCH_SIZE}.
								Each batch requires one Hive Keychain approval ({batchCount} approvals total).
							</p>

							{!hasGenesis && (
								<div className="text-red-400 text-sm p-3 bg-red-900/20 rounded-lg border border-red-700/30 mb-4">
									Genesis must be broadcast first.
								</div>
							)}
							{isSealed && (
								<div className="text-red-400 text-sm p-3 bg-red-900/20 rounded-lg border border-red-700/30 mb-4">
									Protocol is sealed. No more minting is possible.
								</div>
							)}
							{hasGenesis && !isSealed && mintedCardTotal > 0 && !mintComplete && (
								<div className="mb-4 rounded-lg border border-amber-700/30 bg-amber-900/20 p-3 text-sm text-amber-200">
									{mintedCardTotal.toLocaleString()} cards are already recorded. Resume minting to complete the remaining supply.
								</div>
							)}

							{mintProgress.total > 0 && (
								<div className="mb-4">
									<div className="flex justify-between text-sm text-gray-400 mb-1">
										<span>Batch {mintProgress.done} / {mintProgress.total}</span>
										<span>{Math.round((mintProgress.done / mintProgress.total) * 100)}%</span>
									</div>
									<div className="h-2 bg-gray-800 rounded-full overflow-hidden">
										<div className="h-full bg-amber-500 rounded-full transition-all duration-300"
											style={{ width: `${(mintProgress.done / mintProgress.total) * 100}%` }} />
									</div>
								</div>
							)}

							<motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
								onClick={handleBatchMint} disabled={loading || adminActionsLocked || !hasGenesis || isSealed || mintProgress.running}
								className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
								{mintProgress.running ? `Minting... (${mintProgress.done}/${mintProgress.total})` : `Mint All ${collectibleCount.toLocaleString()} Cards`}
							</motion.button>
						</div>
					</div>
				)}

				{/* ═══ SEAL TAB ═══ */}
				{tab === 'seal' && (
					<div className="space-y-4">
						<div className="bg-gray-900/60 rounded-lg p-6 border border-red-900/30">
							<h3 className="text-red-400 font-bold text-lg mb-2">⚠ Seal Protocol (IRREVERSIBLE)</h3>
							<p className="text-gray-400 text-sm mb-4">
								Permanently locks direct minting. After sealing, no more mint_batch operations will be accepted.
								Pack opening (v1.1 pack_burn) still works — sealed packs derive cards from DNA.
								This is the final step of the genesis ceremony.
							</p>

							{isSealed ? (
								<div className="text-amber-400 text-sm p-3 bg-amber-900/20 rounded-lg border border-amber-700/30">
									Protocol sealed at block {genesis.sealedAtBlock}. Minting is permanently locked.
								</div>
							) : !hasGenesis ? (
								<div className="text-red-400 text-sm p-3 bg-red-900/20 rounded-lg border border-red-700/30">
									Genesis must be broadcast first.
								</div>
							) : !mintComplete ? (
								<div className="text-amber-200 text-sm p-3 bg-amber-900/20 rounded-lg border border-amber-700/30">
									Mint all collectible cards before sealing. Current mint count: {Math.min(mintedCardTotal, collectibleCount).toLocaleString()} / {collectibleCount.toLocaleString()}.
								</div>
							) : (
								<motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
									onClick={handleSeal} disabled={loading || adminActionsLocked || !mintComplete}
									className="px-6 py-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-lg transition-colors border border-red-500">
									{loading ? 'Sealing...' : 'Seal Protocol Permanently'}
								</motion.button>
							)}
						</div>
					</div>
				)}

				{/* ═══ PACKS TAB ═══ */}
				{tab === 'packs' && (
					<div className="space-y-4">
						{/* Mint Packs */}
						<div className="bg-gray-900/60 rounded-lg p-6 border border-gray-700/50">
							<h3 className="text-amber-300 font-bold text-lg mb-2">Mint Pack NFTs</h3>
							<p className="text-gray-400 text-sm mb-4">Create sealed packs into admin inventory. Packs must be distributed separately.</p>
							<div className="mb-4 grid gap-3 md:grid-cols-[1fr_120px_auto]">
								<label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
									Pack type
									<select
										value={packType}
										onChange={(event) => setPackType(event.target.value)}
										className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium normal-case tracking-normal text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
									>
										{ADMIN_MINTABLE_PACKS.map((pack) => (
											<option key={pack.key} value={pack.key}>{pack.name.replace(' Pack', '')} ({pack.cardCount} cards)</option>
										))}
									</select>
								</label>
								<label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
									Quantity
									<input
										type="number"
										min="1"
										max="10"
										value={packQuantity}
										onChange={(event) => setPackQuantity(Number.parseInt(event.target.value, 10) || 0)}
										className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium normal-case tracking-normal text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
									/>
									</label>
									<motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
										onClick={handleMintPacks} disabled={loading || adminActionsLocked || !isSealed}
										className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-bold text-white transition-colors hover:bg-amber-500 disabled:opacity-50">
									<Package className="h-4 w-4" aria-hidden="true" />
									{loading ? 'Minting...' : 'Mint Packs'}
								</motion.button>
							</div>
							{!isSealed && <p className="text-gray-500 text-xs">Pack minting unlocks after the protocol is sealed.</p>}
						</div>

						{/* Distribute Packs */}
						<div className="bg-gray-900/60 rounded-lg p-6 border border-gray-700/50">
							<h3 className="text-amber-300 font-bold text-lg mb-2">Distribute Packs</h3>
							<p className="text-gray-400 text-sm mb-4">Disabled until the server can bundle the required 0.001 HIVE atomic transfer.</p>
							<div className="space-y-3 mb-4">
								<input id="dist-recipient" type="text" placeholder="Recipient @username"
									disabled
									className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 opacity-50" />
								<textarea id="dist-uids" placeholder="Pack UIDs (one per line)" rows={3}
									disabled
									className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 font-mono text-xs opacity-50" />
								<motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
									onClick={handleDistributePacks} disabled
									className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
									Distribution Disabled
								</motion.button>
							</div>
						</div>
					</div>
				)}

				{/* ═══ SYNC TAB ═══ */}
				{tab === 'sync' && (
					<div className="space-y-4">
						<div className="bg-gray-900/60 rounded-lg p-6 border border-gray-700/50">
							<h3 className="text-amber-300 font-bold text-lg mb-2">Chain Sync</h3>
							<p className="text-gray-400 text-sm mb-4">
								Force a full resync from Hive blockchain. Replays all ops through the deterministic engine
								and rebuilds IndexedDB state.
							</p>
							<motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
								onClick={handleSync} disabled={loading}
								className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50">
								<RefreshCw className="h-4 w-4" aria-hidden="true" />
								{loading ? 'Syncing...' : 'Force Full Sync'}
							</motion.button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// ── Stat Card Sub-Component ──

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
	const colorMap: Record<string, string> = {
		green: 'text-green-400 border-green-700/30',
		red: 'text-red-400 border-red-700/30',
		amber: 'text-amber-400 border-amber-700/30',
		blue: 'text-blue-400 border-blue-700/30',
		purple: 'text-purple-400 border-purple-700/30',
		gray: 'text-gray-400 border-gray-700/30',
	};
	return (
		<div className={`bg-gray-900/60 rounded-lg p-3 border ${colorMap[color] || colorMap.gray}`}>
			<div className="text-gray-500 text-xs uppercase">{label}</div>
			<div className={`break-words font-bold text-sm ${colorMap[color]?.split(' ')[0]}`}>{value}</div>
		</div>
	);
}

function formatCutoverCheckId(id: CutoverCheckId): string {
	return CUTOVER_CHECK_LABELS[id];
}

function IndexerStatusCard({
	state,
	onRefresh,
}: {
	state: IndexerStatusState;
	onRefresh: () => void;
}) {
	const data = state.data;
	const health = deriveIndexerHealth(state);
	const lastSyncedLabel = data?.lastSyncedAt
		? new Date(data.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
		: 'No sync yet';
	const refreshedLabel = state.updatedAt
		? new Date(state.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
		: 'Pending';

	return (
		<section className="rounded-lg border border-gray-700/50 bg-gray-900/60 p-4">
			<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">Indexer Status</h3>
					<p className="mt-1 text-xs text-gray-500">Server projection from /api/chain/status.</p>
				</div>
				<div className="flex items-center gap-2">
					<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${health.className}`}>
						{health.ok
							? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
							: <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
						{health.label}
					</span>
					<button
						type="button"
						onClick={onRefresh}
						className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-950 px-2.5 py-1 text-xs font-semibold text-gray-300 transition-colors hover:border-amber-600/50 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
					>
						<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
						Refresh
					</button>
				</div>
			</div>

			{state.status === 'error' && (
				<div className="mb-3 rounded-md border border-red-800/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
					{state.error}
				</div>
			)}

			<div className="grid gap-3 md:grid-cols-4">
				<StatCard label="Processed LIB" value={(data?.lastIrreversibleBlockProcessed ?? 0).toLocaleString()} color={health.ok ? 'green' : 'amber'} />
				<StatCard label="Target Block" value={(data?.syncTargetBlock ?? 0).toLocaleString()} color="blue" />
				<StatCard label="Blocks Behind" value={(data?.blocksBehind ?? 0).toLocaleString()} color={(data?.blocksBehind ?? 0) === 0 ? 'green' : 'amber'} />
				<StatCard label="Known Accounts" value={(data?.knownAccounts ?? 0).toLocaleString()} color="purple" />
			</div>

			<div className="mt-3 grid gap-2 md:grid-cols-3 text-sm">
				<AdminConsumerRow label="Last sync" value={lastSyncedLabel} ok={Boolean(data?.lastSyncedAt)} />
				<AdminConsumerRow label="Head block" value={(data?.headBlock ?? 0).toLocaleString()} ok={Boolean(data?.headBlock)} />
				<AdminConsumerRow label="Checked" value={refreshedLabel} ok={state.status !== 'loading'} />
			</div>
		</section>
	);
}

function deriveIndexerHealth(state: IndexerStatusState): {
	readonly ok: boolean;
	readonly label: string;
	readonly className: string;
} {
	if (state.status === 'loading') {
		return {
			ok: false,
			label: 'Loading',
			className: 'border-gray-700/50 bg-gray-950/40 text-gray-300',
		};
	}
	if (state.status === 'error' && !state.data) {
		return {
			ok: false,
			label: 'Unavailable',
			className: 'border-red-700/50 bg-red-950/40 text-red-200',
		};
	}
	if (state.data?.inSync) {
		return {
			ok: true,
			label: 'In sync',
			className: 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200',
		};
	}
	return {
		ok: false,
		label: 'Catching up',
		className: 'border-amber-700/50 bg-amber-950/40 text-amber-200',
	};
}

function P2PStatusCard({
	state,
	onRefresh,
}: {
	state: AdminP2PStatusState;
	onRefresh: () => void;
}) {
	const data = state.data;
	const health = deriveP2PHealth(state);
	const lastErrorLabel = data?.summary.lastErrorAt
		? `${data.summary.lastErrorReason ?? 'unknown'} · ${new Date(data.summary.lastErrorAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
		: 'None';
	const refreshedLabel = state.updatedAt
		? new Date(state.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
		: 'Pending';
	const topErrorRows = Object.entries(data?.relay.errorsByReason ?? {})
		.sort(([, a], [, b]) => b - a)
		.slice(0, 4);

	return (
		<section className="rounded-lg border border-gray-700/50 bg-gray-900/60 p-4">
			<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">P2P Status</h3>
					<p className="mt-1 text-xs text-gray-500">Relay, matchmaking, presence, and challenge telemetry.</p>
				</div>
				<div className="flex items-center gap-2">
					<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${health.className}`}>
						{health.ok
							? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
							: <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
						{health.label}
					</span>
					<button
						type="button"
						onClick={onRefresh}
						className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-950 px-2.5 py-1 text-xs font-semibold text-gray-300 transition-colors hover:border-amber-600/50 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
					>
						<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
						Refresh
					</button>
				</div>
			</div>

			{state.status === 'error' && (
				<div className="mb-3 rounded-md border border-red-800/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
					{state.error}
				</div>
			)}

			<div className="grid gap-3 md:grid-cols-4">
				<StatCard label="Players In Matches" value={(data?.summary.playersInRelayMatches ?? 0).toLocaleString()} color="green" />
				<StatCard label="Open Relay Rooms" value={(data?.relay.activeRooms ?? 0).toLocaleString()} color="blue" />
				<StatCard label="Queue" value={(data?.matchmaking.queueLength ?? 0).toLocaleString()} color="amber" />
				<StatCard label="Online Presence" value={(data?.social.onlineUsers ?? 0).toLocaleString()} color="purple" />
			</div>

			<div className="mt-3 grid gap-2 md:grid-cols-3 text-sm">
				<AdminConsumerRow label="Available" value={(data?.social.availableUsers ?? 0).toLocaleString()} ok />
				<AdminConsumerRow label="In match" value={(data?.social.inMatchUsers ?? 0).toLocaleString()} ok />
				<AdminConsumerRow label="Reconnecting" value={(data?.social.reconnectingUsers ?? 0).toLocaleString()} ok={(data?.social.reconnectingUsers ?? 0) === 0} />
				<AdminConsumerRow label="Pending challenges" value={(data?.social.pendingChallenges ?? 0).toLocaleString()} ok />
				<AdminConsumerRow label="Messages relayed" value={(data?.relay.totalMessagesRelayed ?? 0).toLocaleString()} ok />
				<AdminConsumerRow label="Dropped frames" value={(data?.relay.totalFramesDropped ?? 0).toLocaleString()} ok={(data?.relay.totalFramesDropped ?? 0) === 0} />
				<AdminConsumerRow label="Last error" value={lastErrorLabel} ok={!data?.summary.lastErrorAt} />
				<AdminConsumerRow label="Checked" value={refreshedLabel} ok={state.status !== 'loading'} />
				<AdminConsumerRow label="Oldest queue" value={formatDurationMs(data?.matchmaking.oldestQueuedMs ?? null)} ok={(data?.matchmaking.oldestQueuedMs ?? 0) < 60_000} />
			</div>

			{topErrorRows.length > 0 && (
				<div className="mt-3 rounded-md border border-gray-800 bg-gray-950/50 px-3 py-2">
					<div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Top Errors</div>
					<div className="grid gap-2 md:grid-cols-2">
						{topErrorRows.map(([reason, count]) => (
							<AdminConsumerRow
								key={reason}
								label={reason}
								value={count.toLocaleString()}
								ok={false}
							/>
						))}
					</div>
				</div>
			)}
		</section>
	);
}

function deriveP2PHealth(state: AdminP2PStatusState): {
	readonly ok: boolean;
	readonly label: string;
	readonly className: string;
} {
	if (state.status === 'loading') {
		return {
			ok: false,
			label: 'Loading',
			className: 'border-gray-700/50 bg-gray-950/40 text-gray-300',
		};
	}
	if (state.status === 'error' && !state.data) {
		return {
			ok: false,
			label: 'Unavailable',
			className: 'border-red-700/50 bg-red-950/40 text-red-200',
		};
	}
	if ((state.data?.relay.totalErrors ?? 0) > 0) {
		return {
			ok: false,
			label: 'Errors found',
			className: 'border-amber-700/50 bg-amber-950/40 text-amber-200',
		};
	}
	return {
		ok: true,
		label: 'Operational',
		className: 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200',
	};
}

function formatDurationMs(value: number | null): string {
	if (value === null) return 'None';
	const seconds = Math.floor(value / 1_000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

function AdminConsumerRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-md border border-gray-800 bg-gray-950/50 px-3 py-2">
			<span className="text-gray-500">{label}</span>
			<span className={`inline-flex items-center gap-1.5 font-semibold ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
				{ok
					? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
					: <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
				{value}
			</span>
		</div>
	);
}

// ── Ceremony Step Sub-Component ──

function CeremonyStep({
	step,
	onSelect,
}: {
	step: CeremonyStepDefinition;
	onSelect: () => void;
}) {
	const complete = step.status === 'complete';
	const current = step.status === 'current';
	const locked = step.status === 'locked';
	return (
		<button
			type="button"
			onClick={onSelect}
			disabled={locked}
			className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${complete
				? 'bg-green-900/20 border-green-700/40'
				: current
					? 'bg-amber-900/20 border-amber-600/40 ring-1 ring-amber-500/30 hover:bg-amber-900/30'
					: 'bg-gray-900/40 border-gray-700/30 opacity-55'}`}
		>
			<div className="flex items-center gap-1.5 mb-1">
				<span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${complete
					? 'bg-green-600 text-white' : current ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
					{complete ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : step.num}
				</span>
				<span className={`font-bold ${complete ? 'text-green-400' : current ? 'text-amber-300' : 'text-gray-500'}`}>{step.label}</span>
				{locked && <LockKeyhole className="ml-auto h-3.5 w-3.5 text-gray-500" aria-hidden="true" />}
			</div>
			<div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">{step.metric}</div>
			<p className="text-gray-400 leading-tight">{step.help}</p>
		</button>
	);
}
