import React from 'react';

import { resolveP2PMatchPauseView } from '../../p2p/p2pMatchPauseView';
import { usePeerStore } from '../../stores/peerStore';
import { P2PSessionJsonExportButton } from './P2PSessionJsonExportButton';
import './p2pMatchPauseOverlay.css';

export const P2PMatchPauseOverlay: React.FC = () => {
	const connectionState = usePeerStore(state => state.connectionState);
	const disconnectSide = usePeerStore(state => state.disconnectSide);
	const integrityError = usePeerStore(state => state.p2pIntegrityError);
	const reconnectCountdown = usePeerStore(state => state.reconnectCountdown);
	const reconnectAttemptCount = usePeerStore(state => state.reconnectAttemptCount);
	const view = resolveP2PMatchPauseView({
		connectionState,
		disconnectSide,
		integrityError,
		reconnectCountdown,
		reconnectAttemptCount,
	});
	if (!view) return null;

	return (
		<div
			className={`p2p-match-pause kind-${view.kind}`}
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="p2p-match-pause-title"
			aria-describedby="p2p-match-pause-detail"
		>
			<div className="p2p-match-pause-card">
				<p className="p2p-match-pause-kicker">Match paused</p>
				<h2 id="p2p-match-pause-title" className="p2p-match-pause-title">{view.title}</h2>
				<p id="p2p-match-pause-detail" className="p2p-match-pause-detail">{view.detail}</p>
				<P2PSessionJsonExportButton />
			</div>
		</div>
	);
};
