/**
 * CosmicCanvas — GPU-accelerated cosmic background for the campaign map.
 *
 * Layers (bottom → top):
 *   1. Deep star field   (subtle parallax)
 *   2. Realm nebula      (low-opacity realm tint)
 *   3. Route tunnels     (Pixi-drawn curved corridor pattern)
 *   4. Realm gates       (subtle orbital rings around each route node)
 *   5. Cosmic dust       (fine atmospheric drift)
 *   6. Bifrost flow      (small particles traveling along connections)
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
	{ count: 780, sizeRange: [0.4, 1.1], alphaRange: [0.05, 0.22], speed: 0.01, twinkleSpeed: 0.22 },
	{ count: 180, sizeRange: [0.8, 1.8], alphaRange: [0.08, 0.3],  speed: 0.025, twinkleSpeed: 0.36 },
	{ count: 24,  sizeRange: [1.4, 2.6], alphaRange: [0.16, 0.42], speed: 0.045, twinkleSpeed: 0.48 },
];

function getStarLayers(width: number): StarLayer[] {
	if (width < 520) {
		return STAR_LAYERS.map(layer => ({ ...layer, count: Math.max(24, Math.round(layer.count * 0.22)) }));
	}
	if (width < 900) {
		return STAR_LAYERS.map(layer => ({ ...layer, count: Math.max(36, Math.round(layer.count * 0.38)) }));
	}
	return STAR_LAYERS;
}

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

/* ── Route tunnel ribs ── */

interface TunnelRib {
	gfx: Graphics;
	t: number;
	speed: number;
	x1: number; y1: number;
	x2: number; y2: number;
	cx: number; cy: number;
	color: number;
	active: boolean;
	phase: number;
}

/* ── Realm orbital gates ── */

interface OrbitGate {
	gfx: Graphics;
	x: number;
	y: number;
	color: number;
	radius: number;
	phase: number;
	speed: number;
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

function tunnelPoint(t: number, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number): { x: number; y: number } {
	return {
		x: quadBezier(t, x1, cx, x2),
		y: quadBezier(t, y1, cy, y2),
	};
}

function tunnelTangent(t: number, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number): { x: number; y: number } {
	const mt = 1 - t;
	const dx = 2 * mt * (cx - x1) + 2 * t * (x2 - cx);
	const dy = 2 * mt * (cy - y1) + 2 * t * (y2 - cy);
	const len = Math.sqrt(dx * dx + dy * dy) || 1;
	return { x: dx / len, y: dy / len };
}

function drawTunnelCurve(
	g: Graphics,
	x1: number,
	y1: number,
	cx: number,
	cy: number,
	x2: number,
	y2: number,
	options: { width: number; color: number; alpha: number; offset?: number },
): void {
	g.clear();
	const samples = 28;
	for (let i = 0; i <= samples; i++) {
		const t = i / samples;
		const p = tunnelPoint(t, x1, y1, cx, cy, x2, y2);
		const tangent = tunnelTangent(t, x1, y1, cx, cy, x2, y2);
		const offset = options.offset ?? 0;
		const px = -tangent.y * offset;
		const py = tangent.x * offset;
		if (i === 0) {
			g.moveTo(p.x + px, p.y + py);
		} else {
			g.lineTo(p.x + px, p.y + py);
		}
	}
	g.stroke({ width: options.width, color: options.color, alpha: options.alpha });
}

function drawTunnelRib(rib: TunnelRib, time: number): void {
	const t = (rib.t + time * rib.speed) % 1;
	const p = tunnelPoint(t, rib.x1, rib.y1, rib.cx, rib.cy, rib.x2, rib.y2);
	const tangent = tunnelTangent(t, rib.x1, rib.y1, rib.cx, rib.cy, rib.x2, rib.y2);
	const px = -tangent.y;
	const py = tangent.x;
	const wave = 0.5 + 0.5 * Math.sin(time * 2.2 + rib.phase);
	const halfWidth = (rib.active ? 13 : 9) * (0.78 + wave * 0.2);
	const alpha = (rib.active ? 0.26 : 0.12) * (0.55 + wave * 0.45);

	rib.gfx.clear();
	rib.gfx.moveTo(p.x - px * halfWidth, p.y - py * halfWidth);
	rib.gfx.lineTo(p.x + px * halfWidth, p.y + py * halfWidth);
	rib.gfx.stroke({ width: rib.active ? 1.2 : 0.8, color: rib.color, alpha });
}

function drawArcSegment(
	g: Graphics,
	cx: number,
	cy: number,
	radius: number,
	start: number,
	end: number,
): void {
	const steps = 18;
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const angle = start + (end - start) * t;
		const x = cx + Math.cos(angle) * radius;
		const y = cy + Math.sin(angle) * radius;
		if (i === 0) {
			g.moveTo(x, y);
		} else {
			g.lineTo(x, y);
		}
	}
}

