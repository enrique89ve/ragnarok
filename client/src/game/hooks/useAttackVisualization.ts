import { useState, useCallback, useRef } from 'react';
import { Position } from '../types/Position';

export function useAttackVisualization(battlefieldRef: React.RefObject<HTMLDivElement | null>) {
	const [attackCardPositions, setAttackCardPositions] = useState<Record<string, Position>>({});

	const getBoardCenter = useCallback((): Position => {
		if (battlefieldRef.current) {
			const rect = battlefieldRef.current.getBoundingClientRect();
			return {
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2
			};
		}
		return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
	}, [battlefieldRef]);

	const registerAttackCardPosition = useCallback((cardId: string, position: Position) => {
		setAttackCardPositions(prev => ({ ...prev, [cardId]: position }));
	}, []);

	const getCardPositionsMap = useCallback((): Record<string, Position> => {
		return attackCardPositions;
	}, [attackCardPositions]);

	const clearPositions = useCallback(() => {
		setAttackCardPositions({});
	}, []);

	return {
		attackCardPositions,
		getBoardCenter,
		registerAttackCardPosition,
		getCardPositionsMap,
		clearPositions
	};
}
