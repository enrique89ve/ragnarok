import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { EmberField } from '../transitions/EmberField';
import { MulliganDealRowFx } from './MulliganDealRowFx';
import {
	MULLIGAN_OVERLAY_CLASS,
	MULLIGAN_SUBTITLE_CLASS,
	MULLIGAN_TITLE_CLASS,
} from './mulliganOverlayTokens';
import { ARENA_VFX_LAYERS, getArenaVfxLayer } from '../../combat/arenaVfxTargets';
import { useArenaVfxRoot } from '../../combat/arenaVfxContext';
import { MULLIGAN_LOL } from './mulliganLolTiming';
import '../mulligan.css';

export type MulliganApproachOverlayProps = {
	readonly subtitle?: string;
	readonly slotCount?: number;
	readonly disableMotion?: boolean;
	readonly pointerEvents?: 'auto' | 'none';
	/** LoL bridge: title + 3 backs only, no extra loading copy */
	readonly compact?: boolean;
};

const MulliganApproachOverlaySurface: React.FC<MulliganApproachOverlayProps> = ({
	subtitle = 'Dealing your opening hand…',
	slotCount = 3,
	disableMotion = false,
	pointerEvents = 'auto',
	compact = true,
}) => (
	<motion.div
		className={`mulligan-approach-overlay ${compact ? 'mulligan-approach-overlay--compact' : ''} ${MULLIGAN_OVERLAY_CLASS}`}
		style={{ pointerEvents }}
		role="status"
		aria-live="polite"
		aria-busy="true"
		initial={disableMotion ? false : { opacity: 0.88 }}
		animate={{ opacity: 1 }}
		transition={{ duration: MULLIGAN_LOL.approachFadeS, ease: 'easeOut' }}
	>
		<EmberField disableMotion={disableMotion} />
		{!compact && <div className="mulligan-approach-portal-ring" aria-hidden="true" />}
		<div className="mulligan-approach-sweep" aria-hidden="true" />
		<div className="relative z-2 w-full max-w-255 px-4 text-center">
			<h2 className={MULLIGAN_TITLE_CLASS}>Mulligan</h2>
			{!compact && (
				<p className={`${MULLIGAN_SUBTITLE_CLASS} mb-8`}>{subtitle}</p>
			)}
			<div className={`mulligan-deal-row mulligan-approach-deal-row ${compact ? 'mt-2' : ''}`}>
				<MulliganDealRowFx slotCount={slotCount} visible />
			</div>
		</div>
	</motion.div>
);

/** Full-screen bridge while card mulligan assets / arena modal layer spin up. */
export const MulliganApproachOverlay: React.FC<MulliganApproachOverlayProps> = (props) => {
	const arenaRoot = useArenaVfxRoot();
	const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

	useEffect(() => {
		const resolve = () => {
			const modal = arenaRoot
				? getArenaVfxLayer(ARENA_VFX_LAYERS.modal, arenaRoot)
				: getArenaVfxLayer(ARENA_VFX_LAYERS.modal);
			if (modal) {
				setPortalTarget(modal);
				return;
			}
			if (typeof document !== 'undefined') {
				setPortalTarget(document.body);
			}
		};
		resolve();
		const raf = window.requestAnimationFrame(resolve);
		const retry = window.setTimeout(resolve, 48);
		return () => {
			window.cancelAnimationFrame(raf);
			window.clearTimeout(retry);
		};
	}, [arenaRoot]);

	if (!portalTarget) return null;

	const surface = <MulliganApproachOverlaySurface {...props} />;
	const useBodyFallback = portalTarget === document.body;

	if (useBodyFallback) {
		return createPortal(
			<div className="mulligan-approach-fallback fixed inset-0 z-[1200]">{surface}</div>,
			portalTarget,
		);
	}

	return createPortal(surface, portalTarget);
};
