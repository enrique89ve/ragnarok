import { useState, useEffect } from 'react';
import { Position } from '../types/Position';
import { CardInstance } from '../types';
import { useGameStore } from '../stores/gameStore';
import { useAudio } from '../../lib/stores/useAudio';
import { useGameNotifications } from './useGameNotifications';
import { isSpell, isMinion } from '../utils/cards/typeGuards';
import { hasBattlecry } from '../utils/cards/typeGuards';
import { debug } from '../config/debugConfig';

export function useTargetingArrows() {
	const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 });
	const [showTargetingArrow, setShowTargetingArrow] = useState(false);
	const [arrowStartPosition, setArrowStartPosition] = useState<Position>({ x: 0, y: 0 });
	const [validTargets, setValidTargets] = useState<string[]>([]);

	const selectedCard = useGameStore(state => state.selectedCard);
	const selectCard = useGameStore(state => state.selectCard);
	const { playSoundEffect } = useAudio();
	const { showNotification } = useGameNotifications();

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			setMousePosition({ x: e.clientX, y: e.clientY });
		};

		window.addEventListener('mousemove', handleMouseMove);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
		};
	}, []);

	useEffect(() => {
		const handleRightClick = (e: MouseEvent) => {
			const hasSpellTargeting = selectedCard && isSpell(selectedCard.card) && selectedCard.card.spellEffect?.requiresTarget;
			const hasBattlecryTargeting = selectedCard && isMinion(selectedCard.card) && selectedCard.card.battlecry?.requiresTarget;

			if ((showTargetingArrow && selectedCard) || hasSpellTargeting || hasBattlecryTargeting) {
				e.preventDefault();

				debug.log('[TARGETING] Right-click detected, cancelling targeting mode');

				selectCard(null);
				setShowTargetingArrow(false);
				setValidTargets([]);

				playSoundEffect('button_click');

				showNotification({
					title: 'Targeting Cancelled',
					description: 'Spell targeting has been cancelled',
					type: 'info',
					duration: 1500
				});
			}
		};

		document.addEventListener('contextmenu', handleRightClick);

		return () => {
			document.removeEventListener('contextmenu', handleRightClick);
		};
	}, [showTargetingArrow, selectedCard, selectCard, playSoundEffect, showNotification]);

	useEffect(() => {
		const handleDocumentClick = (e: MouseEvent) => {
			if (showTargetingArrow && selectedCard) {
				debug.log('[TARGETING] Document click detected, checking if we should cancel targeting');

				const clickedElement = e.target as Element;
				const isClickOnCard = clickedElement?.closest('.card, .minion, .hero, .player-minion, .opponent-minion, .player-hero, .opponent-hero, .target-highlight');
				const isClickOnTargetingUI = clickedElement?.closest('.targeting-arrow, .target-highlight, .battlefield, .player-battlefield, .opponent-battlefield');
				const cardElement = clickedElement?.closest('[data-card-id]');
				const clickedCardId = cardElement?.getAttribute('data-card-id');
				const isValidTargetCard = clickedCardId && validTargets.includes(clickedCardId);

				if (isClickOnCard) {
					debug.log('[TARGETING] Click was detected on a card element:', clickedElement?.className);
					if (clickedCardId) {
						debug.log('[TARGETING] Clicked card ID:', clickedCardId, 'Valid target?', isValidTargetCard);
					}
				}
				if (isClickOnTargetingUI) {
					debug.log('[TARGETING] Click was detected on targeting UI or battlefield:', clickedElement?.className);
				}

				if (isClickOnCard || isClickOnTargetingUI || isValidTargetCard) {
					debug.log('[TARGETING] Click was on a card, targeting UI, or battlefield - not canceling targeting');
					return;
				}

				debug.log('[TARGETING] Click was outside valid targets, canceling targeting');
				setShowTargetingArrow(false);
				selectCard(null);

				showNotification({
					title: `Targeting Canceled`,
					description: `Spell targeting has been canceled.`,
					type: 'info',
					duration: 2000
				});
			}
		};

		document.addEventListener('click', handleDocumentClick);

		return () => {
			document.removeEventListener('click', handleDocumentClick);
		};
	}, [showTargetingArrow, selectedCard, selectCard, showNotification, validTargets]);

	useEffect(() => {
		if (!selectedCard) {
			setShowTargetingArrow(false);
			setValidTargets([]);
		}
	}, [selectedCard]);

	return {
		mousePosition,
		showTargetingArrow,
		setShowTargetingArrow,
		arrowStartPosition,
		setArrowStartPosition,
		validTargets,
		setValidTargets
	};
}
