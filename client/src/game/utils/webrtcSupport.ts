type WebRTCIssue =
	| 'server_runtime'
	| 'missing_peer_connection'
	| 'peer_connection_creation_failed'
	| 'missing_data_channel'
	| 'data_channel_creation_failed';

interface LegacyWebRTCWindow extends Window {
	RTCPeerConnection?: typeof RTCPeerConnection;
	webkitRTCPeerConnection?: typeof RTCPeerConnection;
	mozRTCPeerConnection?: typeof RTCPeerConnection;
}

export interface WebRTCSupportReport {
	supported: boolean;
	message: string | null;
	issues: WebRTCIssue[];
	isSecureContext: boolean | null;
	isEmbeddedFrame: boolean | null;
	userAgent: string | null;
}

const WEBRTC_UNSUPPORTED_MESSAGE =
	'This browser or privacy setting is blocking WebRTC DataChannels. In Brave, lower Shields for this site or allow WebRTC in Settings > Privacy and security > WebRTC IP handling policy, then reload from localhost or HTTPS.';

function isEmbeddedFrame(): boolean | null {
	if (typeof window === 'undefined') return null;

	try {
		return window.self !== window.top;
	} catch {
		return true;
	}
}

function getPeerConnectionConstructor(): typeof RTCPeerConnection | null {
	if (typeof window === 'undefined') return null;

	const webRTCWindow = window as LegacyWebRTCWindow;
	return webRTCWindow.RTCPeerConnection
		?? webRTCWindow.webkitRTCPeerConnection
		?? webRTCWindow.mozRTCPeerConnection
		?? null;
}

export function getWebRTCSupport(): WebRTCSupportReport {
	if (typeof window === 'undefined') {
		return {
			supported: false,
			message: WEBRTC_UNSUPPORTED_MESSAGE,
			issues: ['server_runtime'],
			isSecureContext: null,
			isEmbeddedFrame: null,
			userAgent: null,
		};
	}

	const issues: WebRTCIssue[] = [];
	const PeerConnection = getPeerConnectionConstructor();
	let peerConnection: RTCPeerConnection | null = null;
	let dataChannel: RTCDataChannel | null = null;

	if (!PeerConnection) {
		issues.push('missing_peer_connection');
	} else if (typeof PeerConnection.prototype.createDataChannel !== 'function') {
		issues.push('missing_data_channel');
	} else {
		try {
			peerConnection = new PeerConnection({ iceServers: [] });
		} catch {
			issues.push('peer_connection_creation_failed');
		}

		if (peerConnection) {
			try {
				dataChannel = peerConnection.createDataChannel('_RAGNAROK_WEBRTC_TEST', { ordered: true });
			} catch {
				issues.push('data_channel_creation_failed');
			}
		}
	}

	if (dataChannel) {
		dataChannel.close();
	}

	if (peerConnection) {
		peerConnection.close();
	}

	return {
		supported: issues.length === 0,
		message: issues.length === 0 ? null : WEBRTC_UNSUPPORTED_MESSAGE,
		issues,
		isSecureContext: window.isSecureContext,
		isEmbeddedFrame: isEmbeddedFrame(),
		userAgent: window.navigator.userAgent,
	};
}

export class WebRTCSupportError extends Error {
	readonly report: WebRTCSupportReport;

	constructor(report: WebRTCSupportReport) {
		super(report.message ?? WEBRTC_UNSUPPORTED_MESSAGE);
		this.name = 'WebRTCSupportError';
		this.report = report;
	}
}

export function assertWebRTCSupport(): void {
	const report = getWebRTCSupport();
	if (!report.supported) {
		throw new WebRTCSupportError(report);
	}
}

export function getPeerErrorMessage(error: unknown): string {
	if (error instanceof WebRTCSupportError) {
		return error.message;
	}

	if (error instanceof Error && /support WebRTC/i.test(error.message)) {
		return WEBRTC_UNSUPPORTED_MESSAGE;
	}

	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}

	return 'Peer connection failed';
}
