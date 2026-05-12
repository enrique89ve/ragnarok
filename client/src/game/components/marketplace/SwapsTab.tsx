/**
 * SwapsTab — peer-to-peer swap panel inside the Marketplace shell.
 *
 * Surfaces the server-mediated trade flow (offer cards for cards, no price).
 * Previously lived at /trading; folded into /marketplace?tab=swaps per the
 * consolidation in docs/ATOMIC_NFT_PACKS_DESIGN.md §"Layer 3" — one comerce
 * surface, two intents (priced sale vs free swap).
 *
 * Wire intact: still uses `useTradeStore` and the Express `/api/trades`
 * endpoints. Only the UI host changed.
 */

import React, { useEffect, useState } from 'react';
import { useTradeStore, type TradeOffer } from '../../stores/tradeStore';
import { useNFTUsername } from '../../nft/hooks';

const STATUS_STYLES: Record<TradeOffer['status'], string> = {
	pending:   'text-gold-300  bg-gold-300/10  border-gold-300/35',
	accepted:  'text-rune-300  bg-rune-500/15  border-rune-500/40',
	declined:  'text-ember-300 bg-ember-600/20 border-ember-400/40',
	cancelled: 'text-ink-300   bg-obsidian-800 border-obsidian-700',
};

function SwapOfferCard({
	offer,
	currentUser,
	onAccept,
	onDecline,
	onCancel,
}: {
	offer: TradeOffer;
	currentUser: string;
	onAccept: () => void;
	onDecline: () => void;
	onCancel: () => void;
}) {
	const isIncoming = offer.toUser === currentUser;
	const otherUser = isIncoming ? offer.fromUser : offer.toUser;

	return (
		<div className="rounded-xl border border-obsidian-700 bg-obsidian-900/60 p-4">
			<div className="flex items-center justify-between mb-3">
				<div className="min-w-0">
					<span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300">
						{isIncoming ? 'From' : 'To'}
					</span>
					<span className="ml-2 font-display text-sm font-bold tracking-wide text-ink-0 truncate">
						{otherUser}
					</span>
				</div>
				<span
					className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded border ${STATUS_STYLES[offer.status]}`}
				>
					{offer.status}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-3 mb-3">
				<div className="rounded-lg border border-obsidian-700 bg-obsidian-850 p-3">
					<p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300 mb-1">Offering</p>
					<p className="text-[12px] text-ink-100">
						{offer.offeredCardIds.length > 0
							? `${offer.offeredCardIds.length} card${offer.offeredCardIds.length === 1 ? '' : 's'}`
							: 'Nothing'}
					</p>
				</div>
				<div className="rounded-lg border border-obsidian-700 bg-obsidian-850 p-3">
					<p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300 mb-1">Requesting</p>
					<p className="text-[12px] text-ink-100">
						{offer.requestedCardIds.length > 0
							? `${offer.requestedCardIds.length} card${offer.requestedCardIds.length === 1 ? '' : 's'}`
							: 'Nothing'}
					</p>
				</div>
			</div>

			{offer.status === 'pending' && (
				<div className="flex gap-2">
					{isIncoming ? (
						<>
							<button
								type="button"
								onClick={onAccept}
								className="flex-1 inline-flex items-center justify-center h-8 px-3 rounded-full border border-rune-500/45 bg-rune-500/15 text-rune-200 hover:bg-rune-500/25 hover:border-rune-300 font-display text-[11px] tracking-[0.18em] uppercase font-bold transition-colors"
							>
								Accept
							</button>
							<button
								type="button"
								onClick={onDecline}
								className="flex-1 inline-flex items-center justify-center h-8 px-3 rounded-full border border-ember-500/35 bg-obsidian-850 text-ember-300 hover:text-ember-200 hover:border-ember-400/55 font-display text-[11px] tracking-[0.18em] uppercase font-bold transition-colors"
							>
								Decline
							</button>
						</>
					) : (
						<button
							type="button"
							onClick={onCancel}
							className="flex-1 inline-flex items-center justify-center h-8 px-3 rounded-full border border-obsidian-700 bg-obsidian-850 text-ink-200 hover:text-gold-300 hover:border-gold-600 font-display text-[11px] tracking-[0.18em] uppercase font-bold transition-colors"
						>
							Cancel
						</button>
					)}
				</div>
			)}

			<div className="mt-3 font-mono text-[10px] tracking-[0.14em] uppercase text-ink-300">
				{new Date(offer.createdAt).toLocaleDateString()}
			</div>
		</div>
	);
}

function CreateSwapPanel({ onSend }: { onSend: (toUser: string) => void }) {
	const [toUser, setToUser] = useState('');
	const selectedOffered = useTradeStore(s => s.selectedOfferedCards);
	const clearSelections = useTradeStore(s => s.clearSelections);

	// Eitr trading is non-canonical in v1 (RAGNAROK_PROTOCOL_V1.md §13).
	// Swap is card-for-card only.
	const canSend = toUser.trim().length > 0 && selectedOffered.length > 0;

	return (
		<div className="rounded-xl border border-obsidian-700 bg-obsidian-900/60 p-5">
			<h3 className="font-display text-base font-bold tracking-[0.10em] uppercase text-gold-300 mb-4">
				Create Swap Offer
			</h3>

			<div className="mb-4">
				<label
					htmlFor="swap-to-user"
					className="block font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300 mb-1.5"
				>
					Swap with
				</label>
				<input
					id="swap-to-user"
					type="text"
					placeholder="Hive username"
					value={toUser}
					onChange={e => setToUser(e.target.value)}
					className="w-full px-3 py-2 bg-obsidian-850 border border-obsidian-700 rounded-lg text-ink-0 text-sm placeholder-ink-400 focus:outline-none focus:border-gold-500/50"
				/>
			</div>

			{selectedOffered.length > 0 && (
				<div className="mb-4 flex items-center gap-2">
					<span className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-200">
						Offering {selectedOffered.length} card{selectedOffered.length === 1 ? '' : 's'}
					</span>
					<button
						type="button"
						onClick={clearSelections}
						className="font-mono text-[10px] tracking-[0.18em] uppercase text-ember-300 hover:text-ember-200"
					>
						Clear
					</button>
				</div>
			)}

			<p className="mb-4 font-mono text-[10px] tracking-[0.14em] uppercase text-ink-300">
				Select cards from your collection before sending.
			</p>

			<button
				type="button"
				onClick={() => canSend && onSend(toUser.trim())}
				disabled={!canSend}
				className="w-full inline-flex items-center justify-center h-9 px-4 rounded-full border border-gold-600/45 bg-gold-300/12 text-gold-200 hover:bg-gold-300/20 hover:border-gold-300 disabled:opacity-40 disabled:cursor-not-allowed font-display text-xs tracking-[0.18em] uppercase font-bold transition-colors"
			>
				Send Swap Offer
			</button>
		</div>
	);
}

type InnerTab = 'create' | 'incoming' | 'outgoing' | 'history';

export default function SwapsTab() {
	const username = useNFTUsername() || 'guest';
	const offers = useTradeStore(s => s.offers);
	const loading = useTradeStore(s => s.loading);
	const error = useTradeStore(s => s.error);
	const fetchOffers = useTradeStore(s => s.fetchOffers);
	const createOffer = useTradeStore(s => s.createOffer);
	const acceptOffer = useTradeStore(s => s.acceptOffer);
	const declineOffer = useTradeStore(s => s.declineOffer);
	const cancelOffer = useTradeStore(s => s.cancelOffer);
	const [innerTab, setInnerTab] = useState<InnerTab>('create');

	useEffect(() => {
		fetchOffers(username);
	}, [username, fetchOffers]);

	const incoming = offers.filter(o => o.toUser === username && o.status === 'pending');
	const outgoing = offers.filter(o => o.fromUser === username && o.status === 'pending');
	const history = offers.filter(o => o.status !== 'pending');

	const handleSend = async (toUser: string) => {
		await createOffer(username, toUser);
	};

	const innerTabs: { key: InnerTab; label: string; count?: number }[] = [
		{ key: 'create', label: 'New Swap' },
		{ key: 'incoming', label: 'Incoming', count: incoming.length },
		{ key: 'outgoing', label: 'Outgoing', count: outgoing.length },
		{ key: 'history', label: 'History' },
	];

	return (
		<section aria-label="Peer-to-peer swaps">
			{error && (
				<div className="mb-4 p-3 rounded-lg border border-ember-400/40 bg-ember-600/20 text-ember-300 text-sm">
					{error}
				</div>
			)}

			<div className="flex gap-2 mb-6 flex-wrap">
				{innerTabs.map(t => (
					<button
						key={t.key}
						type="button"
						onClick={() => setInnerTab(t.key)}
						className={`inline-flex items-center h-9 px-4 rounded-full font-display text-[11px] tracking-[0.18em] uppercase font-bold transition-colors ${
							innerTab === t.key
								? 'border border-gold-300/45 bg-gold-300/12 text-gold-300'
								: 'border border-obsidian-700 bg-obsidian-850 text-ink-300 hover:text-gold-300 hover:border-gold-600'
						}`}
					>
						{t.label}
						{t.count !== undefined && t.count > 0 && (
							<span className="ml-2 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] bg-obsidian-900 text-ink-200 rounded-full">
								{t.count}
							</span>
						)}
					</button>
				))}
			</div>

			{loading && (
				<div className="flex justify-center py-12">
					<div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
				</div>
			)}

			{!loading && innerTab === 'create' && <CreateSwapPanel onSend={handleSend} />}

			{!loading && innerTab === 'incoming' && (
				<div className="space-y-3">
					{incoming.length === 0 ? (
						<p className="text-center py-12 font-mono text-[11px] tracking-[0.18em] uppercase text-ink-300">
							No incoming swap offers
						</p>
					) : (
						incoming.map(o => (
							<SwapOfferCard
								key={o.id}
								offer={o}
								currentUser={username}
								onAccept={() => acceptOffer(o.id, username)}
								onDecline={() => declineOffer(o.id, username)}
								onCancel={() => cancelOffer(o.id, username)}
							/>
						))
					)}
				</div>
			)}

			{!loading && innerTab === 'outgoing' && (
				<div className="space-y-3">
					{outgoing.length === 0 ? (
						<p className="text-center py-12 font-mono text-[11px] tracking-[0.18em] uppercase text-ink-300">
							No outgoing swap offers
						</p>
					) : (
						outgoing.map(o => (
							<SwapOfferCard
								key={o.id}
								offer={o}
								currentUser={username}
								onAccept={() => acceptOffer(o.id, username)}
								onDecline={() => declineOffer(o.id, username)}
								onCancel={() => cancelOffer(o.id, username)}
							/>
						))
					)}
				</div>
			)}

			{!loading && innerTab === 'history' && (
				<div className="space-y-3">
					{history.length === 0 ? (
						<p className="text-center py-12 font-mono text-[11px] tracking-[0.18em] uppercase text-ink-300">
							No swap history
						</p>
					) : (
						history.map(o => (
							<SwapOfferCard
								key={o.id}
								offer={o}
								currentUser={username}
								onAccept={() => { /* terminal state */ }}
								onDecline={() => { /* terminal state */ }}
								onCancel={() => { /* terminal state */ }}
							/>
						))
					)}
				</div>
			)}
		</section>
	);
}
