import React from 'react';

import { useP2PActions } from '../../context/useP2PActions';
import { P2P_SESSION_JSON_EXPORT_LABEL } from '../../p2p/p2pMatchPauseView';
import './p2pSessionJsonExportButton.css';

export function P2PSessionJsonExportButton({
	className,
}: {
	readonly className?: string;
}): React.ReactElement {
	const { downloadSessionLog } = useP2PActions();
	return (
		<button
			type="button"
			className={['p2p-session-json-export', className].filter(Boolean).join(' ')}
			onClick={downloadSessionLog}
		>
			{P2P_SESSION_JSON_EXPORT_LABEL}
		</button>
	);
}
