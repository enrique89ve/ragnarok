import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CombatPhase } from '../../types/PokerCombatTypes';
import { ARENA_VFX_LAYERS, getArenaVfxLayer } from '../arenaVfxTargets';
import { useArenaVfxRoot } from '../arenaVfxContext';
import {
	isCenterTitleBlocked,
	PHASE_BANNER_CINEMA_MS,
	PHASE_BANNER_CINEMA_HOLDER,
	PHASE_BANNER_EXIT_MS,
	PHASE_BANNER_VISIBLE_MS,
} from '../cinemaLanePolicy';
import {
	releaseCinemaHold,
	useCombatFeedbackStore,
} from '../feedback/combatFeedbackStore';
import { requestCenterTitle } from '@/game/effects/presentation/presentationOrchestrator';
import '../styles/poker-drama.css';

export { PHASE_BANNER_VISIBLE_MS };

const PHASE_CINEMA_HOLDER = PHASE_BANNER_CINEMA_HOLDER;

interface PhaseBannerProps {
	phase: CombatPhase;
	forceHide?: boolean;
}

const PHASE_CONFIG: Partial<Record<CombatPhase, { title: string; subtitle: string; key: string }>> = {
	[CombatPhase.PRE_FLOP]: { title: 'FIRST BLOOD', subtitle: 'Commit or cower', key: 'pre_flop' },
	[CombatPhase.FAITH]: { title: 'THE NORNS SPEAK', subtitle: 'Three fates revealed', key: 'faith' },
	[CombatPhase.FORESIGHT]: { title: 'THE VEIL THINS', subtitle: 'A fourth truth emerges', key: 'foresight' },
	[CombatPhase.DESTINY]: { title: "RAGNAROK'S EDGE", subtitle: 'The final judgment', key: 'destiny' },
};

export const PhaseBanner: React.FC<PhaseBannerProps> = ({ phase, forceHide = false }) => {
	const arenaRoot = useArenaVfxRoot();
	const [showBanner, setShowBanner] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [bannerData, setBannerData] = useState<{ title: string; subtitle: string; key: string } | null>(null);
	const prevPhaseRef = useRef<CombatPhase>(phase);
	const openedRef = useRef(false);
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
	const [queued, setQueued] = useState<{ title: string; subtitle: string; key: string } | null>(null);
	const centerBlocked = useCombatFeedbackStore((state) =>
		isCenterTitleBlocked(state.cinemaHolders, PHASE_CINEMA_HOLDER),
	);

	const clearAllTimers = () => {
		timersRef.current.forEach(t => clearTimeout(t));
		timersRef.current = [];
	};

	const releasePhaseCinema = () => {
		releaseCinemaHold(PHASE_CINEMA_HOLDER);
	};

	useEffect(() => {
		if (openedRef.current) return;
		openedRef.current = true;
		const config = PHASE_CONFIG[phase];
		if (!config) return;
		setQueued(config);
	}, [phase]);

	useEffect(() => {
		if (phase === prevPhaseRef.current) return;
		prevPhaseRef.current = phase;
		const config = PHASE_CONFIG[phase];
		if (!config) return;
		setQueued(config);
	}, [phase]);

	useEffect(() => {
		if (!queued || forceHide || centerBlocked) return;
		const config = queued;
		setQueued(null);
		clearAllTimers();
		setBannerData(config);
		setShowBanner(true);
		setIsVisible(true);
		requestCenterTitle(PHASE_CINEMA_HOLDER, PHASE_BANNER_CINEMA_MS);

		const hideTimer = setTimeout(() => {
			setIsVisible(false);
			const removeTimer = setTimeout(() => {
				setShowBanner(false);
				setBannerData(null);
				releasePhaseCinema();
			}, PHASE_BANNER_EXIT_MS);
			timersRef.current.push(removeTimer);
		}, PHASE_BANNER_VISIBLE_MS);
		timersRef.current.push(hideTimer);
	}, [queued, forceHide, centerBlocked]);

	useEffect(() => {
		if (forceHide) setQueued(null);
		if (!showBanner) return;
		if (!forceHide && !centerBlocked) return;
		clearAllTimers();
		setIsVisible(false);
		setShowBanner(false);
		setBannerData(null);
		releasePhaseCinema();
		if (centerBlocked && !forceHide && bannerData) setQueued(bannerData);
	}, [forceHide, centerBlocked, showBanner, bannerData]);

	useEffect(() => {
		return () => {
			clearAllTimers();
			releaseCinemaHold(PHASE_CINEMA_HOLDER);
		};
	}, []);

	if (!showBanner || !bannerData) return null;

	/*
	 * Portal into the dedicated VFX layer — see layered arena
	 * architecture in docs/POKER_ARENA_UI.md.  The VFX layer is
	 * `position: absolute; inset: 0` inside `.ragnarok-combat-arena`
	 * so the banner is bounded by the canvas, never escapes, never
	 * affects flex flow of the gameplay zones.
	 *
	 * If the layer is not mounted yet, skip the visual. Poker flow must not
	 * depend on this banner existing.
	 */
	const portalTarget =
		getArenaVfxLayer(ARENA_VFX_LAYERS.vfx, arenaRoot) ||
		null;

	const banner = (
		<div
			className={`phase-banner ${isVisible ? 'phase-banner-enter' : 'phase-banner-exit'}`}
			data-phase={bannerData.key}
			role="status"
			aria-live="polite"
			aria-label={`${bannerData.title}. ${bannerData.subtitle}`}
		>
			<div className="phase-banner-content cinema-lane-plate">
				<div className="phase-banner-line" />
				<div className="phase-banner-text">
					<span className="phase-banner-title">{bannerData.title}</span>
					<span className="phase-banner-subtitle">{bannerData.subtitle}</span>
				</div>
				<div className="phase-banner-line" />
			</div>
		</div>
	);

	return portalTarget ? createPortal(banner, portalTarget) : null;
};
