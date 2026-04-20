/**
 * AdminPanel.tsx — Genesis Ceremony & NFT Administration
 *
 * Only accessible to @ragnarok account. Provides UI for:
 * 1. Genesis broadcast (one-time protocol init)
 * 2. Batch minting (all collectible cards)
 * 3. Seal (permanently lock minting)
 * 4. Pack minting & distribution (v1.1)
 * 5. Live supply dashboard
 * 6. Chain sync controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routes } from '../../../lib/routes';
import { useNFTUsername } from '../../nft/hooks';
import { RAGNAROK_ACCOUNT } from '../../../data/blockchain/hiveConfig';
import { cardRegistry } from '../../data/cardRegistry';
import { debug } from '../../config/debugConfig';

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
async function getHiveSync() {
	const { hiveSync } = await import('../../../data/HiveSync');
	return hiveSync;
}
async function getReplayEngine() {
	return import('../../../data/blockchain/replayEngine');
}

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

type Tab = 'status' | 'genesis' | 'mint' | 'seal' | 'packs' | 'sync';

// ── Component ──

export default function AdminPanel() {
	const hiveUsername = useNFTUsername();
	const [tab, setTab] = useState<Tab>('status');
	const [genesis, setGenesis] = useState<GenesisState | null>(null);
	const [supply, setSupply] = useState<SupplyInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
	const [mintProgress, setMintProgress] = useState({ done: 0, total: 0, running: false });

	// ── Auth Guard ──
	const isAdmin = hiveUsername === RAGNAROK_ACCOUNT;

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
		let mounted = true;
		async function load() {
			await refreshState();
		}
		load();
		return () => { mounted = false; };
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
		const collectible = cardRegistry.filter(c => c.collectible !== false && c.rarity);
		const BATCH_SIZE = 50;
		const batches: typeof collectible[] = [];
		for (let i = 0; i < collectible.length; i += BATCH_SIZE) {
			batches.push(collectible.slice(i, i + BATCH_SIZE));
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
		} else if (!confirm(`Mint ${collectible.length} cards in ${batches.length} batches of ${BATCH_SIZE}? Each batch requires a Keychain signature.`)) {
			return;
		}

		// Initialize or recover session
		const mintSession = (savedSession && startBatch > 0 ? savedSession : {
			sessionId: `mint_${Date.now()}`,
			status: 'minting' as const,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			collectionId: 'ragnarok-alpha',
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
				const res = await admin.broadcastMint({ to: RAGNAROK_ACCOUNT, cards });
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
		const packType = (document.getElementById('pack-type-select') as HTMLSelectElement)?.value || 'standard';
		const quantity = parseInt((document.getElementById('pack-qty-input') as HTMLInputElement)?.value || '1', 10);
		if (quantity < 1 || quantity > 10) { setResult({ success: false, message: 'Quantity must be 1-10' }); return; }

		if (!confirm(`Mint ${quantity} ${packType} pack(s) into admin inventory?`)) return;
		setLoading(true);
		setResult(null);
		try {
			const sync = await getHiveSync();
			const res = await sync.mintPack(packType, quantity, RAGNAROK_ACCOUNT);
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
		const recipient = (document.getElementById('dist-recipient') as HTMLInputElement)?.value?.trim();
		const packUids = (document.getElementById('dist-uids') as HTMLTextAreaElement)?.value?.trim().split('\n').filter(Boolean);
		if (!recipient || !packUids?.length) { setResult({ success: false, message: 'Enter recipient and pack UIDs' }); return; }

		if (!confirm(`Distribute ${packUids.length} pack(s) to @${recipient}?`)) return;
		setLoading(true);
		setResult(null);
		try {
			const sync = await getHiveSync();
			const res = await sync.distributePacks(packUids, recipient);
			setResult({
				success: res.success,
				message: res.success
					? `Distributed ${packUids.length} pack(s) to @${recipient}! TxID: ${res.trxId}`
					: `Failed: ${res.error}`,
			});
		} catch (err) {
			setResult({ success: false, message: String(err) });
		}
		setLoading(false);
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

	// ── Access Denied ──
	if (!isAdmin) {
		return (
			<div className="h-full flex items-center justify-center bg-gray-950">
				<div className="text-center">
					<div className="text-6xl mb-4">⛔</div>
					<h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
					<p className="text-gray-400 mb-6">
						{hiveUsername ? `@${hiveUsername} is not authorized.` : 'Log in with Hive Keychain as @ragnarok.'}
					</p>
					<Link to={routes.home} className="text-amber-400 hover:text-amber-300 underline">Back to Home</Link>
				</div>
			</div>
		);
	}

	// ── Computed ──
	const collectibleCount = cardRegistry.filter(c => c.collectible !== false).length;
	const isSealed = genesis?.sealed === true;
	const hasGenesis = !!genesis?.version;

	const TABS: { id: Tab; label: string; icon: string }[] = [
		{ id: 'status', label: 'Status', icon: '◎' },
		{ id: 'genesis', label: 'Genesis', icon: '☉' },
		{ id: 'mint', label: 'Batch Mint', icon: '⚒' },
		{ id: 'seal', label: 'Seal', icon: '🔏' },
		{ id: 'packs', label: 'Packs', icon: '▣' },
		{ id: 'sync', label: 'Sync', icon: '⟳' },
	];

	return (
		<div className="h-full overflow-y-auto bg-gradient-to-b from-gray-950 via-red-950/20 to-gray-950 p-6">
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<div className="flex justify-between items-center mb-6">
					<Link to={routes.home}>
						<motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
							className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-lg border border-gray-600 text-sm">
							← Home
						</motion.button>
					</Link>
					<div className="text-right">
						<div className="text-amber-400 font-bold text-sm">@{hiveUsername}</div>
						<div className="text-gray-500 text-xs">Admin Panel</div>
					</div>
				</div>

				<h1 className="text-3xl font-bold text-center mb-1 text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-400 to-red-400">
					Genesis Command Center
				</h1>
				<p className="text-gray-500 text-center text-sm mb-4">Ragnarok NFT Protocol Administration</p>

				{/* ── Ceremony Checklist (always visible) ── */}
				<div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700/50 mb-6">
					<h3 className="text-amber-300 font-bold text-xs uppercase tracking-wider mb-3">Launch Ceremony — Follow Steps 1 → 5 in Order</h3>
					<div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
						<CeremonyStep num={1} label="Broadcast Genesis" done={hasGenesis} active={!hasGenesis}
							help="Click Genesis tab → press button → approve Keychain popup. Sets supply caps." />
						<CeremonyStep num={2} label="Mint All Cards" done={mintProgress.done > 0 && !mintProgress.running} active={hasGenesis && !isSealed && mintProgress.done === 0}
							help="Click Batch Mint tab → press button → approve ~39 Keychain popups (one per 50 cards)." />
						<CeremonyStep num={3} label="Seal Protocol" done={isSealed} active={hasGenesis && !isSealed}
							help="Click Seal tab → press button → confirm TWICE. This is permanent and cannot be undone!" />
						<CeremonyStep num={4} label="Mint Packs" done={false} active={isSealed}
							help="Click Packs tab → choose type/qty → press Mint. Creates sealed packs in your inventory." />
						<CeremonyStep num={5} label="Distribute" done={false} active={isSealed}
							help="Enter player @username + pack IDs → press Distribute. Sends packs to players." />
					</div>
				</div>

				{/* Tabs */}
				<div className="flex gap-1 mb-6 bg-gray-900/50 p-1 rounded-lg border border-gray-800">
					{TABS.map(t => (
						<button key={t.id} type="button"
							onClick={() => { setTab(t.id); setResult(null); }}
							className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id
								? 'bg-amber-600/20 text-amber-300 border border-amber-600/40'
								: 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}>
							<span className="mr-1">{t.icon}</span> {t.label}
						</button>
					))}
				</div>

				{/* Result Banner */}
				{result && (
					<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
						className={`mb-4 p-3 rounded-lg border text-sm ${result.success
							? 'bg-green-900/30 border-green-600/40 text-green-300'
							: 'bg-red-900/30 border-red-600/40 text-red-300'}`}>
						{result.success ? '✓' : '✗'} {result.message}
					</motion.div>
				)}

				{/* ═══ STATUS TAB ═══ */}
				{tab === 'status' && (
					<div className="space-y-4">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
							<StatCard label="Protocol" value={hasGenesis ? `v${genesis.version}` : 'Not initialized'} color={hasGenesis ? 'green' : 'red'} />
							<StatCard label="Sealed" value={isSealed ? `Yes (block ${genesis.sealedAtBlock})` : 'No'} color={isSealed ? 'amber' : 'gray'} />
							<StatCard label="Collectible Cards" value={String(collectibleCount)} color="blue" />
							<StatCard label="WASM Hash" value={genesis?.readerHash ? genesis.readerHash.slice(0, 12) + '...' : 'N/A'} color="purple" />
						</div>

						<h3 className="text-amber-300 font-bold text-sm uppercase tracking-wider mt-6 mb-2">Supply Counters</h3>
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

						<button type="button" onClick={refreshState}
							className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-600 transition-colors">
							Refresh State
						</button>
					</div>
				)}

				{/* ═══ GENESIS TAB ═══ */}
				{tab === 'genesis' && (
					<div className="space-y-4">
						<div className="bg-gray-900/60 rounded-lg p-6 border border-gray-700/50">
							<h3 className="text-amber-300 font-bold text-lg mb-2">Broadcast Genesis</h3>
							<p className="text-gray-400 text-sm mb-4">
								One-time operation. Sets supply caps (common: 1,800 / rare: 1,250 / epic: 750 / mythic: 500 per card).
								Includes WASM engine hash for anti-cheat verification.
							</p>
							{hasGenesis ? (
								<div className="text-green-400 text-sm p-3 bg-green-900/20 rounded-lg border border-green-700/30">
									Genesis already broadcast at block {genesis.genesisBlock}. Protocol version: {genesis.version}
								</div>
							) : (
								<motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
									onClick={handleGenesis} disabled={loading}
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
								Mints all {collectibleCount} collectible cards in batches of 50.
								Each batch requires a Hive Keychain signature ({Math.ceil(collectibleCount / 50)} signatures total).
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
								onClick={handleBatchMint} disabled={loading || !hasGenesis || isSealed || mintProgress.running}
								className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
								{mintProgress.running ? `Minting... (${mintProgress.done}/${mintProgress.total})` : `Mint All ${collectibleCount} Cards`}
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
							) : (
								<motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
									onClick={handleSeal} disabled={loading}
									className="px-6 py-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-lg transition-colors border border-red-500">
									{loading ? 'Sealing...' : 'SEAL PROTOCOL PERMANENTLY'}
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
							<div className="flex gap-3 mb-4">
								<select id="pack-type-select" className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600">
									<option value="starter">Starter (5 cards)</option>
									<option value="standard">Standard (5 cards)</option>
									<option value="premium">Premium (7 cards)</option>
									<option value="mythic">Mythic (7 cards)</option>
									<option value="mega">Mega (15 cards)</option>
								</select>
								<input id="pack-qty-input" type="number" min="1" max="10" defaultValue="1"
									className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 w-20" />
								<motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
									onClick={handleMintPacks} disabled={loading || !isSealed}
									className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
									{loading ? 'Minting...' : 'Mint Packs'}
								</motion.button>
							</div>
							{!isSealed && <p className="text-gray-500 text-xs">Pack minting requires a sealed protocol.</p>}
						</div>

						{/* Distribute Packs */}
						<div className="bg-gray-900/60 rounded-lg p-6 border border-gray-700/50">
							<h3 className="text-amber-300 font-bold text-lg mb-2">Distribute Packs</h3>
							<p className="text-gray-400 text-sm mb-4">Send sealed packs from admin inventory to a player (0.001 HIVE atomic transfer).</p>
							<div className="space-y-3 mb-4">
								<input id="dist-recipient" type="text" placeholder="Recipient @username"
									className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600" />
								<textarea id="dist-uids" placeholder="Pack UIDs (one per line)" rows={3}
									className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 font-mono text-xs" />
								<motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
									onClick={handleDistributePacks} disabled={loading}
									className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
									{loading ? 'Distributing...' : 'Distribute Packs'}
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
								className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
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
			<div className={`font-bold text-sm ${colorMap[color]?.split(' ')[0]}`}>{value}</div>
		</div>
	);
}

// ── Ceremony Step Sub-Component ──

function CeremonyStep({ num, label, done, active, help }: {
	num: number; label: string; done: boolean; active: boolean; help: string;
}) {
	return (
		<div className={`rounded-lg p-2 border ${done
			? 'bg-green-900/20 border-green-700/40'
			: active
				? 'bg-amber-900/20 border-amber-600/40 ring-1 ring-amber-500/30'
				: 'bg-gray-900/40 border-gray-700/30 opacity-50'}`}>
			<div className="flex items-center gap-1.5 mb-1">
				<span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${done
					? 'bg-green-600 text-white' : active ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
					{done ? '✓' : num}
				</span>
				<span className={`font-bold ${done ? 'text-green-400' : active ? 'text-amber-300' : 'text-gray-500'}`}>{label}</span>
			</div>
			<p className="text-gray-400 leading-tight">{help}</p>
		</div>
	);
}
