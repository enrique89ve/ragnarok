import React from 'react';
import { MulliganApproachOverlaySurface } from '../../mulligan/MulliganApproachOverlay';
import { useGameFlowStore } from '../../../stores/gameFlowStore';
import { useSettingsStore } from '../../../stores/settingsStore';

export type PokerCombatPhaseSuspenseFallbackProps = {
	readonly disableMotion?: boolean;
};

/** Fullscreen bridge while the lazy poker arena chunk loads — visual only. */
export const PokerCombatPhaseSuspenseFallback: React.FC<PokerCombatPhaseSuspenseFallbackProps> = ({
	disableMotion = false,
}) => (
	<div
		className="fixed inset-0 z-50 pointer-events-none"
		aria-busy="true"
		role="status"
		aria-live="polite"
	>
		<MulliganApproachOverlaySurface
			compact
			disableMotion={disableMotion}
			pointerEvents="none"
		/>
	</div>
);

/** Suspense fallback: approach UI only while entering poker_combat. */
export const CombatPhasesLazyFallback: React.FC = () => {
	const flowTag = useGameFlowStore(state => state.current?.tag);
	const animationsEnabled = useSettingsStore(state => state.animationsEnabled);
	const reduceMotion = useSettingsStore(state => state.reduceMotion);
	if (flowTag !== 'poker_combat') return null;
	return (
		<PokerCombatPhaseSuspenseFallback disableMotion={!animationsEnabled || reduceMotion} />
	);
};

export default PokerCombatPhaseSuspenseFallback;