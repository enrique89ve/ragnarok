/**
 * useCardGameKeyboard — Wires keybindings from settingsStore to card game actions.
 *
 * Supports: endTurn (Space), useHeroPower (h), showGameLog (l),
 * concede (unbound by default), toggleFullscreen (f).
 */

import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useGameStore } from '../stores/gameStore';
import { GAME_COMMAND_TYPES } from '../core/commands';
import { useP2PActions } from '../context/useP2PActions';

interface UseCardGameKeyboardOptions {
	onToggleGameLog?: () => void;
	enabled?: boolean;
}

export function useCardGameKeyboard({ onToggleGameLog, enabled = true }: UseCardGameKeyboardOptions = {}) {
	const { dispatchGameCommand } = useP2PActions();

	useEffect(() => {
		if (!enabled) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement ||
				(e.target as HTMLElement)?.isContentEditable
			) return;

			const bindings = useSettingsStore.getState().keybindings;
			const key = e.key === ' ' ? 'Space' : e.key.toLowerCase();

			const match = (binding: string) => {
				if (!binding) return false;
				return binding.toLowerCase() === key.toLowerCase();
			};

			if (match(bindings.endTurn)) {
				e.preventDefault();
				const gs = useGameStore.getState();
				if (gs.gameState?.currentTurn === 'player' && gs.gameState?.gamePhase === 'playing') {
					dispatchGameCommand({ type: GAME_COMMAND_TYPES.endTurn });
				}
			} else if (match(bindings.useHeroPower)) {
				e.preventDefault();
				const gs = useGameStore.getState();
				if (gs.gameState?.currentTurn === 'player' && gs.gameState?.gamePhase === 'playing') {
					dispatchGameCommand({ type: GAME_COMMAND_TYPES.useHeroPower });
				}
			} else if (match(bindings.showGameLog)) {
				e.preventDefault();
				onToggleGameLog?.();
			} else if (match(bindings.toggleFullscreen)) {
				e.preventDefault();
				if (document.fullscreenElement) {
					document.exitFullscreen().catch(() => {});
				} else {
					document.documentElement.requestFullscreen().catch(() => {});
				}
			}
			// concede keybinding reserved for future implementation
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [enabled, onToggleGameLog, dispatchGameCommand]);
}