function drawOrbitGate(gate: OrbitGate, time: number): void {
	const angle = gate.phase + time * gate.speed;
	const pulse = 0.5 + 0.5 * Math.sin(time * 1.45 + gate.phase);
	const innerRadius = gate.radius * (0.82 + pulse * 0.025);
	const outerRadius = gate.radius * (1.08 + pulse * 0.018);
	const dotAngle = angle * 1.35;
	const dotX = gate.x + Math.cos(dotAngle) * outerRadius;
	const dotY = gate.y + Math.sin(dotAngle) * outerRadius;

	gate.gfx.clear();
	drawArcSegment(gate.gfx, gate.x, gate.y, innerRadius, angle, angle + Math.PI * 0.88);
	drawArcSegment(gate.gfx, gate.x, gate.y, innerRadius, angle + Math.PI * 1.18, angle + Math.PI * 1.78);
	gate.gfx.stroke({ width: 1, color: gate.color, alpha: 0.12 + pulse * 0.05 });
	drawArcSegment(gate.gfx, gate.x, gate.y, outerRadius, -angle * 0.72, -angle * 0.72 + Math.PI * 0.36);
	drawArcSegment(gate.gfx, gate.x, gate.y, outerRadius, -angle * 0.72 + Math.PI * 1.2, -angle * 0.72 + Math.PI * 1.64);
	gate.gfx.stroke({ width: 0.75, color: gate.color, alpha: 0.1 + pulse * 0.04 });
	gate.gfx.circle(dotX, dotY, 1.4 + pulse * 0.7);
	gate.gfx.fill({ color: gate.color, alpha: 0.18 + pulse * 0.12 });
}

