/**
 * GameStatusBanner — ephemeral gameplay status.
 * Reads the combat feedback stack so GameBoard and poker share one queue.
 */
import React from 'react';
import {
	showStatus,
	useCombatFeedbackStore,
	type FeedbackTone,
} from '../../combat/feedback/combatFeedbackStore';
import './GameStatusBanner.css';

export type BannerType = FeedbackTone;

export const useBannerStore = {
	getState: () => ({
		push: (text: string, type: BannerType = 'info', duration?: number) => {
			showStatus(text, type, duration);
		},
	}),
};

export { showStatus };

export const GameStatusBanner: React.FC = () => {
	const messages = useCombatFeedbackStore(s => s.stack);
	if (messages.length === 0) return null;

	return (
		<div className="game-status-banner-container" role="status" aria-live="polite">
			{messages.map(msg => (
				<div
					key={msg.id}
					className={`game-status-banner banner-${msg.tone} banner-enter`}
				>
					<span className="game-status-banner-title">{msg.title}</span>
					{msg.subtitle ? (
						<span className="game-status-banner-subtitle">{msg.subtitle}</span>
					) : null}
				</div>
			))}
		</div>
	);
};

export default GameStatusBanner;
