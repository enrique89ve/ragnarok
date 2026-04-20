/**
 * CosmicCanvas — GPU-accelerated cosmic background for the campaign map.
 *
 * Layers (bottom → top):
 *   1. Deep star field   (2000 sprites, slow parallax)
 *   2. Nebula clouds     (30 large additive sprites, realm-colored, orbiting)
 *   3. Mid star field    (500 sprites, medium parallax)
 *   4. Cosmic dust       (200 tiny sprites drifting)
 *   5. Bifrost beams     (particles traveling along realm connections)
 *   6. Near star field   (80 bright sprites, fast parallax)
 *
 * All rendering uses Pixi v8 with additive blending for glow.
 * Mouse movement shifts layers at different rates for parallax depth.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { Application, Container, Graphics } from 'pixi.js';

/* ── Star layer config ── */

interface StarLayer {
	count: number;
	sizeRange: [number, number];
	alphaRange: [number, number];
	speed: number;       // parallax multiplier
	twinkleSpeed: number;
}

const STAR_LAYERS: StarLayer[] = [
	{ count: 1500, sizeRange: [0.5, 1.5], alphaRange: [0.15, 0.45], speed: 0.015, twinkleSpeed: 0.3 },
	{ count: 400,  sizeRange: [1, 2.5],   alphaRange: [0.3, 0.6],  speed: 0.04,  twinkleSpeed: 0.5 },
	{ count: 60,   sizeRange: [2, 4],     alphaRange: [0.5, 0.9],  speed: 0.08,  twinkleSpeed: 0.7 },
];

/* ── Nebula config ── */

interface NebulaCloud {
	gfx: Graphics;
	baseX: number;
	baseY: number;
	angle: number;
	orbitRadius: number;
	orbitSpeed: number;
}

/* ── Bifrost flow particle ── */

interface FlowParticle {
	gfx: Graphics;
	t: number;
	speed: number;
	x1: number; y1: number;
	x2: number; y2: number;
	cx: number; cy: number;
	color: number;
}

/* ── Component ── */

interface CosmicCanvasRealm {
	position: { x: number; y: number };
	color: string;
}

interface CosmicCanvasProps {
	realms: CosmicCanvasRealm[];
	connections: { x1: number; y1: number; x2: number; y2: number; color1: string; color2: string; active: boolean }[];
	className?: string;
}

function hexToNum(hex: string): number {
	return parseInt(hex.replace('#', ''), 16);
}

function lerpColor(a: number, b: number, t: number): number {
	const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
	const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
	const r = Math.round(ar + (br - ar) * t);
	const g = Math.round(ag + (bg - ag) * t);
	const bv = Math.round(ab + (bb - ab) * t);
	return (r << 16) | (g << 8) | bv;
}

function quadBezier(t: number, p0: number, cp: number, p1: number): number {
	const mt = 1 - t;
	return mt * mt * p0 + 2 * mt * t * cp + t * t * p1;
}

