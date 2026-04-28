import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ArmySelection from '../ArmySelection';
import { useWarbandStore } from '../../../lib/stores/useWarbandStore';
import { routes } from '../../../lib/routes';
import type { ArmySelection as ArmySelectionType } from '../../types/ChessTypes';

const EMPTY_DECK: ReadonlyArray<number> = Object.freeze([]);

const WarbandPage: React.FC = () => {
	const navigate = useNavigate();
	const setWarband = useWarbandStore((s) => s.setWarband);

	const handleComplete = useCallback(
		(army: ArmySelectionType) => {
			setWarband(army, EMPTY_DECK);
			navigate(routes.game);
		},
		[setWarband, navigate]
	);

	const handleQuickStart = useCallback(
		(army: ArmySelectionType, deckCardIds: number[]) => {
			setWarband(army, deckCardIds);
			navigate(routes.game);
		},
		[setWarband, navigate]
	);

	const handleBack = useCallback(() => {
		navigate(routes.home);
	}, [navigate]);

	return (
		<ArmySelection
			onComplete={handleComplete}
			onQuickStart={handleQuickStart}
			onBack={handleBack}
		/>
	);
};

export default WarbandPage;
