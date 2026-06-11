/**
 * Direction 3 — SVG + PixiJS v8 foil overlay.
 *
 * Renders FrameSvgOnly underneath, then mounts a transparent PixiJS
 * Application on top of the SVG bounding box. The overlay renders
 * 8 rarity-tinted shimmer particles that follow a slow lissajous
 * trajectory via gsap, producing a moving-foil illusion. For common /
 * rare, the canvas stays empty (overlay still mounted to keep the
 * layout consistent — destroyApp on unmount prevents context leak).
 *
 * Pixi v8 API used: `new Application()` + `app.init({...})`,
 * `app.canvas` as HTMLCanvasElement, `new Graphics()` with chained
 * `.circle().fill(color)`, `app.destroy(true, { children: true })`.
 * The webglContextFix helper is intentionally NOT used here — the
 * lab is local to this page and tears down deterministically.
 */

import React, { useEffect, useRef } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import gsap from 'gsap';
import { getRarityColor } from '../../../utils/rarityUtils';
import type { Rarity } from '@shared/schemas/rarity';
import type { NorseElement } from '../../../types/NorseTypes';
import type { SimpleCardType } from '../../SimpleCard';
import { ELEMENT_BAND } from '../../../utils/art/elementBand';
import { FrameSvgOnly } from './FrameSvgOnly';

interface Props {
	card: { id: number; name: string; manaCost?: number; attack?: number; health?: number };
	rarity: Rarity;
	element: NorseElement;
	cardType: SimpleCardType;
	artPath: string;
}

const SHIMMER_COUNT = 8;

export const FrameSvgPixi: React.FC<Props> = ({ card, rarity, element, cardType, artPath }) => {
	const hostRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!hostRef.current) return;

		const host = hostRef.current;
		const width = host.clientWidth;
		const height = host.clientHeight;
		if (width === 0 || height === 0) return;

		const app = new Application();
		let destroyed = false;

		const cleanup = () => {
			if (destroyed) return;
			destroyed = true;
			try {
				app.destroy(true, { children: true });
			} catch {
				// Pixi sometimes throws on double-destroy; safe to ignore here.
			}
		};

		app
			.init({
				width,
				height,
				backgroundAlpha: 0,
				antialias: true,
				resolution: Math.min(window.devicePixelRatio || 1, 2),
				autoDensity: true,
			})
			.then(() => {
				if (destroyed) return;

				const canvas = app.canvas as HTMLCanvasElement;
				canvas.style.position = 'absolute';
				canvas.style.inset = '0';
				canvas.style.pointerEvents = 'none';
				canvas.setAttribute('aria-hidden', 'true');
				host.appendChild(canvas);

				// Only mythic/epic get visible shimmer. Others get a silent
				// overlay (canvas mounted, no particles added) so the layout
				// matches the other two directions.
				if (rarity !== 'mythic' && rarity !== 'epic') return;

				const layer = new Container();
				app.stage.addChild(layer);

				const baseColor = parseInt(getRarityColor(rarity).replace('#', ''), 16);
				const band = ELEMENT_BAND[element];
				const tintColor = parseInt(band.from.replace('#', ''), 16);

				const particles: Graphics[] = [];
				for (let i = 0; i < SHIMMER_COUNT; i++) {
					const g = new Graphics();
					const radius = 18 + (i % 3) * 6;
					g.circle(0, 0, radius);
					g.fill({ color: i % 2 === 0 ? baseColor : tintColor, alpha: 0.18 });
					layer.addChild(g);
					particles.push(g);
				}

				particles.forEach((g, i) => {
					const phase = (i / SHIMMER_COUNT) * Math.PI * 2;
					const xCenter = width / 2;
					const yCenter = height / 2;
					const ampX = width * 0.35;
					const ampY = height * 0.30;

					gsap.to(g, {
						x: () => xCenter + Math.cos(phase + performance.now() * 0.001) * ampX,
						y: () => yCenter + Math.sin(phase * 1.3 + performance.now() * 0.0012) * ampY,
						duration: 0,
						repeat: -1,
						ease: 'none',
					});

					gsap.to(g, {
						alpha: 0.35,
						duration: 1.4 + (i % 4) * 0.2,
						yoyo: true,
						repeat: -1,
						ease: 'sine.inOut',
					});
				});
			})
			.catch(() => {
				// Pixi init can fail (headless, webgl-disabled). Silent — the
				// SVG underneath is still readable.
				cleanup();
			});

		return () => {
			cleanup();
		};
		// Re-run only when the rendered card identity changes.
	}, [card.id, rarity, element, cardType]);

	return (
		<div className="cardlab-frame-pixi" ref={hostRef} data-rarity={rarity}>
			<FrameSvgOnly card={card} rarity={rarity} element={element} cardType={cardType} artPath={artPath} />
		</div>
	);
};
