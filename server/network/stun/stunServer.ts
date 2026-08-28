import dgram, { type RemoteInfo } from 'node:dgram';
import stun, { type StunRequest, type StunServer } from 'stun';

import type { StunConfig } from './stunConfig';
import { createStunRateLimiter } from './stunRateLimit';
import { createStunTelemetry, type StunTelemetrySnapshot } from './stunTelemetry';

const STUN_HEADER_BYTES = 20;
const STUN_MAGIC_COOKIE = 0x2112_a442;
const STUN_BINDING_REQUEST = 0x0001;

export type StunHealth = Readonly<{
	enabled: boolean;
	status: 'disabled' | 'starting' | 'healthy' | 'degraded' | 'stopped';
	host: string;
	port: number;
	lastError: string | null;
}>;

export type StunService = {
	start: () => Promise<void>;
	stop: () => Promise<void>;
	health: () => StunHealth;
	stats: () => StunTelemetrySnapshot;
};

function isValidStunHeader(packet: Buffer, maxPacketBytes: number): boolean {
	if (packet.length < STUN_HEADER_BYTES || packet.length > maxPacketBytes) return false;
	const messageType = packet.readUInt16BE(0);
	const messageLength = packet.readUInt16BE(2);
	if ((messageType & 0xc000) !== 0) return false;
	if (packet.readUInt32BE(4) !== STUN_MAGIC_COOKIE) return false;
	return messageLength % 4 === 0 && messageLength + STUN_HEADER_BYTES === packet.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isDecodedBindingRequest(value: unknown): value is Pick<StunRequest, 'type' | 'transactionId'> {
	if (!isRecord(value)) return false;
	return typeof value.type === 'number' && Buffer.isBuffer(value.transactionId);
}

function isRemoteInfo(value: unknown): value is Pick<RemoteInfo, 'address' | 'port'> {
	if (!isRecord(value)) return false;
	return typeof value.address === 'string' && typeof value.port === 'number';
}

export function createStunService(config: StunConfig): StunService {
	const telemetry = createStunTelemetry();
	const limiter = createStunRateLimiter(config.limits);
	let socket: dgram.Socket | null = null;
	let server: StunServer | null = null;
	let status: StunHealth['status'] = config.enabled ? 'stopped' : 'disabled';
	let lastError: string | null = null;
	let boundPort = config.port;

	const setDegraded = (error: unknown): void => {
		lastError = error instanceof Error ? error.message : String(error);
		status = 'degraded';
		telemetry.error();
	};

	const handleBindingRequest = (request: Pick<StunRequest, 'type' | 'transactionId'>, rinfo: Pick<RemoteInfo, 'address' | 'port'>): void => {
		if (request.type !== STUN_BINDING_REQUEST || !socket) {
			telemetry.invalid();
			telemetry.dropped();
			return;
		}
		try {
			const response = stun.createMessage(stun.constants.STUN_BINDING_RESPONSE, request.transactionId);
			response.addXorAddress(rinfo.address, rinfo.port);
			response.addSoftware('Ragnarok STUN');
			socket.send(response.toBuffer(), rinfo.port, rinfo.address, (error) => {
				if (error) setDegraded(error);
			});
		} catch (error) {
			setDegraded(error);
		}
	};

	const start = async (): Promise<void> => {
		if (!config.enabled || status === 'healthy' || status === 'starting') return;
		status = 'starting';
		lastError = null;
		try {
			socket = dgram.createSocket('udp4');
			server = stun.createServer({ type: 'udp4', socket });
			server.on('bindingRequest', (...args: unknown[]) => {
				const request = args[0];
				const rinfo = args[1];
				if (!isDecodedBindingRequest(request) || !isRemoteInfo(rinfo)) {
					telemetry.invalid();
					return;
				}
				handleBindingRequest(request, rinfo);
			});
			server.on('error', () => telemetry.invalid());
			socket.removeAllListeners('message');
			socket.on('message', (packet, rinfo) => {
				telemetry.request();
				if (!isValidStunHeader(packet, config.limits.maxPacketBytes)) {
					telemetry.invalid();
					telemetry.dropped();
					return;
				}
				const decision = limiter.consume(rinfo.address);
				if (!decision.allowed) {
					telemetry.rateLimited();
					telemetry.dropped();
					return;
				}
				try { server?.process(packet, rinfo); }
				catch (error) { setDegraded(error); }
			});
			socket.on('error', setDegraded);
			await new Promise<void>((resolve) => {
				let settled = false;
				const finish = (): void => {
					if (settled) return;
					settled = true;
					resolve();
				};
				socket?.once('error', (error: Error) => {
					setDegraded(error);
					finish();
				});
				try {
					server?.listen(config.port, config.host, () => {
						const address = socket?.address();
						if (typeof address === 'object' && address !== null) boundPort = address.port;
						status = 'healthy';
						finish();
					});
				} catch (error) {
					setDegraded(error);
					finish();
				}
			});
		} catch (error) {
			setDegraded(error);
		}
	};

	const stop = async (): Promise<void> => {
		if (!socket && !server) return;
		try { server?.close(); } catch (error) { setDegraded(error); }
		try { socket?.close(); } catch { /* socket may not have been bound */ }
		socket = null;
		server = null;
		status = config.enabled ? 'stopped' : 'disabled';
	};

	return {
		start,
		stop,
		health: (): StunHealth => ({ enabled: config.enabled, status, host: config.host, port: boundPort, lastError }),
		stats: telemetry.stats,
	};
}
