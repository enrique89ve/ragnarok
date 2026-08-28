declare module 'stun' {
	import type { Socket } from 'node:dgram';

	export type StunRequest = {
		readonly type: number;
		readonly transactionId: Buffer;
		addXorAddress: (address: string, port: number) => unknown;
		addSoftware: (software: string) => unknown;
		toBuffer: () => Buffer;
	};

	export type StunServer = {
		on: (event: string, listener: (...args: unknown[]) => void) => StunServer;
		listen: (port: number, address: string, callback?: () => void) => void;
		process: (message: Buffer, rinfo: { readonly address: string; readonly port: number }) => void;
		send: (message: StunRequest, port: number, address: string) => boolean;
		close: () => void;
	};

	type StunModule = {
		createMessage: (type: number, transactionId?: Buffer) => StunRequest;
		createServer: (options: { readonly type: 'udp4' | 'udp6'; readonly socket: Socket }) => StunServer;
		constants: Readonly<Record<string, number>>;
	};

	const stun: StunModule;
	export default stun;
}