export default function CosmicCanvas({ realms, connections, className }: CosmicCanvasProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const appRef = useRef<Application | null>(null);
	const mouseRef = useRef({ x: 0.5, y: 0.5 }); // normalized 0-1
	const starDataRef = useRef<{ gfx: Graphics[]; baseX: number[]; baseY: number[]; phase: number[]; layer: StarLayer }[]>([]);
	const nebulaRef = useRef<NebulaCloud[]>([]);
	const dustRef = useRef<{ gfx: Graphics[]; baseX: number[]; baseY: number[] }>();
	const flowRef = useRef<FlowParticle[]>([]);
	const animFrameRef = useRef<number>(0);

	const initApp = useCallback(async () => {
		if (!containerRef.current) return;
		const el = containerRef.current;
		const w = el.clientWidth;
		const h = el.clientHeight;
		if (w === 0 || h === 0) return;

		const app = new Application();
		await app.init({
			width: w,
			height: h,
			backgroundAlpha: 0,
			antialias: false,
			resolution: Math.min(window.devicePixelRatio, 1.5),
			autoDensity: true,
		});
		el.appendChild(app.canvas as HTMLCanvasElement);
		appRef.current = app;

		// ── Star layers (Graphics circles) ──
		for (const layer of STAR_LAYERS) {
			const container = new Container();
			const gfxArr: Graphics[] = [];
			const baseX: number[] = [];
			const baseY: number[] = [];
			const phase: number[] = [];

			for (let i = 0; i < layer.count; i++) {
				const sz = layer.sizeRange[0] + Math.random() * (layer.sizeRange[1] - layer.sizeRange[0]);
				const roll = Math.random();
				const color = roll < 0.1 ? 0xaaccff : roll < 0.18 ? 0xffddaa : roll < 0.22 ? 0xffaaaa : 0xffffff;

				const g = new Graphics();
				g.circle(0, 0, sz);
				g.fill(color);
				g.alpha = layer.alphaRange[0] + Math.random() * (layer.alphaRange[1] - layer.alphaRange[0]);
				const bx = Math.random() * w;
				const by = Math.random() * h;
				g.position.set(bx, by);

				container.addChild(g);
				gfxArr.push(g);
				baseX.push(bx);
				baseY.push(by);
				phase.push(Math.random() * Math.PI * 2);
			}
			app.stage.addChild(container);
			starDataRef.current.push({ gfx: gfxArr, baseX, baseY, phase, layer });
		}

		// ── Nebula clouds (large soft-edged circles with additive blend) ──
		const nebulaContainer = new Container();
		nebulaContainer.alpha = 0.18;
		const nebulaClouds: NebulaCloud[] = [];

		const nebulaPositions: { x: number; y: number; color: number }[] = [];
		for (const realm of realms) {
			nebulaPositions.push({
				x: (realm.position.x / 100) * w,
				y: (realm.position.y / 100) * h,
				color: hexToNum(realm.color),
			});
		}

		for (const pos of nebulaPositions) {
			const count = 1;
			for (let j = 0; j < count; j++) {
				const radius = 50 + Math.random() * 80;
				const g = new Graphics();
				const steps = 5;
				for (let s = steps; s >= 0; s--) {
					const frac = s / steps;
					const a = frac < 0.3 ? frac / 0.3 : 1 - (frac - 0.3) / 0.7;
					g.circle(0, 0, radius * frac + 1);
					g.fill({ color: pos.color, alpha: a * 0.08 });
				}
				g.blendMode = 'add';
				const angle = Math.random() * Math.PI * 2;
				const orbitR = 15 + Math.random() * 40;
				g.position.set(pos.x + Math.cos(angle) * orbitR, pos.y + Math.sin(angle) * orbitR);

				nebulaContainer.addChild(g);
				nebulaClouds.push({
					gfx: g,
					baseX: pos.x,
					baseY: pos.y,
					angle,
					orbitRadius: orbitR,
					orbitSpeed: 0.0002 + Math.random() * 0.0003,
				});
			}
		}
		app.stage.addChildAt(nebulaContainer, 1);
		nebulaRef.current = nebulaClouds;

		// ── Cosmic dust ──
		const dustContainer = new Container();
		const dustGfx: Graphics[] = [];
		const dustBaseX: number[] = [];
		const dustBaseY: number[] = [];
		for (let i = 0; i < 150; i++) {
			const g = new Graphics();
			g.circle(0, 0, 0.8);
			g.fill(0xaabbcc);
			g.alpha = 0.06 + Math.random() * 0.1;
			g.blendMode = 'add';
			const bx = Math.random() * w;
			const by = Math.random() * h;
			g.position.set(bx, by);
			dustContainer.addChild(g);
			dustGfx.push(g);
			dustBaseX.push(bx);
			dustBaseY.push(by);
		}
		app.stage.addChild(dustContainer);
		dustRef.current = { gfx: dustGfx, baseX: dustBaseX, baseY: dustBaseY };

		// ── Bifrost flow particles ──
		const flowContainer = new Container();
		const flowParticles: FlowParticle[] = [];

		for (const conn of connections) {
			const particleCount = conn.active ? 10 : 3;
			const x1 = (conn.x1 / 100) * w;
			const y1 = (conn.y1 / 100) * h;
			const x2 = (conn.x2 / 100) * w;
			const y2 = (conn.y2 / 100) * h;
			const mx = (x1 + x2) / 2;
			const my = (y1 + y2) / 2;
			const dx = x2 - x1;
			const dy = y2 - y1;
			const len = Math.sqrt(dx * dx + dy * dy) || 1;
			const perpX = -dy / len;
			const perpY = dx / len;
			const curveOffset = (Math.random() - 0.5) * len * 0.15;
			const cx = mx + perpX * curveOffset;
			const cy = my + perpY * curveOffset;

			const c1 = hexToNum(conn.color1);
			const c2 = hexToNum(conn.color2);

			for (let i = 0; i < particleCount; i++) {
				const t = Math.random();
				const color = lerpColor(c1, c2, t);
				const sz = conn.active ? 2 + Math.random() * 2 : 1 + Math.random();
				const g = new Graphics();
				g.circle(0, 0, sz);
				g.fill(color);
				g.blendMode = 'add';
				g.alpha = 0;
				flowContainer.addChild(g);
				flowParticles.push({
					gfx: g, t,
					speed: (0.12 + Math.random() * 0.18) * (conn.active ? 1 : 0.4),
					x1, y1, x2, y2, cx, cy, color,
				});
			}
		}
		app.stage.addChild(flowContainer);
		flowRef.current = flowParticles;

		return app;
	}, [realms, connections]);

	// ── Animation loop ──
	useEffect(() => {
		let app: Application | null = null;
		let destroyed = false;

		(async () => {
			app = await initApp() ?? null;
			if (destroyed || !app) return;

			let time = 0;
			const tick = () => {
				if (destroyed) return;
				time += 0.016;
				const mx = mouseRef.current.x;
				const my = mouseRef.current.y;
				const w = app!.screen.width;
				const h = app!.screen.height;

				// Parallax star layers
				for (const data of starDataRef.current) {
					const speed = data.layer.speed;
					const offsetX = (mx - 0.5) * w * speed;
					const offsetY = (my - 0.5) * h * speed;
					for (let i = 0; i < data.gfx.length; i++) {
						data.gfx[i].position.set(
							data.baseX[i] + offsetX,
							data.baseY[i] + offsetY,
						);
						const twinkle = Math.sin(time * data.layer.twinkleSpeed + data.phase[i]);
						data.gfx[i].alpha = data.layer.alphaRange[0] + (data.layer.alphaRange[1] - data.layer.alphaRange[0]) * (0.5 + twinkle * 0.5);
					}
				}

				// Nebula orbit
				for (const cloud of nebulaRef.current) {
					cloud.angle += cloud.orbitSpeed;
					const px = (mx - 0.5) * w * 0.03;
					const py = (my - 0.5) * h * 0.03;
					cloud.gfx.position.set(
						cloud.baseX + Math.cos(cloud.angle) * cloud.orbitRadius + px,
						cloud.baseY + Math.sin(cloud.angle) * cloud.orbitRadius + py,
					);
				}

				// Cosmic dust drift
				if (dustRef.current) {
					const d = dustRef.current;
					for (let i = 0; i < d.gfx.length; i++) {
						const drift = time * 3 + i * 47;
						d.gfx[i].position.set(
							((d.baseX[i] + drift * 0.15) % (w + 20)) - 10,
							((d.baseY[i] + Math.sin(drift * 0.02 + i) * 10) % (h + 20)) - 10,
						);
					}
				}

				// Bifrost flow particles
				for (const p of flowRef.current) {
					p.t += p.speed * 0.016;
					if (p.t > 1) p.t -= 1;
					const px = quadBezier(p.t, p.x1, p.cx, p.x2);
					const py = quadBezier(p.t, p.y1, p.cy, p.y2);
					p.gfx.position.set(px, py);
					p.gfx.alpha = 0.15 + 0.55 * Math.sin(p.t * Math.PI);
				}

				animFrameRef.current = requestAnimationFrame(tick);
			};
			animFrameRef.current = requestAnimationFrame(tick);
		})();

		return () => {
			destroyed = true;
			cancelAnimationFrame(animFrameRef.current);
			if (app) {
				app.destroy(true, { children: true, texture: true });
			}
			appRef.current = null;
			starDataRef.current = [];
			nebulaRef.current = [];
			dustRef.current = undefined;
			flowRef.current = [];
		};
	}, [initApp]);

	// ── Mouse tracking ──
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const onMove = (e: MouseEvent) => {
			const rect = el.getBoundingClientRect();
			mouseRef.current.x = (e.clientX - rect.left) / rect.width;
			mouseRef.current.y = (e.clientY - rect.top) / rect.height;
		};
		el.addEventListener('mousemove', onMove, { passive: true });
		return () => el.removeEventListener('mousemove', onMove);
	}, []);

	// ── Resize ──
	useEffect(() => {
		const onResize = () => {
			const app = appRef.current;
			const el = containerRef.current;
			if (!app || !el) return;
			app.renderer.resize(el.clientWidth, el.clientHeight);
		};
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);

	return (
		<div
			ref={containerRef}
			className={className}
			style={{
				position: 'absolute',
				inset: 0,
				zIndex: 0,
				pointerEvents: 'none',
				overflow: 'hidden',
			}}
		/>
	);
}
