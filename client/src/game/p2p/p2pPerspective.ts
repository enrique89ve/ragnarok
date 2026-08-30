import type { CanonicalChessSide } from '@shared/p2p-wire/chess';

export type P2PTransportRole = 'host' | 'guest';
export type P2PViewerActor = 'local' | 'remote';
export type P2PVisualSide = 'player' | 'opponent';
export type P2PCardsAuthorityMode = 'host-authoritative' | 'symmetric';

export interface P2PViewerPerspective {
	readonly localCanonicalSide: CanonicalChessSide;
	readonly remoteCanonicalSide: CanonicalChessSide;
	readonly localVisualSide: P2PVisualSide;
	readonly remoteVisualSide: P2PVisualSide;
}

export interface P2PProcessFlags {
	readonly sendsCardsInit: boolean;
	readonly adoptsRemoteCardsInit: boolean;
	readonly broadcastsCardsState: boolean;
	readonly sendsHashBeacon: boolean;
	readonly sendsCardsRecoverySnapshot: boolean;
	readonly sendsGuestKeepAlive: boolean;
	readonly appliesChessCommandsSymmetrically: true;
	readonly appliesPokerActionsSymmetrically: true;
}

export function getP2PTransportRole(isWsHost: boolean): P2PTransportRole {
	return isWsHost ? 'host' : 'guest';
}

export function formatP2PTransportRole(role: P2PTransportRole): 'Host' | 'Guest' {
	return role === 'host' ? 'Host' : 'Guest';
}

export function getRemoteCanonicalSide(side: CanonicalChessSide): CanonicalChessSide {
	return side === 'player' ? 'opponent' : 'player';
}

export function createP2PViewerPerspective(
	localCanonicalSide: CanonicalChessSide,
): P2PViewerPerspective {
	return {
		localCanonicalSide,
		remoteCanonicalSide: getRemoteCanonicalSide(localCanonicalSide),
		localVisualSide: 'player',
		remoteVisualSide: 'opponent',
	};
}

export function canonicalOwnerToViewerActor(
	owner: CanonicalChessSide,
	perspective: P2PViewerPerspective,
): P2PViewerActor {
	return owner === perspective.localCanonicalSide ? 'local' : 'remote';
}

export function viewerActorToCanonicalOwner(
	actor: P2PViewerActor,
	perspective: P2PViewerPerspective,
): CanonicalChessSide {
	return actor === 'local'
		? perspective.localCanonicalSide
		: perspective.remoteCanonicalSide;
}

export function canonicalOwnerToVisualSide(
	owner: CanonicalChessSide,
	perspective: P2PViewerPerspective,
): P2PVisualSide {
	return canonicalOwnerToViewerActor(owner, perspective) === 'local'
		? perspective.localVisualSide
		: perspective.remoteVisualSide;
}

export function visualSideToCanonicalOwner(
	side: P2PVisualSide,
	perspective: P2PViewerPerspective,
): CanonicalChessSide {
	return side === perspective.localVisualSide
		? perspective.localCanonicalSide
		: perspective.remoteCanonicalSide;
}

export function mapViewerValuesToCanonical<T>(input: {
	readonly perspective: P2PViewerPerspective;
	readonly localValue: T;
	readonly remoteValue: T;
}): Record<CanonicalChessSide, T> {
	if (input.perspective.localCanonicalSide === 'player') {
		return {
			player: input.localValue,
			opponent: input.remoteValue,
		};
	}
	return {
		player: input.remoteValue,
		opponent: input.localValue,
	};
}

export function mapCanonicalValuesToViewer<T>(input: {
	readonly perspective: P2PViewerPerspective;
	readonly canonicalValues: Record<CanonicalChessSide, T>;
}): Record<P2PViewerActor, T> {
	return {
		local: input.canonicalValues[input.perspective.localCanonicalSide],
		remote: input.canonicalValues[input.perspective.remoteCanonicalSide],
	};
}

/**
 * The cards hash frame is the canonical player side. It is independent from
 * the transport host hint because seed parity may assign first mover to either
 * browser. Do not use `isCardsAuthorityRole` for hashing — that helper tracks
 * forward `gameState` dumps (off in symmetric mode).
 */
export function isCardsCanonicalPlayerFrame(side: CanonicalChessSide | null): boolean {
	return side === 'player';
}

export function isCardsAuthorityRole(
	isHost: boolean,
	cardsAuthorityMode?: P2PCardsAuthorityMode,
): boolean {
	return getP2PProcessFlags({
		transportRole: getP2PTransportRole(isHost),
		cardsAuthorityMode,
	}).broadcastsCardsState;
}

export function getP2PProcessFlags(input: {
	readonly transportRole: P2PTransportRole;
	readonly cardsAuthorityMode?: P2PCardsAuthorityMode;
}): P2PProcessFlags {
	const mode = input.cardsAuthorityMode ?? 'symmetric';
	const isHost = input.transportRole === 'host';
	const isHostCardsAuthority = mode === 'host-authoritative' && isHost;

	return {
		sendsCardsInit: isHostCardsAuthority,
		adoptsRemoteCardsInit: mode === 'host-authoritative' && !isHost,
		broadcastsCardsState: isHostCardsAuthority,
		sendsHashBeacon: isHost,
		sendsCardsRecoverySnapshot: isHost,
		sendsGuestKeepAlive: input.transportRole === 'guest',
		appliesChessCommandsSymmetrically: true,
		appliesPokerActionsSymmetrically: true,
	};
}
