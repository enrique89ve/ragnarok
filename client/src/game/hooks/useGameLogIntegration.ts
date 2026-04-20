import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useGameLogStore } from '../stores/gameLogStore';

export function useGameLogIntegration() {
	const gameState = useGameStore(state => state.gameState);
	const addEntry = useGameLogStore(state => state.addEntry);
	const clearLog = useGameLogStore(state => state.clearLog);

	const prevTurnRef = useRef(0);
	const prevPlayerHandRef = useRef(0);
	const prevOpponentHandRef = useRef(0);
	const prevPlayerBfRef = useRef(0);
	const prevOpponentBfRef = useRef(0);
	const prevPlayerHealthRef = useRef(100);
	const prevOpponentHealthRef = useRef(100);

	useEffect(() => {
		if (!gameState) return;

		const turn = gameState.turnNumber || 0;
		const currentTurn = gameState.currentTurn;
		const player = gameState.players?.player;
		const opponent = gameState.players?.opponent;
		if (!player || !opponent) return;

		const playerHand = player.hand?.length || 0;
		const opponentHand = opponent.hand?.length || 0;
		const playerBf = player.battlefield?.length || 0;
		const opponentBf = opponent.battlefield?.length || 0;
		const playerHealth = player.heroHealth ?? player.health ?? 100;
		const opponentHealth = opponent.heroHealth ?? opponent.health ?? 100;

		if (turn > prevTurnRef.current && prevTurnRef.current > 0) {
			const actor = currentTurn === 'player' ? 'player' : 'opponent';
			addEntry({
				turn,
				actor: actor as 'player' | 'opponent',
				type: 'end_turn',
				message: `${actor === 'player' ? 'Your' : "Opponent's"} turn begins`
			});
		}

		if (playerHand > prevPlayerHandRef.current && prevPlayerHandRef.current > 0) {
			addEntry({ turn, actor: 'player', type: 'draw', message: 'You drew a card' });
		}
		if (opponentHand > prevOpponentHandRef.current && prevOpponentHandRef.current > 0) {
			addEntry({ turn, actor: 'opponent', type: 'draw', message: 'Opponent drew a card' });
		}

		if (playerBf > prevPlayerBfRef.current && playerHand < prevPlayerHandRef.current) {
			const newCard = player.battlefield?.[player.battlefield.length - 1];
			const name = newCard?.card?.name || 'a card';
			addEntry({ turn, actor: 'player', type: 'play_card', message: `You played ${name}`, details: { cardName: name } });
		}
		if (opponentBf > prevOpponentBfRef.current && opponentHand < prevOpponentHandRef.current) {
			const newCard = opponent.battlefield?.[opponent.battlefield.length - 1];
			const name = newCard?.card?.name || 'a card';
			addEntry({ turn, actor: 'opponent', type: 'play_card', message: `Opponent played ${name}`, details: { cardName: name } });
		}

		if (playerHealth < prevPlayerHealthRef.current && prevPlayerHealthRef.current > 0) {
			const dmg = prevPlayerHealthRef.current - playerHealth;
			addEntry({ turn, actor: 'opponent', type: 'damage', message: `Your hero took ${dmg} damage`, details: { amount: dmg } });
		}
		if (opponentHealth < prevOpponentHealthRef.current && prevOpponentHealthRef.current > 0) {
			const dmg = prevOpponentHealthRef.current - opponentHealth;
			addEntry({ turn, actor: 'player', type: 'damage', message: `Enemy hero took ${dmg} damage`, details: { amount: dmg } });
		}

		if (playerHealth > prevPlayerHealthRef.current) {
			const heal = playerHealth - prevPlayerHealthRef.current;
			addEntry({ turn, actor: 'player', type: 'heal', message: `Your hero healed for ${heal}`, details: { amount: heal } });
		}
		if (opponentHealth > prevOpponentHealthRef.current) {
			const heal = opponentHealth - prevOpponentHealthRef.current;
			addEntry({ turn, actor: 'opponent', type: 'heal', message: `Enemy hero healed for ${heal}`, details: { amount: heal } });
		}

		if (playerBf < prevPlayerBfRef.current && prevPlayerBfRef.current > 0) {
			const lost = prevPlayerBfRef.current - playerBf;
			addEntry({ turn, actor: 'player', type: 'death', message: `${lost} of your minion${lost > 1 ? 's' : ''} died` });
		}
		if (opponentBf < prevOpponentBfRef.current && prevOpponentBfRef.current > 0) {
			const lost = prevOpponentBfRef.current - opponentBf;
			addEntry({ turn, actor: 'opponent', type: 'death', message: `${lost} enemy minion${lost > 1 ? 's' : ''} died` });
		}

		prevTurnRef.current = turn;
		prevPlayerHandRef.current = playerHand;
		prevOpponentHandRef.current = opponentHand;
		prevPlayerBfRef.current = playerBf;
		prevOpponentBfRef.current = opponentBf;
		prevPlayerHealthRef.current = playerHealth;
		prevOpponentHealthRef.current = opponentHealth;
	}, [gameState, addEntry]);

	useEffect(() => {
		if (gameState?.gamePhase === 'playing' && prevTurnRef.current === 0) {
			clearLog();
		}
	}, [gameState?.gamePhase, clearLog]);
}
