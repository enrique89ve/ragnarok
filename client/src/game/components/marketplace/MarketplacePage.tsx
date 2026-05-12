/**
 * MarketplacePage.tsx — On-chain NFT marketplace + sealed pack store
 *
 * Trustless listing/buying/offers for cards via Hive L1 custom_json.
 * Pack catalog (buy sealed packs) is a tab here too — see PackCatalog.
 *
 * Tabs: Packs | Browse | My Listings | My Offers
 *
 * Deep link: `#/marketplace?tab=packs` (any Tab key) opens that tab directly.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X as CloseIcon } from 'lucide-react';
import { OrnateCorners } from '../../../components/ornaments/RunicSigils';
import { AccountSlot } from '../../../components/account/AccountSlot';
import { routes } from '../../../lib/routes';
import { useNFTUsername, useNFTCollection } from '../../nft/hooks';
import { getCardById } from '../../data/allCards';
import { getCardArtPath } from '../../utils/art/artMapping';
import type { MarketListing, MarketOffer } from '../../../../../shared/protocol-core/types';
import PackCatalog from './PackCatalog';
import SwapsTab from './SwapsTab';

// Lazy-load HiveSync to avoid bundling blockchain in initial load
async function getHiveSync() {
	const { hiveSync } = await import('../../../data/HiveSync');
	return hiveSync;
}

async function getReplayDB() {
	return import('../../../data/blockchain/replayDB');
}

// ── Types ──

type Tab = 'packs' | 'browse' | 'my-listings' | 'my-offers' | 'swaps';

interface ListingWithCard extends MarketListing {
	cardName?: string;
	cardArt?: string;
	cardRarity?: string;
}

const TAB_KEYS: ReadonlySet<string> = new Set(['packs', 'browse', 'my-listings', 'my-offers', 'swaps']);

function readTabFromQuery(search: string): Tab | null {
	const params = new URLSearchParams(search);
	const raw = params.get('tab');
	return raw && TAB_KEYS.has(raw) ? (raw as Tab) : null;
}

// ── Component ──

export default function MarketplacePage() {
	const username = useNFTUsername();
	const collection = useNFTCollection();
	const location = useLocation();
	const [tab, setTab] = useState<Tab>(() => readTabFromQuery(location.search) ?? 'packs');
	const [listings, setListings] = useState<ListingWithCard[]>([]);
	const [myListings, setMyListings] = useState<ListingWithCard[]>([]);
	const [myOffers, setMyOffers] = useState<MarketOffer[]>([]);
	const [loading, setLoading] = useState(false);
	const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

	// List card modal state
	const [showListModal, setShowListModal] = useState(false);
	const [listCardUid, setListCardUid] = useState('');
	const [listPrice, setListPrice] = useState('');
	const [listCurrency, setListCurrency] = useState<'HIVE' | 'HBD'>('HIVE');

	// Offer modal state
	const [showOfferModal, setShowOfferModal] = useState(false);
	const [offerNftUid, setOfferNftUid] = useState('');
	const [offerPrice, setOfferPrice] = useState('');
	const [offerCurrency, setOfferCurrency] = useState<'HIVE' | 'HBD'>('HIVE');

	// React to ?tab= changes (e.g., user navigates from /packs CTA)
	useEffect(() => {
		const next = readTabFromQuery(location.search);
		if (next && next !== tab) setTab(next);
	}, [location.search, tab]);

	const loadListings = useCallback(async () => {
		try {
			const db = await getReplayDB();
			const idb = await (db as unknown as { openDB: () => Promise<IDBDatabase> }).openDB?.() ?? null;
			if (!idb) return;

			const tx = idb.transaction('market_listings', 'readonly');
			const store = tx.objectStore('market_listings');
			const req = store.getAll();
			const all = await new Promise<ListingWithCard[]>((resolve) => {
				req.onsuccess = () => {
					const raw = (req.result || []) as MarketListing[];
					resolve(raw.filter(l => l.active).map(l => {
						const uidParts = l.nftUid.split('-');
						const cardId = parseInt(uidParts[1] || '0', 10);
						const cardDef = cardId ? getCardById(cardId) : null;
						return {
							...l,
							cardName: cardDef?.name || l.nftUid,
							cardArt: (cardDef ? getCardArtPath(cardId) : undefined) || undefined,
							cardRarity: cardDef?.rarity as string | undefined,
						};
					}));
				};
				req.onerror = () => resolve([]);
			});

			setListings(all.filter(l => l.seller !== username));
			setMyListings(all.filter(l => l.seller === username));
		} catch {
			// IDB not available (static deploy)
		}
	}, [username]);

	const loadOffers = useCallback(async () => {
		if (!username) return;
		try {
			const db = await getReplayDB();
			const idb = await (db as unknown as { openDB: () => Promise<IDBDatabase> }).openDB?.() ?? null;
			if (!idb) return;

			const tx = idb.transaction('market_offers', 'readonly');
			const idx = tx.objectStore('market_offers').index('by_buyer');
			const req = idx.getAll(username);
			const offers = await new Promise<MarketOffer[]>((resolve) => {
				req.onsuccess = () => resolve(req.result || []);
				req.onerror = () => resolve([]);
			});
			setMyOffers(offers.filter(o => o.status === 'pending'));
		} catch {
			// IDB not available
		}
	}, [username]);

	useEffect(() => {
		let mounted = true;

		async function load() {
			await loadListings();
			if (!mounted) return;
			await loadOffers();
		}
		load();

		return () => { mounted = false; };
	}, [loadListings, loadOffers]);

	// Esc closes the topmost open modal — gives keyboard users an escape hatch
	// without relying on the (now-removed) backdrop click.
	useEffect(() => {
		if (!showListModal && !showOfferModal) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			if (showOfferModal) setShowOfferModal(false);
			else if (showListModal) setShowListModal(false);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [showListModal, showOfferModal]);

	const handleListCard = async () => {
		if (!listCardUid || !listPrice) return;
		setLoading(true);
		setActionResult(null);
		try {
			const sync = await getHiveSync();
			const res = await sync.marketList(listCardUid, 'card', parseFloat(listPrice), listCurrency);
			setActionResult({
				success: res.success,
				message: res.success ? `Listed for ${listPrice} ${listCurrency}` : (res.error || 'Failed'),
			});
			if (res.success) {
				setShowListModal(false);
				setListCardUid('');
				setListPrice('');
				await loadListings();
			}
		} finally {
			setLoading(false);
		}
	};

	const handleUnlist = async (listingId: string) => {
		setLoading(true);
		setActionResult(null);
		try {
			const sync = await getHiveSync();
			const res = await sync.marketUnlist(listingId);
			setActionResult({
				success: res.success,
				message: res.success ? 'Listing removed' : (res.error || 'Failed'),
			});
			if (res.success) await loadListings();
		} finally {
			setLoading(false);
		}
	};

	const handleBuy = async (listing: ListingWithCard) => {
		if (!confirm(`Buy ${listing.cardName || listing.nftUid} for ${listing.price} ${listing.currency}?`)) return;
		const paymentPrompt = `Send ${listing.price} ${listing.currency} to @${listing.seller} with your Hive wallet, then paste the payment transaction ID to settle this purchase.`;
		const paymentTrxId = window.prompt(paymentPrompt, '');
		if (!paymentTrxId?.trim()) {
			setActionResult({
				success: false,
				message: 'A valid payment transaction ID is required to complete a marketplace buy.',
			});
			return;
		}

		setLoading(true);
		setActionResult(null);
		try {
			const sync = await getHiveSync();
			const res = await sync.marketBuy(listing.listingId, paymentTrxId.trim());
			setActionResult({
				success: res.success,
				message: res.success ? `Purchased ${listing.cardName || listing.nftUid}!` : (res.error || 'Failed'),
			});
			if (res.success) await loadListings();
		} finally {
			setLoading(false);
		}
	};

	const handleMakeOffer = async () => {
		if (!offerNftUid || !offerPrice) return;
		setLoading(true);
		setActionResult(null);
		try {
			const sync = await getHiveSync();
			const res = await sync.marketOffer(offerNftUid, parseFloat(offerPrice), offerCurrency);
			setActionResult({
				success: res.success,
				message: res.success ? `Offer submitted: ${offerPrice} ${offerCurrency}` : (res.error || 'Failed'),
			});
			if (res.success) {
				setShowOfferModal(false);
				setOfferNftUid('');
				setOfferPrice('');
				await loadOffers();
			}
		} finally {
			setLoading(false);
		}
	};

	const tabs: { key: Tab; label: string; count?: number }[] = [
		{ key: 'packs', label: 'Packs' },
		{ key: 'browse', label: 'Cards', count: listings.length },
		{ key: 'my-listings', label: 'My Listings', count: myListings.length },
		{ key: 'my-offers', label: 'My Offers', count: myOffers.length },
		{ key: 'swaps', label: 'Swaps' },
	];

	return (
		<div className="h-screen w-full overflow-y-auto overflow-x-hidden bg-(image:--bg-vault-nav) text-ink-0">
			{/* Header */}
			<div className="border-b border-obsidian-700 bg-obsidian-950/85 backdrop-blur-md sticky top-0 z-40">
				<div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
					<div className="flex items-center gap-4 min-w-0">
						<Link
							to={routes.home}
							className="inline-flex items-center h-8 px-3 rounded-full border border-obsidian-700 bg-obsidian-850 text-ink-200 hover:text-gold-300 hover:border-gold-600 font-display text-[11px] tracking-[0.18em] uppercase font-bold transition-colors"
						>
							Home
						</Link>
						<div>
							<div className="font-mono text-[10px] tracking-[0.32em] uppercase text-ink-300">Forge · Bazaar</div>
							<h1 className="font-display text-xl font-black tracking-[0.10em] uppercase text-gold-300">
								Marketplace
							</h1>
						</div>
					</div>
					<AccountSlot
						username={username}
						tier="premium"
						to={routes.settings}
						secondary="Trader"
						showSettings
					/>
				</div>
			</div>

			{/* Tabs */}
			<div className="max-w-6xl mx-auto px-4 pt-4">
				<div className="flex gap-1 border-b border-obsidian-700 mb-6 overflow-x-auto [scrollbar-width:none]">
					{tabs.map(t => (
						<button
							key={t.key}
							onClick={() => setTab(t.key)}
							className={`shrink-0 px-4 py-2.5 font-display text-xs tracking-[0.18em] uppercase font-bold transition-colors border-b-2 ${
								tab === t.key
									? 'text-gold-300 border-gold-300'
									: 'text-ink-300 border-transparent hover:text-ink-0'
							}`}
						>
							{t.label}
							{t.count !== undefined && t.count > 0 && (
								<span className="ml-2 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] bg-obsidian-800 text-ink-200 rounded-full">{t.count}</span>
							)}
						</button>
					))}
				</div>

				{/* Status message */}
				<AnimatePresence>
					{actionResult && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className={`mb-4 p-3 rounded-lg text-sm border ${
								actionResult.success
									? 'bg-rune-500/20 border-rune-500/40 text-rune-300'
									: 'bg-ember-600/25 border-ember-400/40 text-ember-300'
							}`}
						>
							{actionResult.message}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Packs (catalog + buy) */}
				{tab === 'packs' && <PackCatalog />}

				{/* Browse Card Listings */}
				{tab === 'browse' && (
					<div>
						{listings.length === 0 ? (
							<div className="text-center py-20 text-ink-300">
								<p className="text-lg mb-2">No card listings yet</p>
								<p className="text-sm text-ink-400">Be the first to list a card for sale</p>
							</div>
						) : (
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
								{listings.map(listing => (
									<ListingCard
										key={listing.listingId}
										listing={listing}
										onBuy={() => handleBuy(listing)}
										onOffer={() => { setOfferNftUid(listing.nftUid); setShowOfferModal(true); }}
										loading={loading}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{/* My Listings */}
				{tab === 'my-listings' && (
					<div>
						{!username ? (
							<div className="text-center py-20 text-ink-300">
								<p>Connect Hive Keychain to manage listings</p>
							</div>
						) : (
							<>
								<div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
									<header className="section-heading">
										<div className="section-heading-kicker">Selling</div>
									</header>
									<button
										type="button"
										onClick={() => setShowListModal(true)}
										aria-label="List a card for sale"
										className="btn-runic btn-runic--gold btn-runic--sm"
									>
										<span className="btn-runic-stud" aria-hidden />
										List a Card
										<span className="btn-runic-stud" aria-hidden />
									</button>
								</div>

								{myListings.length === 0 ? (
									<div className="text-center py-20 text-ink-300">
										<p className="text-lg mb-2">No active listings</p>
										<p className="text-sm text-ink-400">Click &ldquo;List a Card&rdquo; to start selling</p>
									</div>
								) : (
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
										{myListings.map(listing => (
											<ListingCard
												key={listing.listingId}
												listing={listing}
												isMine
												onUnlist={() => handleUnlist(listing.listingId)}
												loading={loading}
											/>
										))}
									</div>
								)}
							</>
						)}
					</div>
				)}

				{/* My Offers */}
				{tab === 'my-offers' && (
					<div>
						{myOffers.length === 0 ? (
							<div className="text-center py-20 text-ink-300">
								<p className="text-lg mb-2">No pending offers</p>
								<p className="text-sm text-ink-400">Browse listings and make offers on cards you want</p>
							</div>
						) : (
							<div className="space-y-3">
								{myOffers.map(offer => (
									<div key={offer.offerId} className="bg-obsidian-900/60 border border-obsidian-700/50 rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
										<div className="min-w-0">
											<p className="text-sm font-semibold text-ink-0 truncate">{offer.nftUid}</p>
											<p className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-400">
												Offered: {offer.price} {offer.currency}
											</p>
										</div>
										<span className="font-mono text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded border text-gold-300 bg-gold-600/20 border-gold-500/40">
											{offer.status}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* Swaps — peer-to-peer card-for-card exchange (formerly /trading) */}
				{tab === 'swaps' && <SwapsTab />}
			</div>

			{/* List Card Modal */}
			<AnimatePresence>
				{showListModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						role="dialog"
						aria-modal="true"
						aria-labelledby="list-modal-title"
						className="fixed inset-0 bg-obsidian-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="relative bg-obsidian-900 border border-obsidian-700 rounded-xl p-6 w-full max-w-md modal-landscape-safe"
						>
							<button
								type="button"
								onClick={() => setShowListModal(false)}
								aria-label="Close List a Card dialog"
								className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full border border-obsidian-700 bg-obsidian-900/80 text-ink-300 hover:text-gold-300 hover:border-gold-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
							>
								<CloseIcon size={14} aria-hidden="true" />
							</button>
							<h2 id="list-modal-title" className="font-display text-lg font-bold text-gold-300 tracking-[0.18em] uppercase mb-4 pr-8">List a Card for Sale</h2>

							<div className="space-y-4">
								<div>
									<label className="block font-mono text-[10px] tracking-[0.18em] uppercase text-ink-400 mb-1">Card to sell</label>
									<select
										value={listCardUid}
										onChange={e => setListCardUid(e.target.value)}
										className="w-full bg-obsidian-800 border border-obsidian-600 rounded px-3 py-2 text-sm text-ink-0 focus:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
									>
										<option value="">Select a card...</option>
										{collection.map(card => (
											<option key={card.uid} value={card.uid}>
												{card.name || card.uid} ({card.rarity})
											</option>
										))}
									</select>
								</div>

								<div className="flex gap-3">
									<div className="flex-1">
										<label className="block font-mono text-[10px] tracking-[0.18em] uppercase text-ink-400 mb-1">Price</label>
										<input
											type="number"
											min="0.001"
											step="0.001"
											value={listPrice}
											onChange={e => setListPrice(e.target.value)}
											placeholder="0.000"
											className="w-full bg-obsidian-800 border border-obsidian-600 rounded px-3 py-2 text-sm text-ink-0 placeholder-ink-400 focus:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
										/>
									</div>
									<div className="w-24">
										<label className="block font-mono text-[10px] tracking-[0.18em] uppercase text-ink-400 mb-1">Currency</label>
										<select
											value={listCurrency}
											onChange={e => setListCurrency(e.target.value as 'HIVE' | 'HBD')}
											className="w-full bg-obsidian-800 border border-obsidian-600 rounded px-3 py-2 text-sm text-ink-0 focus:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
										>
											<option value="HIVE">HIVE</option>
											<option value="HBD">HBD</option>
										</select>
									</div>
								</div>

								<div className="flex gap-3 pt-2">
									<button
										onClick={() => setShowListModal(false)}
										className="flex-1 px-4 py-2 bg-obsidian-700 hover:bg-obsidian-600 text-ink-0 font-display text-xs tracking-[0.14em] uppercase rounded transition-colors"
									>
										Cancel
									</button>
									<button
										onClick={handleListCard}
										disabled={loading || !listCardUid || !listPrice}
										className="flex-1 px-4 py-2 bg-linear-to-b from-gold-300 to-gold-500 hover:from-gold-200 hover:to-gold-400 disabled:from-obsidian-700 disabled:to-obsidian-700 disabled:text-ink-400 disabled:opacity-60 text-obsidian-950 font-display text-xs font-bold tracking-[0.14em] uppercase rounded transition-all"
									>
										{loading ? 'Listing...' : 'List for Sale'}
									</button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Make Offer Modal */}
			<AnimatePresence>
				{showOfferModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						role="dialog"
						aria-modal="true"
						aria-labelledby="offer-modal-title"
						className="fixed inset-0 bg-obsidian-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="relative bg-obsidian-900 border border-obsidian-700 rounded-xl p-6 w-full max-w-md modal-landscape-safe"
						>
							<button
								type="button"
								onClick={() => setShowOfferModal(false)}
								aria-label="Close Make an Offer dialog"
								className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full border border-obsidian-700 bg-obsidian-900/80 text-ink-300 hover:text-bifrost-300 hover:border-bifrost-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bifrost-300"
							>
								<CloseIcon size={14} aria-hidden="true" />
							</button>
							<h2 id="offer-modal-title" className="font-display text-lg font-bold text-bifrost-300 tracking-[0.18em] uppercase mb-4 pr-8">Make an Offer</h2>

							<div className="space-y-4">
								<p className="text-sm text-ink-300">Card: <span className="text-ink-0">{offerNftUid}</span></p>

								<div className="flex gap-3">
									<div className="flex-1">
										<label className="block font-mono text-[10px] tracking-[0.18em] uppercase text-ink-400 mb-1">Your Offer</label>
										<input
											type="number"
											min="0.001"
											step="0.001"
											value={offerPrice}
											onChange={e => setOfferPrice(e.target.value)}
											placeholder="0.000"
											className="w-full bg-obsidian-800 border border-obsidian-600 rounded px-3 py-2 text-sm text-ink-0 placeholder-ink-400 focus:border-bifrost-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bifrost-300"
										/>
									</div>
									<div className="w-24">
										<label className="block font-mono text-[10px] tracking-[0.18em] uppercase text-ink-400 mb-1">Currency</label>
										<select
											value={offerCurrency}
											onChange={e => setOfferCurrency(e.target.value as 'HIVE' | 'HBD')}
											className="w-full bg-obsidian-800 border border-obsidian-600 rounded px-3 py-2 text-sm text-ink-0 focus:border-bifrost-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bifrost-300"
										>
											<option value="HIVE">HIVE</option>
											<option value="HBD">HBD</option>
										</select>
									</div>
								</div>

								<div className="flex gap-3 pt-2">
									<button
										onClick={() => setShowOfferModal(false)}
										className="flex-1 px-4 py-2 bg-obsidian-700 hover:bg-obsidian-600 text-ink-0 font-display text-xs tracking-[0.14em] uppercase rounded transition-colors"
									>
										Cancel
									</button>
									<button
										onClick={handleMakeOffer}
										disabled={loading || !offerPrice}
										className="flex-1 px-4 py-2 bg-linear-to-b from-bifrost-500 to-bifrost-500/70 hover:from-bifrost-300 hover:to-bifrost-500 disabled:from-obsidian-700 disabled:to-obsidian-700 disabled:opacity-60 text-ink-0 font-display text-xs font-bold tracking-[0.14em] uppercase rounded border border-bifrost-300/50 transition-all"
									>
										{loading ? 'Submitting...' : 'Submit Offer'}
									</button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

// ── Listing Card Component ──

/**
 * Tier-aware ornament density:
 *   - epic / mythic: full Runic Forge (surface tint + ornate corners + sigil hint)
 *   - rare / common: compact (rarity border + bevel only) — keeps the 5-col
 *     grid scannable instead of bloating it with ornaments.
 */

const LISTING_TIER_SURFACE: Record<string, string> = {
	mythic: 'var(--surface-mystic-mythic)',
	epic: 'var(--surface-mystic-premium)',     // epic borrows premium gradient (gold-tinted)
	rare: 'var(--surface-mystic-standard)',
	common: 'var(--surface-mystic-obsidian)',
};

const LISTING_TIER_GLOW: Record<string, string> = {
	mythic: 'mystic-tile--ember',
	epic: 'mystic-tile--gold',
	rare: 'mystic-tile--bifrost',
	common: 'mystic-tile--gold',
};

const LISTING_TIER_ORNATE: Record<string, string> = {
	mythic: 'ornate-corners-host--mythic',
	epic: 'ornate-corners-host--premium',
	rare: 'ornate-corners-host--standard',
	common: '',
};

function listingTypeLabel(nftType: string): string {
	if (nftType === 'pack') return 'Sealed pack';
	return 'Card';
}

function ListingCard({ listing, isMine, onBuy, onUnlist, onOffer, loading }: {
	listing: ListingWithCard;
	isMine?: boolean;
	onBuy?: () => void;
	onUnlist?: () => void;
	onOffer?: () => void;
	loading: boolean;
}) {
	const reducedMotion = useReducedMotion();
	const rarity = listing.cardRarity || 'common';
	const isHigh = rarity === 'epic' || rarity === 'mythic';

	const surface = LISTING_TIER_SURFACE[rarity] ?? LISTING_TIER_SURFACE.common;
	const glowClass = LISTING_TIER_GLOW[rarity] ?? LISTING_TIER_GLOW.common;
	const ornateClass = LISTING_TIER_ORNATE[rarity] ?? '';

	const rarityChips: Record<string, string> = {
		mythic: 'bg-rarity-mythic text-obsidian-950',
		epic: 'bg-rarity-epic text-ink-0',
		rare: 'bg-rarity-rare text-ink-0',
		common: 'bg-obsidian-700 text-ink-200',
	};
	const chipClass = rarityChips[rarity] || rarityChips.common;
	const displayName = listing.cardName || listing.nftUid;
	const typeLabel = listingTypeLabel(listing.nftType);

	return (
		<motion.article
			whileHover={reducedMotion ? undefined : { y: -3 }}
			aria-label={`${displayName} — ${rarity} ${typeLabel}, ${listing.price} ${listing.currency}, sold by ${listing.seller}`}
			className={`runic-panel ${isHigh ? `ornate-corners-host ${ornateClass}` : ''} mystic-tile ${glowClass} relative rounded-lg overflow-hidden flex flex-col`}
			style={{ background: surface }}
		>
			{isHigh && <OrnateCorners />}

			<div className="relative aspect-square overflow-hidden">
				{listing.cardArt ? (
					<img
						src={listing.cardArt}
						alt={`${displayName} artwork`}
						className="w-full h-full object-cover"
						loading="lazy"
					/>
				) : (
					<div
						role="img"
						aria-label={`${typeLabel} placeholder artwork`}
						className="w-full h-full flex items-center justify-center text-ink-400 text-3xl bg-obsidian-950/40"
					>
						{listing.nftType === 'pack' ? '盾' : '◈'}
					</div>
				)}
				{/* Bottom scrim — gives the rarity chip and price legible contrast */}
				<div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-obsidian-950/85 to-transparent pointer-events-none" />
				<span className={`absolute top-2 right-2 font-mono text-[11px] tracking-[0.18em] px-2 py-0.5 rounded font-bold uppercase ${chipClass}`}>
					{rarity}
				</span>
			</div>

			<div className="relative z-10 p-3 flex flex-col gap-2">
				<div>
					<p className="text-sm font-semibold text-ink-0 truncate" title={displayName}>
						{displayName}
					</p>
					<p className="font-mono text-xs tracking-[0.14em] text-ink-400 mt-0.5">
						@{listing.seller}
					</p>
				</div>

				<div className="flex items-baseline gap-1.5">
					<span className="numeric-display numeric-display--md text-gold-300">
						{listing.price}
					</span>
					<span className="font-mono text-[11px] tracking-[0.18em] uppercase text-gold-500">
						{listing.currency}
					</span>
				</div>

				<div className="flex gap-2 mt-1">
					{isMine ? (
						<button
							type="button"
							onClick={onUnlist}
							disabled={loading}
							aria-label={`Remove ${displayName} from your listings`}
							className="flex-1 px-3 py-1.5 bg-ember-600/30 hover:bg-ember-500/50 text-ember-300 rounded font-mono text-xs uppercase tracking-[0.14em] transition-colors border border-ember-400/40 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-300"
						>
							Remove
						</button>
					) : (
						<>
							<button
								type="button"
								onClick={onBuy}
								disabled={loading}
								aria-label={`Buy ${displayName} for ${listing.price} ${listing.currency}`}
								className="flex-1 px-3 py-1.5 bg-linear-to-b from-gold-300 to-gold-500 hover:from-gold-200 hover:to-gold-400 text-obsidian-950 rounded font-display text-xs font-bold tracking-[0.14em] uppercase transition-all disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
							>
								Buy
							</button>
							<button
								type="button"
								onClick={onOffer}
								disabled={loading}
								aria-label={`Make an offer on ${displayName}`}
								className="px-3 py-1.5 bg-obsidian-700 hover:bg-obsidian-600 text-ink-200 rounded font-mono text-xs uppercase tracking-[0.14em] transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bifrost-300"
							>
								Offer
							</button>
						</>
					)}
				</div>
			</div>
		</motion.article>
	);
}
