import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { useTradeStore, type TradeOffer } from '../../stores/tradeStore';
import { useNFTUsername } from '../../nft/hooks';

function TradeOfferCard({ offer, currentUser, onAccept, onDecline, onCancel }: {
	offer: TradeOffer;
	currentUser: string;
	onAccept: () => void;
	onDecline: () => void;
	onCancel: () => void;
}) {
	const isIncoming = offer.toUser === currentUser;
	const otherUser = isIncoming ? offer.fromUser : offer.toUser;

	const statusColors: Record<string, string> = {
		pending: 'text-amber-400 bg-amber-900/30 border-amber-700/40',
		accepted: 'text-green-400 bg-green-900/30 border-green-700/40',
		declined: 'text-red-400 bg-red-900/30 border-red-700/40',
		cancelled: 'text-gray-400 bg-gray-800/30 border-gray-700/40',
	};

	return (
		<div className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-4">
			<div className="flex items-center justify-between mb-3">
				<div>
					<span className="text-xs text-gray-500">{isIncoming ? 'From' : 'To'}: </span>
					<span className="text-sm font-semibold text-gray-200">{otherUser}</span>
				</div>
				<span className={`text-xs px-2 py-0.5 rounded border ${statusColors[offer.status]}`}>
					{offer.status}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-3 mb-3">
				<div className="bg-gray-800/40 rounded-lg p-3">
					<p className="text-xs text-gray-500 mb-1">Offering</p>
					{offer.offeredCardIds.length > 0 && (
						<p className="text-xs text-gray-300">{offer.offeredCardIds.length} card(s)</p>
					)}
					{offer.offeredCardIds.length === 0 && (
						<p className="text-xs text-gray-600">Nothing</p>
					)}
				</div>
				<div className="bg-gray-800/40 rounded-lg p-3">
					<p className="text-xs text-gray-500 mb-1">Requesting</p>
					{offer.requestedCardIds.length > 0 && (
						<p className="text-xs text-gray-300">{offer.requestedCardIds.length} card(s)</p>
					)}
					{offer.requestedCardIds.length === 0 && (
						<p className="text-xs text-gray-600">Nothing</p>
					)}
				</div>
			</div>

			{offer.status === 'pending' && (
				<div className="flex gap-2">
					{isIncoming ? (
						<>
							<button
								onClick={onAccept}
								className="flex-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-semibold transition-colors"
							>
								Accept
							</button>
							<button
								onClick={onDecline}
								className="flex-1 px-3 py-1.5 bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded text-xs transition-colors border border-red-700/40"
							>
								Decline
							</button>
						</>
					) : (
						<button
							onClick={onCancel}
							className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
						>
							Cancel
						</button>
					)}
				</div>
			)}

			<div className="mt-2 text-xs text-gray-600">
				{new Date(offer.createdAt).toLocaleDateString()}
			</div>
		</div>
	);
}

function CreateTradePanel({ onSend }: { onSend: (toUser: string) => void }) {
	const [toUser, setToUser] = useState('');
	const selectedOffered = useTradeStore(s => s.selectedOfferedCards);
	const offeredEitr = useTradeStore(s => s.offeredEitr);
	const requestedEitr = useTradeStore(s => s.requestedEitr);
	const setOfferedEitr = useTradeStore(s => s.setOfferedEitr);
	const setRequestedEitr = useTradeStore(s => s.setRequestedEitr);
	const clearSelections = useTradeStore(s => s.clearSelections);

	const canSend = toUser.trim().length > 0 && (selectedOffered.length > 0 || offeredEitr > 0);

	return (
		<div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5">
			<h3 className="text-lg font-bold text-gray-200 mb-4">Create Trade Offer</h3>

			<div className="mb-4">
				<label htmlFor="trade-to-user" className="block text-xs text-gray-500 mb-1">Trade with</label>
				<input
					id="trade-to-user"
					type="text"
					placeholder="Hive username"
					value={toUser}
					onChange={e => setToUser(e.target.value)}
					className="w-full px-3 py-2 bg-gray-800/60 border border-gray-600/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
				/>
			</div>

			{/* Eitr trading disabled in v1 — non-canonical until replay-derived (see RAGNAROK_PROTOCOL_V1.md §13) */}

			{selectedOffered.length > 0 && (
				<div className="mb-4">
					<span className="text-xs text-gray-500">Offering {selectedOffered.length} card(s)</span>
					<button
						onClick={clearSelections}
						className="ml-2 text-xs text-red-400 hover:text-red-300"
					>
						Clear
					</button>
				</div>
			)}

			<button
				onClick={() => canSend && onSend(toUser.trim())}
				disabled={!canSend}
				className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg text-sm font-semibold transition-colors"
			>
				Send Trade Offer
			</button>
		</div>
	);
}

