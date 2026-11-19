import React from 'react';
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
import '../mulligan.css';

export type MulliganApproachOverlayProps = {
	readonly subtitle?: string;
	readonly slotCount?: number;
	readonly disableMotion?: boolean;
	readonly pointerEvents?: 'auto' | 'none';
	/** LoL bridge: title + 3 backs only, no extra loading copy */
	readonly compact?: boolean;
};

export const MulliganApproachOverlaySurface: React.FC<MulliganApproachOverlayProps> = ({
	subtitle = 'Dealing your opening hand…',
	slotCount = 3,
	disableMotion = false,
	pointerEvents = 'auto',
	compact = true,
}) => (
	<motion.div
		className={`mulligan-approach-overlay mulligan-chamber--backdrop-host opening-hand-backdrop-layer opening-hand-backdrop-layer--chamber ${compact ? 'mulligan-approach-overlay--compact' : ''} ${MULLIGAN_OVERLAY_CLASS}`}
		style={{ pointerEvents }}
		role="status"
		aria-live="polite"
		aria-busy="true"
		initial={false}
		animate={{ opacity: 1 }}
	>
		<EmberField disableMotion={disableMotion} />
		{!compact && <div className="mulligan-approach-portal-ring" aria-hidden="true" />}
		<div className="mulligan-approach-sweep" aria-hidden="true" />
		<div className="relative z-2 w-full max-w-255 px-4 text-center">
			<h2 className={MULLIGAN_TITLE_CLASS}>Mulligan</h2>
			{!compact && (
				<p className={`${MULLIGAN_SUBTITLE_CLASS} mb-8`}>{subtitle}</p>
			)}
			{!compact && (
				<div className="mulligan-deal-row mulligan-approach-deal-row">
					<MulliganDealRowFx slotCount={slotCount} visible />
				</div>
			)}
		</div>
	</motion.div>
);

/** Deal-bridge overlay. Portals only into `#arena-layer-modal`; skip if that layer is not mounted. */
export const MulliganApproachOverlay: React.FC<MulliganApproachOverlayProps> = (props) => {
	const arenaRoot = useArenaVfxRoot();
	const portalTarget = arenaRoot
		? getArenaVfxLayer(ARENA_VFX_LAYERS.modal, arenaRoot)
		: null;
	if (!portalTarget) return null;
	return createPortal(<MulliganApproachOverlaySurface {...props} />, portalTarget);
};
