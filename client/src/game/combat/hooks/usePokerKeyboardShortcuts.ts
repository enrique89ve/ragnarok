import { useEffect, useRef } from 'react';
import { getActionPermissions, getPokerCombatAdapterState } from '../../hooks/usePokerCombatAdapter';
import { CombatAction, CombatPhase } from '../../types/PokerCombatTypes';

interface UsePokerKeyboardShortcutsParams {
	betAmount: number;
	onAction: (action: CombatAction, hp?: number) => void;
	setCommunityCardsRevealed: (val: boolean) => void;
}

export function usePokerKeyboardShortcuts({
	betAmount,
	onAction,
	setCommunityCardsRevealed,
}: UsePokerKeyboardShortcutsParams) {
	const betAmountRef = useRef(betAmount);
	const onActionRef = useRef(onAction);
	betAmountRef.current = betAmount;
	onActionRef.current = onAction;

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement ||
				(e.target as HTMLElement)?.isContentEditable) return;

			const currentState = getPokerCombatAdapterState().combatState;
			if (!currentState || currentState.player.isReady || currentState.phase === CombatPhase.MULLIGAN) return;

			const permissions = getActionPermissions(currentState, true);
			if (!permissions) return;

			const key = e.key.toLowerCase();
			const currentBet = betAmountRef.current;
			const action = (a: CombatAction, hp?: number) => {
				setCommunityCardsRevealed(true);
				onActionRef.current(a, hp);
			};

			switch (key) {
				case 'b':
					if (permissions.canBet && !permissions.hasBetToCall) {
						action(CombatAction.ATTACK, currentBet);
					} else if (permissions.canRaise && permissions.hasBetToCall) {
						action(CombatAction.COUNTER_ATTACK, currentBet);
					}
					break;
				case 'c':
					if (permissions.canCall) {
						action(CombatAction.ENGAGE);
					} else if (permissions.canCheck) {
						action(CombatAction.DEFEND);
					}
					break;
				case 'f':
					if (permissions.canFold) {
						action(CombatAction.BRACE);
					}
					break;
				case 'k':
					if (permissions.canCheck) {
						action(CombatAction.DEFEND);
					}
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [setCommunityCardsRevealed]);
}