export default function TradingPage() {
	const username = useNFTUsername() || 'guest';
	const offers = useTradeStore(s => s.offers);
	const loading = useTradeStore(s => s.loading);
	const error = useTradeStore(s => s.error);
	const fetchOffers = useTradeStore(s => s.fetchOffers);
	const createOffer = useTradeStore(s => s.createOffer);
	const acceptOffer = useTradeStore(s => s.acceptOffer);
	const declineOffer = useTradeStore(s => s.declineOffer);
	const cancelOffer = useTradeStore(s => s.cancelOffer);
	const [tab, setTab] = useState<'create' | 'incoming' | 'outgoing' | 'history'>('create');

	useEffect(() => {
		fetchOffers(username);
	}, [username, fetchOffers]);

	const incoming = offers.filter(o => o.toUser === username && o.status === 'pending');
	const outgoing = offers.filter(o => o.fromUser === username && o.status === 'pending');
	const history = offers.filter(o => o.status !== 'pending');

	const handleSend = async (toUser: string) => {
		await createOffer(username, toUser);
	};

	return (
		<div className="min-h-screen bg-gray-950 text-white">
			<div className="max-w-4xl mx-auto px-4 py-8">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold text-amber-400 tracking-wide">Trading</h1>
					<Link
						to={routes.home}
						className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-colors"
					>
						Back to Menu
					</Link>
				</div>

				{error && (
					<div className="mb-4 p-3 bg-red-900/30 border border-red-700/40 rounded-lg text-red-300 text-sm">
						{error}
					</div>
				)}

				<div className="flex gap-2 mb-6">
					{([
						{ key: 'create' as const, label: 'New Trade' },
						{ key: 'incoming' as const, label: `Incoming (${incoming.length})` },
						{ key: 'outgoing' as const, label: `Outgoing (${outgoing.length})` },
						{ key: 'history' as const, label: 'History' },
					]).map(t => (
						<button
							key={t.key}
							onClick={() => setTab(t.key)}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
								tab === t.key
									? 'bg-amber-600 text-white'
									: 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
							}`}
						>
							{t.label}
						</button>
					))}
				</div>

				{loading && (
					<div className="flex justify-center py-12">
						<div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
					</div>
				)}

				{!loading && tab === 'create' && (
					<CreateTradePanel onSend={handleSend} />
				)}

				{!loading && tab === 'incoming' && (
					<div className="space-y-3">
						{incoming.length === 0 ? (
							<p className="text-center text-gray-500 py-12">No incoming trade offers</p>
						) : (
							incoming.map(o => (
								<TradeOfferCard
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

				{!loading && tab === 'outgoing' && (
					<div className="space-y-3">
						{outgoing.length === 0 ? (
							<p className="text-center text-gray-500 py-12">No outgoing trade offers</p>
						) : (
							outgoing.map(o => (
								<TradeOfferCard
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

				{!loading && tab === 'history' && (
					<div className="space-y-3">
						{history.length === 0 ? (
							<p className="text-center text-gray-500 py-12">No trade history</p>
						) : (
							history.map(o => (
								<TradeOfferCard
									key={o.id}
									offer={o}
									currentUser={username}
									onAccept={() => {}}
									onDecline={() => {}}
									onCancel={() => {}}
								/>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
}
