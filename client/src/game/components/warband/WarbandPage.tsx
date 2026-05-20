import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ArmySelection from '../ArmySelection';
import { useWarbandStore } from '../../../lib/stores/useWarbandStore';
import { routes } from '../../../lib/routes';
import type { ArmySelection as ArmySelectionType } from '../../types/ChessTypes';
import { buildReadyWarbandLoadout } from '../../deck/readyWarbandLoadout';

const WarbandPage: React.FC = () => {
	const navigate = useNavigate();
	const setWarband = useWarbandStore((s) => s.setWarband);

	const handleComplete = useCallback(
		(army: ArmySelectionType) => {
			const loadout = buildReadyWarbandLoadout(army);
			if (loadout.kind !== 'ready') return;
			setWarband(army, loadout.deckCardIds, loadout.deckCardIdsByPiece);
			navigate(routes.singleGame);
		},
		[setWarband, navigate]
	);

	const handleQuickStart = useCallback(
		(army: ArmySelectionType, deckCardIds: number[]) => {
			setWarband(army, deckCardIds);
			navigate(routes.singleGame);
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
