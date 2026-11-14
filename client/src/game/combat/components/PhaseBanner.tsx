import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CombatPhase } from '../../types/PokerCombatTypes';
import { ARENA_VFX_LAYERS, getArenaVfxLayer } from '../arenaVfxTargets';
import { useArenaVfxRoot } from '../arenaVfxContext';
import { CINEMA_READ_MS } from '../feedback/combatFeedback';
import { useCombatFeedbackStore } from '../feedback/combatFeedbackStore';
import { PHASE_BANNER_CINEMA_HOLDER } from '../openingReadGate';
import '../styles/poker-drama.css';

const PHASE_CINEMA_HOLDER = PHASE_BANNER_CINEMA_HOLDER;
const PHASE_BANNER_ENTER_MS = 350;
/** Entrance plus the sharp read. The exit starts after this. */
export const PHASE_BANNER_VISIBLE_MS = PHASE_BANNER_ENTER_MS + CINEMA_READ_MS;

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
		state.cinemaHolders.some((id) => id !== PHASE_CINEMA_HOLDER),
	);

	const clearAllTimers = () => {
		timersRef.current.forEach(t => clearTimeout(t));
		timersRef.current = [];
	};

	const releasePhaseCinema = () => {
		useCombatFeedbackStore.getState().releaseCinema(PHASE_CINEMA_HOLDER);
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
		useCombatFeedbackStore.getState().holdCinema(PHASE_CINEMA_HOLDER);

		const hideTimer = setTimeout(() => {
			setIsVisible(false);
			const removeTimer = setTimeout(() => {
				setShowBanner(false);
				setBannerData(null);
				releasePhaseCinema();
			}, 160);
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
			useCombatFeedbackStore.getState().releaseCinema(PHASE_CINEMA_HOLDER);
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
			<div className="phase-banner-content">
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