export default function CosmicCanvas({ realms, connections, className }: CosmicCanvasProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const appRef = useRef<Application | null>(null);
	const mouseRef = useRef({ x: 0.5, y: 0.5 }); // normalized 0-1
	const starDataRef = useRef<{ gfx: Graphics[]; baseX: number[]; baseY: number[]; phase: number[]; layer: StarLayer }[]>([]);
	const nebulaRef = useRef<NebulaCloud[]>([]);
	const dustRef = useRef<{ gfx: Graphics[]; baseX: number[]; baseY: number[] }>();
	const flowRef = useRef<FlowParticle[]>([]);
	const tunnelRibsRef = useRef<TunnelRib[]>([]);
	const orbitGatesRef = useRef<OrbitGate[]>([]);
	const animFrameRef = useRef<number>(0);

	const initApp = useCallback(async () => {
		if (!containerRef.current) return;
		const el = containerRef.current;
		const w = el.clientWidth;
		const h = el.clientHeight;
		if (w === 0 || h === 0) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const starLayers = getStarLayers(w);

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
		for (const layer of starLayers) {
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
		nebulaContainer.alpha = 0.11;
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
				const radius = 44 + Math.random() * 64;
				const g = new Graphics();
				const steps = 5;
				for (let s = steps; s >= 0; s--) {
					const frac = s / steps;
					const a = frac < 0.3 ? frac / 0.3 : 1 - (frac - 0.3) / 0.7;
					g.circle(0, 0, radius * frac + 1);
					g.fill({ color: pos.color, alpha: a * 0.055 });
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

		// ── Route tunnel pattern (2D Pixi corridors) ──
		const tunnelContainer = new Container();
		tunnelContainer.alpha = 0.92;
		const tunnelRibs: TunnelRib[] = [];

		for (const conn of connections) {
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
			const curveOffset = Math.min(72, len * 0.12) * (conn.active ? 0.72 : 0.5);
			const direction = (x1 + y1 > x2 + y2 ? -1 : 1);
			const cx = mx + perpX * curveOffset * direction;
			const cy = my + perpY * curveOffset * direction;
			const c1 = hexToNum(conn.color1);
			const c2 = hexToNum(conn.color2);
			const routeColor = lerpColor(c1, c2, 0.5);

			const softBand = new Graphics();
			drawTunnelCurve(softBand, x1, y1, cx, cy, x2, y2, {
				width: conn.active ? 22 : 15,
				color: routeColor,
				alpha: conn.active ? 0.15 : 0.075,
			});
			softBand.blendMode = 'add';
			tunnelContainer.addChild(softBand);

			for (const offset of [-9, 9]) {
				const wall = new Graphics();
				drawTunnelCurve(wall, x1, y1, cx, cy, x2, y2, {
					width: conn.active ? 1.35 : 0.9,
					color: routeColor,
					alpha: conn.active ? 0.28 : 0.12,
					offset,
				});
				wall.blendMode = 'add';
				tunnelContainer.addChild(wall);
			}

			const core = new Graphics();
			drawTunnelCurve(core, x1, y1, cx, cy, x2, y2, {
				width: conn.active ? 1.35 : 0.8,
				color: conn.active ? lerpColor(routeColor, 0xffffff, 0.22) : routeColor,
				alpha: conn.active ? 0.42 : 0.18,
			});
			core.blendMode = 'add';
			tunnelContainer.addChild(core);

			const ribCount = conn.active ? 5 : 3;
			for (let i = 0; i < ribCount; i++) {
				const rib = new Graphics();
				rib.blendMode = 'add';
				tunnelContainer.addChild(rib);
				tunnelRibs.push({
					gfx: rib,
					t: (i / ribCount) + Math.random() * 0.08,
					speed: (conn.active ? 0.035 : 0.018) + Math.random() * 0.012,
					x1, y1, x2, y2, cx, cy,
					color: routeColor,
					active: conn.active,
					phase: Math.random() * Math.PI * 2,
				});
			}
		}
		app.stage.addChild(tunnelContainer);
		tunnelRibsRef.current = tunnelRibs;

		// ── Realm orbital gates ──
		const gateContainer = new Container();
		gateContainer.alpha = 0.9;
		const orbitGates: OrbitGate[] = [];
		const gateRadius = w < 520 ? 34 : w < 900 ? 38 : 44;

		for (const realm of realms) {
			const gate = new Graphics();
			gate.blendMode = 'add';
			gateContainer.addChild(gate);
			orbitGates.push({
				gfx: gate,
				x: (realm.position.x / 100) * w,
				y: (realm.position.y / 100) * h,
				color: hexToNum(realm.color),
				radius: gateRadius,
				phase: Math.random() * Math.PI * 2,
				speed: 0.18 + Math.random() * 0.08,
			});
		}
		app.stage.addChild(gateContainer);
		orbitGatesRef.current = orbitGates;

		// ── Cosmic dust ──
		const dustContainer = new Container();
		const dustGfx: Graphics[] = [];
		const dustBaseX: number[] = [];
		const dustBaseY: number[] = [];
		for (let i = 0; i < 80; i++) {
			const g = new Graphics();
			g.circle(0, 0, 0.65);
			g.fill(0xaabbcc);
			g.alpha = 0.025 + Math.random() * 0.055;
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
			const particleCount = conn.active ? 8 : 2;
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
				const sz = conn.active ? 1.4 + Math.random() * 1.6 : 0.7 + Math.random() * 0.6;
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
			let initializedApp: Application | null = null;
			try {
				initializedApp = await initApp() ?? null;
			} catch {
				// Decorative background only: campaign navigation must remain usable
				// when Pixi cannot create a renderer in headless or GPU-disabled browsers.
				return;
			}
			if (destroyed) {
				if (initializedApp) {
					initializedApp.destroy(true, { children: true, texture: true });
					if (appRef.current === initializedApp) appRef.current = null;
				}
				return;
			}
			app = initializedApp;
			if (!app) return;

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

				// Tunnel ribs
				for (const rib of tunnelRibsRef.current) {
					drawTunnelRib(rib, time);
				}

				// Realm orbital gates
				for (const gate of orbitGatesRef.current) {
					drawOrbitGate(gate, time);
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
					p.gfx.alpha = 0.04 + 0.34 * Math.sin(p.t * Math.PI);
				}

				animFrameRef.current = requestAnimationFrame(tick);
			};
			animFrameRef.current = requestAnimationFrame(tick);
		})();

		return () => {
			destroyed = true;
			cancelAnimationFrame(animFrameRef.current);
			const appToDestroy = app ?? appRef.current;
			if (appToDestroy) {
				appToDestroy.destroy(true, { children: true, texture: true });
			}
			if (appRef.current === appToDestroy) appRef.current = null;
			starDataRef.current = [];
			nebulaRef.current = [];
			dustRef.current = undefined;
			flowRef.current = [];
			tunnelRibsRef.current = [];
			orbitGatesRef.current = [];
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
