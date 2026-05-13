import { create } from 'zustand';
import { getNFTBridge } from '../nft';
import { emitNotification } from '../actions/gameActions';
import { debug } from '../config/debugConfig';

export interface TradeOffer {
	id: string;
	fromUser: string;
	toUser: string;
	offeredCardIds: number[];
	requestedCardIds: number[];
	status: 'pending' | 'accepted' | 'declined' | 'cancelled';
	createdAt: number;
	expiresAt: number;
}

interface TradeState {
	offers: TradeOffer[];
	selectedOfferedCards: number[];
	selectedRequestedCards: number[];
	loading: boolean;
	error: string | null;
}

interface TradeActions {
	fetchOffers: (username: string) => Promise<void>;
	createOffer: (fromUser: string, toUser: string) => Promise<boolean>;
	acceptOffer: (offerId: string, username: string) => Promise<boolean>;
	declineOffer: (offerId: string, username: string) => Promise<boolean>;
	cancelOffer: (offerId: string, username: string) => Promise<boolean>;
	toggleOfferedCard: (cardId: number) => void;
	toggleRequestedCard: (cardId: number) => void;
	clearSelections: () => void;
}

export const useTradeStore = create<TradeState & TradeActions>()((set, get) => ({
	offers: [],
	selectedOfferedCards: [],
	selectedRequestedCards: [],
	loading: false,
	error: null,

	fetchOffers: async (username) => {
		set({ loading: true, error: null });
		try {
			const res = await fetch(`/api/trades/${encodeURIComponent(username)}`);
			if (res.ok) {
				const data = await res.json();
				set({ offers: data.offers || [], loading: false });
			} else {
				set({ error: 'Failed to load trades', loading: false });
				emitNotification({ message: 'Failed to load trade offers', level: 'error' });
			}
		} catch {
			set({ error: 'Network error', loading: false });
			emitNotification({ message: 'Network error loading trades', level: 'error' });
		}
	},

	createOffer: async (fromUser, toUser) => {
		const { selectedOfferedCards, selectedRequestedCards } = get();
		if (selectedOfferedCards.length === 0) return false;
		set({ loading: true, error: null });
		try {
			const authBody = getNFTBridge().isHiveMode()
				? await getNFTBridge().buildAuthBody(fromUser, 'trade-create', {
					fromUser, toUser,
					offeredCardIds: selectedOfferedCards,
					requestedCardIds: selectedRequestedCards,
				})
				: {
					fromUser, toUser,
					offeredCardIds: selectedOfferedCards,
					requestedCardIds: selectedRequestedCards,
				};
			const res = await fetch('/api/trades', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(authBody),
			});
			if (res.ok) {
				const data = await res.json();
				set(s => ({ offers: [data.offer, ...s.offers], loading: false }));
				get().clearSelections();
				emitNotification({ message: 'Trade offer created', level: 'success' });
				return true;
			}
			set({ error: 'Failed to create trade', loading: false });
			emitNotification({ message: 'Failed to create trade offer', level: 'error' });
			return false;
		} catch {
			set({ error: 'Network error', loading: false });
			emitNotification({ message: 'Network error creating trade', level: 'error' });
			return false;
		}
	},

	acceptOffer: async (offerId, username) => {
		try {
			const authBody = getNFTBridge().isHiveMode()
				? await getNFTBridge().buildAuthBody(username, 'trade-accept', { username })
				: { username };
			const res = await fetch(`/api/trades/${offerId}/accept`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(authBody),
			});
			if (res.ok) {
				const offer = get().offers.find(o => o.id === offerId);
				set(s => ({
					offers: s.offers.map(o => o.id === offerId ? { ...o, status: 'accepted' as const } : o),
				}));

				if (getNFTBridge().isHiveMode() && offer) {
					const bridge = getNFTBridge();
					const collection = bridge.getCardCollection();
					const uids = offer.offeredCardIds
						.map(cardId => collection.find(c => c.cardId === cardId)?.uid)
						.filter((uid): uid is string => !!uid);

					if (uids.length > 0) {
						const result = await bridge.transferCards
							? await bridge.transferCards(uids, offer.toUser, `trade:${offerId}`)
							: await bridge.transferCard(uids[0], offer.toUser, `trade:${offerId}`);

						if (result.success) {
							uids.forEach(uid => {
								bridge.removeCard(uid);
								bridge.emitCardTransferred(uid, offer.fromUser, offer.toUser);
							});
							emitNotification({ message: `Transferred ${uids.length} card(s) on-chain`, level: 'success' });
						} else {
							debug.warn('[Trade] On-chain transfer failed — server trade accepted but chain transfer incomplete');
							emitNotification({ message: 'Trade accepted but chain transfer failed — contact support', level: 'warning' });
						}
					}
				}
				return true;
			}
			emitNotification({ message: 'Failed to accept trade', level: 'error' });
			return false;
		} catch (err) {
			debug.warn('[Trade] acceptOffer error:', err);
			emitNotification({ message: 'Error accepting trade', level: 'error' });
			return false;
		}
	},

	declineOffer: async (offerId, username) => {
		try {
			const authBody = getNFTBridge().isHiveMode()
				? await getNFTBridge().buildAuthBody(username, 'trade-decline', { username })
				: { username };
			const res = await fetch(`/api/trades/${offerId}/decline`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(authBody),
			});
			if (res.ok) {
				set(s => ({
					offers: s.offers.map(o => o.id === offerId ? { ...o, status: 'declined' as const } : o),
				}));
				return true;
			}
			emitNotification({ message: 'Failed to decline trade', level: 'error' });
			return false;
		} catch {
			emitNotification({ message: 'Error declining trade', level: 'error' });
			return false;
		}
	},

	cancelOffer: async (offerId, username) => {
		try {
			const authBody = getNFTBridge().isHiveMode()
				? await getNFTBridge().buildAuthBody(username, 'trade-cancel', { username })
				: { username };
			const res = await fetch(`/api/trades/${offerId}/cancel`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(authBody),
			});
			if (res.ok) {
				set(s => ({
					offers: s.offers.map(o => o.id === offerId ? { ...o, status: 'cancelled' as const } : o),
				}));
				return true;
			}
			emitNotification({ message: 'Failed to cancel trade', level: 'error' });
			return false;
		} catch {
			emitNotification({ message: 'Error cancelling trade', level: 'error' });
			return false;
		}
	},

	toggleOfferedCard: (cardId) => {
		set(s => ({
			selectedOfferedCards: s.selectedOfferedCards.includes(cardId)
				? s.selectedOfferedCards.filter(id => id !== cardId)
				: [...s.selectedOfferedCards, cardId],
		}));
	},

	toggleRequestedCard: (cardId) => {
		set(s => ({
			selectedRequestedCards: s.selectedRequestedCards.includes(cardId)
				? s.selectedRequestedCards.filter(id => id !== cardId)
				: [...s.selectedRequestedCards, cardId],
		}));
	},

	clearSelections: () => set({
		selectedOfferedCards: [],
		selectedRequestedCards: [],
	}),
}));
