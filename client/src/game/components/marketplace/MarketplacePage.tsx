/**
 * MarketplacePage.tsx — On-chain NFT marketplace
 *
 * Trustless listing/buying/offers for cards and packs via Hive L1 custom_json.
 * All state derived from chain replay — no server required.
 *
 * Tabs: Browse Listings | My Listings | My Offers
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { routes } from '../../../lib/routes';
import { useNFTUsername, useNFTCollection } from '../../nft/hooks';
import { getCardById } from '../../data/allCards';
import { getCardArtPath } from '../../utils/art/artMapping';
import type { MarketListing, MarketOffer } from '../../../../../shared/protocol-core/types';

// Lazy-load HiveSync to avoid bundling blockchain in initial load
async function getHiveSync() {
	const { hiveSync } = await import('../../../data/HiveSync');
	return hiveSync;
}

async function getReplayDB() {
	return import('../../../data/blockchain/replayDB');
}

// ── Types ──

type Tab = 'browse' | 'my-listings' | 'my-offers';

interface ListingWithCard extends MarketListing {
	cardName?: string;
	cardArt?: string;
	cardRarity?: string;
}

// ── Component ──

export default function MarketplacePage() {
	const username = useNFTUsername();
	const collection = useNFTCollection();
	const [tab, setTab] = useState<Tab>('browse');
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

	const loadListings = useCallback(async () => {
		try {
			const db = await getReplayDB();
			// Load all active listings from IndexedDB
			const allListingsRaw: MarketListing[] = [];
			const idb = await (db as unknown as { openDB: () => Promise<IDBDatabase> }).openDB?.() ?? null;
			if (!idb) return;

			const tx = idb.transaction('market_listings', 'readonly');
			const store = tx.objectStore('market_listings');
			const req = store.getAll();
			const all = await new Promise<ListingWithCard[]>((resolve) => {
				req.onsuccess = () => {
					const raw = (req.result || []) as MarketListing[];
					resolve(raw.filter(l => l.active).map(l => {
						// Enrich with card data
						const uidParts = l.nftUid.split('-');
						const cardId = parseInt(uidParts[1] || '0', 10);
						const cardDef = cardId ? getCardById(cardId) : null;
						return {
							...l,
							cardName: cardDef?.name || l.nftUid,
							cardArt: (cardDef ? getCardArtPath(cardDef.name, cardId) : undefined) || undefined,
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
		{ key: 'browse', label: 'Browse Listings', count: listings.length },
		{ key: 'my-listings', label: 'My Listings', count: myListings.length },
		{ key: 'my-offers', label: 'My Offers', count: myOffers.length },
	];

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
			{/* Header */}
			<div className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
				<div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Link to={routes.home} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
							Home
						</Link>
						<h1 className="text-xl font-bold tracking-wide">
							<span className="text-amber-400">Marketplace</span>
						</h1>
					</div>
					{username && (
						<div className="flex items-center gap-3">
							<span className="text-sm text-gray-400">@{username}</span>
							<button
								onClick={() => setShowListModal(true)}
								className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded transition-colors"
							>
								List a Card
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Tabs */}
			<div className="max-w-6xl mx-auto px-4 pt-4">
				<div className="flex gap-1 border-b border-gray-800/60 mb-6">
					{tabs.map(t => (
						<button
							key={t.key}
							onClick={() => setTab(t.key)}
							className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
								tab === t.key
									? 'text-amber-400 border-amber-400'
									: 'text-gray-500 border-transparent hover:text-gray-300'
							}`}
						>
							{t.label}
							{t.count !== undefined && t.count > 0 && (
								<span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-800 rounded-full">{t.count}</span>
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
									? 'bg-green-900/30 border-green-700/40 text-green-300'
									: 'bg-red-900/30 border-red-700/40 text-red-300'
							}`}
						>
							{actionResult.message}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Browse Listings */}
				{tab === 'browse' && (
					<div>
						{listings.length === 0 ? (
							<div className="text-center py-20 text-gray-600">
								<p className="text-lg mb-2">No listings yet</p>
								<p className="text-sm">Be the first to list a card for sale</p>
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
							<div className="text-center py-20 text-gray-600">
								<p>Connect Hive Keychain to manage listings</p>
							</div>
						) : myListings.length === 0 ? (
							<div className="text-center py-20 text-gray-600">
								<p className="text-lg mb-2">No active listings</p>
								<p className="text-sm">Click "List a Card" to start selling</p>
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
					</div>
				)}

				{/* My Offers */}
				{tab === 'my-offers' && (
					<div>
						{myOffers.length === 0 ? (
							<div className="text-center py-20 text-gray-600">
								<p className="text-lg mb-2">No pending offers</p>
								<p className="text-sm">Browse listings and make offers on cards you want</p>
							</div>
						) : (
							<div className="space-y-3">
								{myOffers.map(offer => (
									<div key={offer.offerId} className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-4 flex items-center justify-between">
										<div>
											<p className="text-sm font-semibold text-gray-200">{offer.nftUid}</p>
											<p className="text-xs text-gray-500">Offered: {offer.price} {offer.currency}</p>
										</div>
										<span className="text-xs px-2 py-0.5 rounded border text-amber-400 bg-amber-900/30 border-amber-700/40">
											{offer.status}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>

			{/* List Card Modal */}
			<AnimatePresence>
				{showListModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
						onClick={() => setShowListModal(false)}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md"
							onClick={e => e.stopPropagation()}
						>
							<h2 className="text-lg font-bold text-amber-400 mb-4">List a Card for Sale</h2>

							<div className="space-y-4">
								<div>
									<label className="block text-xs text-gray-500 mb-1">Card to sell</label>
									<select
										value={listCardUid}
										onChange={e => setListCardUid(e.target.value)}
										className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
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
										<label className="block text-xs text-gray-500 mb-1">Price</label>
										<input
											type="number"
											min="0.001"
											step="0.001"
											value={listPrice}
											onChange={e => setListPrice(e.target.value)}
											placeholder="0.000"
											className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
										/>
									</div>
									<div className="w-24">
										<label className="block text-xs text-gray-500 mb-1">Currency</label>
										<select
											value={listCurrency}
											onChange={e => setListCurrency(e.target.value as 'HIVE' | 'HBD')}
											className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
										>
											<option value="HIVE">HIVE</option>
											<option value="HBD">HBD</option>
										</select>
									</div>
								</div>

								<div className="flex gap-3 pt-2">
									<button
										onClick={() => setShowListModal(false)}
										className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
									>
										Cancel
									</button>
									<button
										onClick={handleListCard}
										disabled={loading || !listCardUid || !listPrice}
										className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded text-sm transition-colors"
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
						className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
						onClick={() => setShowOfferModal(false)}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md"
							onClick={e => e.stopPropagation()}
						>
							<h2 className="text-lg font-bold text-blue-400 mb-4">Make an Offer</h2>

							<div className="space-y-4">
								<p className="text-sm text-gray-400">Card: <span className="text-white">{offerNftUid}</span></p>

								<div className="flex gap-3">
									<div className="flex-1">
										<label className="block text-xs text-gray-500 mb-1">Your Offer</label>
										<input
											type="number"
											min="0.001"
											step="0.001"
											value={offerPrice}
											onChange={e => setOfferPrice(e.target.value)}
											placeholder="0.000"
											className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
										/>
									</div>
									<div className="w-24">
										<label className="block text-xs text-gray-500 mb-1">Currency</label>
										<select
											value={offerCurrency}
											onChange={e => setOfferCurrency(e.target.value as 'HIVE' | 'HBD')}
											className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
										>
											<option value="HIVE">HIVE</option>
											<option value="HBD">HBD</option>
										</select>
									</div>
								</div>

								<div className="flex gap-3 pt-2">
									<button
										onClick={() => setShowOfferModal(false)}
										className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
									>
										Cancel
									</button>
									<button
										onClick={handleMakeOffer}
										disabled={loading || !offerPrice}
										className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded text-sm transition-colors"
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

function ListingCard({ listing, isMine, onBuy, onUnlist, onOffer, loading }: {
	listing: ListingWithCard;
	isMine?: boolean;
	onBuy?: () => void;
	onUnlist?: () => void;
	onOffer?: () => void;
	loading: boolean;
}) {
	const rarityColors: Record<string, string> = {
		mythic: 'border-amber-500/60 shadow-amber-500/10',
		epic: 'border-purple-500/60 shadow-purple-500/10',
		rare: 'border-blue-500/60 shadow-blue-500/10',
		common: 'border-gray-600/60',
	};

	const rarity = listing.cardRarity || 'common';
	const borderClass = rarityColors[rarity] || rarityColors.common;

	return (
		<motion.div
			whileHover={{ y: -4 }}
			className={`bg-gray-900/80 border rounded-lg overflow-hidden shadow-lg ${borderClass}`}
		>
			{/* Card art */}
			<div className="aspect-square bg-gray-800/60 relative overflow-hidden">
				{listing.cardArt ? (
					<img src={listing.cardArt} alt="" className="w-full h-full object-cover" loading="lazy" />
				) : (
					<div className="w-full h-full flex items-center justify-center text-gray-600 text-3xl">
						{listing.nftType === 'pack' ? '📦' : '🃏'}
					</div>
				)}
				{/* Rarity badge */}
				<span className={`absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded font-bold uppercase ${
					rarity === 'mythic' ? 'bg-amber-600 text-white' :
					rarity === 'epic' ? 'bg-purple-600 text-white' :
					rarity === 'rare' ? 'bg-blue-600 text-white' :
					'bg-gray-700 text-gray-300'
				}`}>
					{rarity}
				</span>
			</div>

			{/* Info */}
			<div className="p-3">
				<p className="text-sm font-semibold text-gray-200 truncate" title={listing.cardName}>
					{listing.cardName || listing.nftUid}
				</p>
				<p className="text-xs text-gray-500 mt-0.5">
					Seller: @{listing.seller}
				</p>

				{/* Price */}
				<div className="mt-2 flex items-center justify-between">
					<span className="text-lg font-bold text-amber-400">
						{listing.price} <span className="text-xs text-amber-600">{listing.currency}</span>
					</span>
				</div>

				{/* Actions */}
				<div className="mt-3 flex gap-2">
					{isMine ? (
						<button
							onClick={onUnlist}
							disabled={loading}
							className="flex-1 px-3 py-1.5 bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded text-xs transition-colors border border-red-700/40 disabled:opacity-50"
						>
							Remove
						</button>
					) : (
						<>
							<button
								onClick={onBuy}
								disabled={loading}
								className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
							>
								Buy Now
							</button>
							<button
								onClick={onOffer}
								disabled={loading}
								className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors disabled:opacity-50"
							>
								Offer
							</button>
						</>
					)}
				</div>
			</div>
		</motion.div>
	);
}
