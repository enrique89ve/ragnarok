import {
	classifyLogicalProtocol,
	mayDropProtocolSilently,
	type RagnarokLogicalProtocol,
} from '@shared/p2p-wire/protocols';

export type ProtocolHandler = (payload: unknown) => void;

export type ProtocolRegistry = {
	register(protocol: RagnarokLogicalProtocol, handler: ProtocolHandler): void;
	dispatch(messageType: string, payload: unknown): 'handled' | 'dropped' | 'unregistered';
};

export function createProtocolRegistry(): ProtocolRegistry {
	const handlers = new Map<RagnarokLogicalProtocol, ProtocolHandler>();

	return {
		register(protocol, handler) {
			handlers.set(protocol, handler);
		},
		dispatch(messageType, payload) {
			const protocol = classifyLogicalProtocol(messageType);
			const handler = handlers.get(protocol);
			if (!handler) {
				return mayDropProtocolSilently(protocol) ? 'dropped' : 'unregistered';
			}
			handler(payload);
			return 'handled';
		},
	};
}
