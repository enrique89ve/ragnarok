/**
 * P2PStatusBadge.tsx — Connection status indicator + reconnect overlay
 *
 * Shows: connected (green), reconnecting (amber with countdown),
 * grace period (amber with countdown), error (red), buffered messages count.
 */

import { Download } from 'lucide-react';

import { useP2PActions } from '../../context/useP2PActions';
import { formatP2PTransportRole, getP2PTransportRole } from '../../p2p/p2pPerspective';
import { usePeerStore } from '../../stores/peerStore';

interface P2PStatusBadgeProps {
	className?: string;
}

const STATUS_CONFIG = {
	connected: { color: '#4ade80', border: 'rgba(74,222,128,0.5)', label: 'Connected', glow: '#4ade80' },
	reconnecting: { color: '#fbbf24', border: 'rgba(251,191,36,0.5)', label: 'Reconnecting', glow: '#fbbf24' },
	grace_period: { color: '#f97316', border: 'rgba(249,115,22,0.5)', label: 'Opponent Unstable', glow: '#f97316' },
	error: { color: '#ef4444', border: 'rgba(239,68,68,0.5)', label: 'Disconnected', glow: '#ef4444' },
};

export const P2PStatusBadge: React.FC<P2PStatusBadgeProps> = ({ className = '' }) => {
	const {
		connectionState,
		isHost,
		reconnectCountdown,
		reconnectAttemptCount,
		disconnectSide,
		bufferedMessageCount,
	} = usePeerStore();
	const { downloadSessionLog } = useP2PActions();

	const isActive = connectionState === 'connected' || connectionState === 'reconnecting' || connectionState === 'grace_period';
	if (!isActive && connectionState !== 'error') return null;

	const config = STATUS_CONFIG[connectionState as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.connected;
	const transportRoleLabel = formatP2PTransportRole(getP2PTransportRole(isHost));
	const showCountdown = (connectionState === 'reconnecting' || connectionState === 'grace_period') && reconnectCountdown > 0;
	const unstableSubject = disconnectSide === 'opponent' ? 'Opponent unstable' : 'Connection unstable';
	const reconnectLabel = reconnectAttemptCount > 0 ? `Attempt ${reconnectAttemptCount}/2` : 'Reconnecting';

	return (
		<>
			{/* Badge */}
			<div
				className={`p2p-status-badge ${className}`}
				title={`P2P Multiplayer — ${transportRoleLabel} — ${config.label}`}
				style={{
					position: 'fixed',
					top: '8px',
					right: '8px',
					zIndex: 900,
					display: 'flex',
					alignItems: 'center',
					gap: '5px',
					background: 'rgba(0,0,0,0.85)',
					border: `1px solid ${config.border}`,
					borderRadius: '20px',
					padding: '3px 10px 3px 6px',
					fontSize: '11px',
					fontWeight: 600,
					color: config.color,
					userSelect: 'none',
					pointerEvents: 'auto',
				}}
			>
				<span
					style={{
						width: 8,
						height: 8,
						borderRadius: '50%',
						background: config.color,
						boxShadow: `0 0 6px ${config.glow}`,
						flexShrink: 0,
					}}
				/>
				{connectionState === 'connected'
					? `P2P · ${transportRoleLabel}`
					: connectionState === 'grace_period'
						? unstableSubject
						: connectionState === 'reconnecting'
							? reconnectLabel
							: config.label}
				{showCountdown && ` (${reconnectCountdown}s)`}
				{bufferedMessageCount > 0 && connectionState !== 'connected' && (
					<span style={{ fontSize: '9px', opacity: 0.6, marginLeft: 2 }}>
						{bufferedMessageCount} queued
					</span>
				)}
				<button
					type="button"
					aria-label="Download P2P session log"
					title="Download P2P session log"
					onClick={(event) => {
						event.stopPropagation();
						downloadSessionLog();
					}}
					style={{
						width: 22,
						height: 22,
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						border: `1px solid ${config.border}`,
						borderRadius: 6,
						background: 'rgba(255,255,255,0.08)',
						color: config.color,
						cursor: 'pointer',
						padding: 0,
					}}
				>
					<Download size={13} strokeWidth={2.2} aria-hidden="true" />
				</button>
			</div>

			{/* Reconnecting overlay (semi-transparent, doesn't block game — like Madden) */}
			{(connectionState === 'reconnecting' || connectionState === 'grace_period') && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						zIndex: 899,
						background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
						padding: '48px 0 24px',
						textAlign: 'center',
						pointerEvents: 'none',
					}}
				>
					<p style={{ color: config.color, fontSize: '16px', fontWeight: 700, letterSpacing: '0.05em' }}>
						{connectionState === 'reconnecting' ? reconnectLabel : unstableSubject}
					</p>
					{showCountdown && (
						<p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
							{reconnectCountdown}s remaining before technical result
						</p>
					)}
					<p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '8px' }}>
						Two reconnect attempts are allowed. The disconnected side loses after 60s.
					</p>
				</div>
			)}
		</>
	);
};

export default P2PStatusBadge;
