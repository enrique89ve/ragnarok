import React from 'react';
import { CombatPhaseDirector } from './CombatPhaseDirector';
import { CombatPhase } from '../../types/PokerCombatTypes';

export interface WagerInfoPanelProps {
	readonly phase: CombatPhase;
	readonly phaseLabel: string;
	readonly headline: string;
	readonly body: string;
	readonly cue: string;
	readonly mode: 'setup' | 'wager' | 'resolution';
	readonly isPlayerTurn: boolean;
	readonly isWaiting: boolean;
	readonly pills?: ReadonlyArray<string>;
}

export const WagerInfoPanel: React.FC<WagerInfoPanelProps> = (props) => {
	return (
		<div
			className="absolute right-5 top-30 z-500 w-85 max-w-85"
			data-zone="wager-info-panel"
		>
			<CombatPhaseDirector {...props} pills={props.pills ? [...props.pills] : undefined} />
		</div>
	);
};

export default WagerInfoPanel;
