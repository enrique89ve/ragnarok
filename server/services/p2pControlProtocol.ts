import {
	P2P_CONTROL_WS_PROTOCOL,
	P2P_CONTROL_WS_PROTOCOL_PREFIX,
} from '../../shared/p2p-wire/control';
import { readP2PRelayHeaderValues } from './p2pRelayOrigin';

export function hasP2PControlProtocol(value: string | string[] | undefined): boolean {
	return readP2PRelayHeaderValues(value).includes(P2P_CONTROL_WS_PROTOCOL);
}

export function readP2PControlTicketToken(value: string | string[] | undefined): string | null {
	for (const protocol of readP2PRelayHeaderValues(value)) {
		if (!protocol.startsWith(P2P_CONTROL_WS_PROTOCOL_PREFIX)) continue;
		const token = protocol.slice(P2P_CONTROL_WS_PROTOCOL_PREFIX.length);
		return token.length > 0 ? token : null;
	}
	return null;
}

