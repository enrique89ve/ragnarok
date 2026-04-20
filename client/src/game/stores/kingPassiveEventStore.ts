import { create } from 'zustand';

export interface KingPassiveEvent {
	id: string;
	kingId: string;
	kingName: string;
	passiveName: string;
	passiveDescription: string;
	ownerType: 'player' | 'opponent';
	timestamp: number;
}

interface KingPassiveEventStore {
	events: KingPassiveEvent[];
	auraAnnouncedKings: Set<string>;
	pushEvent: (event: KingPassiveEvent) => void;
	removeEvent: (id: string) => void;
	markAuraAnnounced: (kingId: string) => void;
	reset: () => void;
}

export const useKingPassiveEventStore = create<KingPassiveEventStore>((set) => ({
	events: [],
	auraAnnouncedKings: new Set(),

	pushEvent: (event) => set((state) => ({
		events: [...state.events, event]
	})),

	removeEvent: (id) => set((state) => ({
		events: state.events.filter((e) => e.id !== id)
	})),

	markAuraAnnounced: (kingId) => set((state) => {
		const next = new Set(state.auraAnnouncedKings);
		next.add(kingId);
		return { auraAnnouncedKings: next };
	}),

	reset: () => set({ events: [], auraAnnouncedKings: new Set() }),
}));

let eventCounter = 0;

export function emitKingPassiveEvent(
	kingId: string,
	kingName: string,
	passiveName: string,
	passiveDescription: string,
	ownerType: 'player' | 'opponent'
): void {
	eventCounter++;
	const event: KingPassiveEvent = {
		id: `kpe_${Date.now()}_${eventCounter}`,
		kingId,
		kingName,
		passiveName,
		passiveDescription,
		ownerType,
		timestamp: Date.now(),
	};
	useKingPassiveEventStore.getState().pushEvent(event);
}
