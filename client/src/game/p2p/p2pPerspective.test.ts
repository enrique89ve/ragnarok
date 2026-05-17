import { describe, expect, it } from 'vitest';
import {
	canonicalOwnerToViewerActor,
	canonicalOwnerToVisualSide,
	createP2PViewerPerspective,
	formatP2PTransportRole,
	getP2PProcessFlags,
	getP2PTransportRole,
	mapCanonicalValuesToViewer,
	mapViewerValuesToCanonical,
	viewerActorToCanonicalOwner,
	visualSideToCanonicalOwner,
} from './p2pPerspective';

describe('p2pPerspective', () => {
	it('keeps transport role separate from visual perspective', () => {
		expect(getP2PTransportRole(true)).toBe('host');
		expect(getP2PTransportRole(false)).toBe('guest');
		expect(formatP2PTransportRole('host')).toBe('Host');
		expect(formatP2PTransportRole('guest')).toBe('Guest');
	});

	it('maps canonical owners to local and remote for first mover', () => {
		const perspective = createP2PViewerPerspective('player');

		expect(canonicalOwnerToViewerActor('player', perspective)).toBe('local');
		expect(canonicalOwnerToViewerActor('opponent', perspective)).toBe('remote');
		expect(canonicalOwnerToVisualSide('player', perspective)).toBe('player');
		expect(canonicalOwnerToVisualSide('opponent', perspective)).toBe('opponent');
		expect(viewerActorToCanonicalOwner('local', perspective)).toBe('player');
		expect(viewerActorToCanonicalOwner('remote', perspective)).toBe('opponent');
	});

	it('maps canonical owners to local and remote for second mover', () => {
		const perspective = createP2PViewerPerspective('opponent');

		expect(canonicalOwnerToViewerActor('opponent', perspective)).toBe('local');
		expect(canonicalOwnerToViewerActor('player', perspective)).toBe('remote');
		expect(canonicalOwnerToVisualSide('opponent', perspective)).toBe('player');
		expect(canonicalOwnerToVisualSide('player', perspective)).toBe('opponent');
		expect(visualSideToCanonicalOwner('player', perspective)).toBe('opponent');
		expect(visualSideToCanonicalOwner('opponent', perspective)).toBe('player');
	});

	it('maps viewer values into canonical slots without branchy TSX logic', () => {
		const perspective = createP2PViewerPerspective('opponent');
		const canonical = mapViewerValuesToCanonical({
			perspective,
			localValue: 'my-army',
			remoteValue: 'their-army',
		});

		expect(canonical.player).toBe('their-army');
		expect(canonical.opponent).toBe('my-army');
		expect(mapCanonicalValuesToViewer({ perspective, canonicalValues: canonical })).toEqual({
			local: 'my-army',
			remote: 'their-army',
		});
	});

	it('exposes current host-auth process flags without leaking them into UI decisions', () => {
		expect(getP2PProcessFlags({ transportRole: 'host' })).toMatchObject({
			sendsCardsInit: true,
			adoptsRemoteCardsInit: false,
			broadcastsCardsState: true,
			sendsHashBeacon: true,
			sendsGuestKeepAlive: false,
			appliesChessCommandsSymmetrically: true,
			appliesPokerActionsSymmetrically: true,
		});
		expect(getP2PProcessFlags({ transportRole: 'guest' })).toMatchObject({
			sendsCardsInit: false,
			adoptsRemoteCardsInit: true,
			broadcastsCardsState: false,
			sendsHashBeacon: false,
			sendsGuestKeepAlive: true,
			appliesChessCommandsSymmetrically: true,
			appliesPokerActionsSymmetrically: true,
		});
	});

	it('can model a future symmetric cards process without changing visual mapping', () => {
		expect(getP2PProcessFlags({
			transportRole: 'host',
			cardsAuthorityMode: 'symmetric',
		})).toMatchObject({
			sendsCardsInit: false,
			adoptsRemoteCardsInit: false,
			broadcastsCardsState: false,
			sendsHashBeacon: false,
			sendsGuestKeepAlive: false,
		});
	});
});
