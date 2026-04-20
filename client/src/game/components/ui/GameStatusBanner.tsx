/**
 * GameStatusBanner — ephemeral in-game status messages
 *
 * Replaces toast popups for gameplay feedback.
 * Shows a brief, non-blocking banner in the center of the viewport
 * that auto-dismisses. Supports error, info, and success variants.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { create } from 'zustand';
import './GameStatusBanner.css';

type BannerType = 'info' | 'error' | 'success' | 'warning';

interface BannerMessage {
	id: number;
	text: string;
	type: BannerType;
	duration: number;
}

interface BannerStore {
	messages: BannerMessage[];
	push: (text: string, type?: BannerType, duration?: number) => void;
	remove: (id: number) => void;
}

let nextId = 0;

export const useBannerStore = create<BannerStore>((set) => ({
	messages: [],
	push: (text, type = 'info', duration = 2800) => {
		const id = ++nextId;
		set(s => ({ messages: [...s.messages.slice(-2), { id, text, type, duration }] }));
		setTimeout(() => set(s => ({ messages: s.messages.filter(m => m.id !== id) })), duration);
	},
	remove: (id) => set(s => ({ messages: s.messages.filter(m => m.id !== id) })),
}));

export function showStatus(text: string, type: BannerType = 'info', duration = 2800) {
	useBannerStore.getState().push(text, type, duration);
}

const BannerItem: React.FC<{ msg: BannerMessage }> = React.memo(({ msg }) => {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.classList.add('banner-enter');
		const fadeTimer = setTimeout(() => el.classList.add('banner-exit'), msg.duration - 500);
		return () => clearTimeout(fadeTimer);
	}, [msg.duration]);

	return (
		<div ref={ref} className={`game-status-banner banner-${msg.type}`}>
			{msg.text}
		</div>
	);
});

export const GameStatusBanner: React.FC = () => {
	const messages = useBannerStore(s => s.messages);
	if (messages.length === 0) return null;

	return (
		<div className="game-status-banner-container">
			{messages.map(msg => <BannerItem key={msg.id} msg={msg} />)}
		</div>
	);
};

export default GameStatusBanner;
