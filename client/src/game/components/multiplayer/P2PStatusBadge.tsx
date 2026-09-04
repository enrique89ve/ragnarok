/**
 * P2PStatusBadge.tsx — Compact connection status indicator
 *
 * Shows: connected (green), reconnecting (amber with countdown),
 * grace period (amber with countdown), error (red), buffered messages count.
 */

import { Download } from 'lucide-react';

import { useP2PActions } from '../../context/useP2PActions';
import { usePeerStore } from '../../stores/peerStore';

interface P2PStatusBadgeProps {
	className?: string;
}

function reconnectStatusLabel(hardReloadResume: boolean): string {
	return hardReloadResume ? 'Rejoining saved match' : 'Reconnecting';
}

function badgeCaption(input: {
	readonly connectionState: string;
	readonly unstableSubject: string;
	readonly reconnectLabel: string;
	readonly fallbackLabel: string;
	readonly integrityPaused?: boolean;
}): string {
	if (input.integrityPaused) return 'Integrity paused';
	if (input.connectionState === 'connected') return 'Connected';
	if (input.connectionState === 'grace_period') return input.unstableSubject;
	if (input.connectionState === 'reconnecting') return input.reconnectLabel;
	return input.fallbackLabel;
}

function shouldShowBadge(connectionState: string, integrityPaused = false): boolean {
	return integrityPaused
		|| connectionState === 'connected'
		|| connectionState === 'reconnecting'
		|| connectionState === 'grace_period'
		|| connectionState === 'error';
}

function shouldShowReconnectCountdown(connectionState: string): boolean {
	return connectionState === 'reconnecting' || connectionState === 'grace_period';
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
		reconnectCountdown,
		disconnectSide,
		hardReloadResume,
		p2pIntegrityError,
	} = usePeerStore();
	const { downloadSessionLog } = useP2PActions();
	const integrityPaused = Boolean(p2pIntegrityError);

	if (!shouldShowBadge(connectionState, integrityPaused)) return null;

	const config = integrityPaused
		? { ...STATUS_CONFIG.error, label: 'Integrity paused' }
		: STATUS_CONFIG[connectionState as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.connected;
	const showCountdown = !integrityPaused && shouldShowReconnectCountdown(connectionState) && reconnectCountdown > 0;
	const unstableSubject = disconnectSide === 'opponent' ? 'Opponent unstable' : 'Connection unstable';
	const reconnectLabel = reconnectStatusLabel(hardReloadResume);
	const caption = badgeCaption({
		connectionState,
		unstableSubject,
		reconnectLabel,
		fallbackLabel: config.label,
		integrityPaused,
	});

	return (
		<>
			{/* Badge */}
			<div
				className={`p2p-status-badge ${className}`}
				role="status"
				aria-live="polite"
				aria-label={`Match: ${caption}${showCountdown ? `, ${reconnectCountdown} seconds remaining` : ''}`}
				title={`Match connection — ${config.label}`}
				style={{
					position: 'fixed',
					bottom: '18px',
					right: '18px',
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
				{caption}
				{showCountdown && ` (${reconnectCountdown}s)`}
				<button
					type="button"
					aria-label="Download P2P session log"
					title="Download P2P session log"
					onClick={(event) => {
						event.stopPropagation();
						downloadSessionLog();
					}}
					style={{
						width: 44,
						height: 44,
						minWidth: 44,
						minHeight: 44,
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
		</>
	);
};

export default P2PStatusBadge;
