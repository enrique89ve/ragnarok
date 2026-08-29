import { describe, expect, it } from 'vitest';

import {
	getP2PControlTelemetrySnapshot,
	recordP2PTransportFallback,
	recordP2PTransportReady,
	resetP2PControlTelemetryForTests,
} from './p2pControlTelemetry';

describe('P2P control transport telemetry', () => {
	it('keeps only aggregate transport outcomes', () => {
		resetP2PControlTelemetryForTests();
		recordP2PTransportReady('webrtc');
		recordP2PTransportReady('websocket-relay');
		recordP2PTransportFallback('ice_failed');
		recordP2PTransportFallback('ice_failed');

		expect(getP2PControlTelemetrySnapshot({ activeRooms: 1, activeConnections: 2 })).toMatchObject({
		transportReadyByKind: { webrtc: 1, 'websocket-relay': 1 },
		transportFallbackByReason: { ice_failed: 2 },
	});
	});
});
