import { useState, useRef, useEffect } from 'react';

interface UseHeroHealthEffectsParams {
	playerHeroHealth: number;
	opponentHeroHealth: number;
}

export function useHeroHealthEffects({ playerHeroHealth, opponentHeroHealth }: UseHeroHealthEffectsParams) {
	const [outerShakeClass, setOuterShakeClass] = useState('');
	const outerShakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const prevHeroHealthRef = useRef<{ player: number; opponent: number } | null>(null);

	useEffect(() => {
		const curr = { player: playerHeroHealth, opponent: opponentHeroHealth };
		const prev = prevHeroHealthRef.current;
		if (prev) {
			const playerDmg = prev.player - curr.player;
			const opponentDmg = prev.opponent - curr.opponent;
			const maxDmg = Math.max(playerDmg, opponentDmg);
			if (maxDmg >= 5) {
				const cls = maxDmg >= 8 ? 'screen-shake-strong' : 'screen-shake-mild';
				setOuterShakeClass(cls);
				if (outerShakeTimeoutRef.current) clearTimeout(outerShakeTimeoutRef.current);
				outerShakeTimeoutRef.current = setTimeout(() => setOuterShakeClass(''), 350);
			}
		}
		prevHeroHealthRef.current = curr;
	}, [playerHeroHealth, opponentHeroHealth]);

	useEffect(() => {
		return () => {
			if (outerShakeTimeoutRef.current) clearTimeout(outerShakeTimeoutRef.current);
		};
	}, []);

	return { outerShakeClass };
}
