import { describe, expect, it } from 'vitest';
import {
	canonicalOwnerToViewerActor,
	canonicalOwnerToVisualSide,
	createP2PViewerPerspective,
	formatP2PTransportRole,
	getP2PProcessFlags,
	getP2PTransportRole,
	isCardsAuthorityRole,
	isCardsCanonicalPlayerFrame,
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

	it('defaults cards process flags to symmetric gameplay with host recovery', () => {
		expect(getP2PProcessFlags({ transportRole: 'host' })).toMatchObject({
			sendsCardsInit: false,
			adoptsRemoteCardsInit: false,
			broadcastsCardsState: false,
			sendsHashBeacon: true,
			sendsCardsRecoverySnapshot: true,
			sendsGuestKeepAlive: false,
			appliesChessCommandsSymmetrically: true,
			appliesPokerActionsSymmetrically: true,
		});
		expect(getP2PProcessFlags({ transportRole: 'guest' })).toMatchObject({
			sendsCardsInit: false,
			adoptsRemoteCardsInit: false,
			broadcastsCardsState: false,
			sendsHashBeacon: false,
			sendsCardsRecoverySnapshot: false,
			sendsGuestKeepAlive: true,
			appliesChessCommandsSymmetrically: true,
			appliesPokerActionsSymmetrically: true,
		});
	});

	it('keeps host-authoritative dumps available as an explicit legacy mode', () => {
		expect(getP2PProcessFlags({
			transportRole: 'host',
			cardsAuthorityMode: 'host-authoritative',
		})).toMatchObject({
			sendsCardsInit: true,
			adoptsRemoteCardsInit: false,
			broadcastsCardsState: true,
		});
		expect(isCardsAuthorityRole(true, 'host-authoritative')).toBe(true);
		expect(isCardsAuthorityRole(false, 'host-authoritative')).toBe(false);
	});

	it('does not treat either peer as a forward-dump authority in the default mode', () => {
		expect(isCardsAuthorityRole(true)).toBe(false);
		expect(isCardsAuthorityRole(false)).toBe(false);
		expect(isCardsAuthorityRole(true, 'symmetric')).toBe(false);
		expect(isCardsAuthorityRole(false, 'symmetric')).toBe(false);
	});

	it('uses the canonical player side as the cards hash frame', () => {
		expect(isCardsCanonicalPlayerFrame('player')).toBe(true);
		expect(isCardsCanonicalPlayerFrame('opponent')).toBe(false);
		expect(isCardsCanonicalPlayerFrame(null)).toBe(false);
	});
});
