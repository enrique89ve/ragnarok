import React, { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ArmySelection from '../ArmySelection';
import { useWarbandStore } from '../../../lib/stores/useWarbandStore';
import { routes } from '../../../lib/routes';
import {
	parseWarbandIntent,
	WARBAND_INTENT_QUERY_PARAM,
	type WarbandIntent,
} from '../../../lib/warbandRoutes';
import type { ArmySelection as ArmySelectionType } from '../../types/ChessTypes';
import { buildReadyWarbandLoadout } from '../../deck/readyWarbandLoadout';

const WarbandPage: React.FC = () => {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const rawIntent = searchParams.get(WARBAND_INTENT_QUERY_PARAM);
	const intent = parseWarbandIntent(rawIntent);
	const searchParamsKey = searchParams.toString();
	const setWarband = useWarbandStore((s) => s.setWarband);

	useEffect(() => {
		if (rawIntent === intent) return;
		const nextParams = new URLSearchParams(searchParamsKey);
		nextParams.set(WARBAND_INTENT_QUERY_PARAM, intent);
		setSearchParams(nextParams, { replace: true });
	}, [intent, rawIntent, searchParamsKey, setSearchParams]);

	const switchIntent = useCallback(
		(nextIntent: WarbandIntent) => {
			if (nextIntent === intent) return;
			const nextParams = new URLSearchParams(searchParamsKey);
			nextParams.set(WARBAND_INTENT_QUERY_PARAM, nextIntent);
			setSearchParams(nextParams, { replace: true });
		},
		[intent, searchParamsKey, setSearchParams],
	);

	const commitWarband = useCallback(
		(army: ArmySelectionType): boolean => {
			const loadout = buildReadyWarbandLoadout(army);
			if (loadout.kind !== 'ready') return false;
			setWarband(army, loadout.deckCardIds, loadout.deckCardIdsByPiece);
			return true;
		},
		[setWarband],
	);

	const handleComplete = useCallback(
		(army: ArmySelectionType) => {
			if (!commitWarband(army)) return;
			navigate(intent === 'multiplayer' ? routes.multiplayer : routes.singleGame);
		},
		[commitWarband, intent, navigate],
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

	const modeSwitch = (
		<div className="norse-warband-mode-switch" role="group" aria-label="Warband mode">
			<button
				type="button"
				className={intent === 'single' ? 'active' : ''}
				aria-pressed={intent === 'single'}
				onClick={() => switchIntent('single')}
			>
				Single
			</button>
			<button
				type="button"
				className={intent === 'multiplayer' ? 'active' : ''}
				aria-pressed={intent === 'multiplayer'}
				onClick={() => switchIntent('multiplayer')}
			>
				Multiplayer
			</button>
		</div>
	);

	return (
		<ArmySelection
			onComplete={handleComplete}
			onQuickStart={handleQuickStart}
			onBack={handleBack}
			isMultiplayer={intent === 'multiplayer'}
			onMatchmakingStart={handleComplete}
			modeSwitch={modeSwitch}
		/>
	);
};

export default WarbandPage;
