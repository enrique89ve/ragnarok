import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Application, Graphics, Container } from 'pixi.js';
import gsap from 'gsap';

export interface ParticleColor {
	primary: string;
	secondary: string;
	glow: string;
}

export const ELEMENT_PALETTES: Record<string, ParticleColor> = {
	fire:      { primary: '#ff5500', secondary: '#ffd700', glow: 'rgba(255,85,0,0.6)' },
	ice:       { primary: '#00ccff', secondary: '#b3e5fc', glow: 'rgba(0,204,255,0.6)' },
	lightning: { primary: '#ffd700', secondary: '#fff9c4', glow: 'rgba(255,215,0,0.6)' },
	shadow:    { primary: '#7b1fa2', secondary: '#ce93d8', glow: 'rgba(123,31,162,0.6)' },
	nature:    { primary: '#4caf50', secondary: '#a5d6a7', glow: 'rgba(76,175,80,0.6)' },
	neutral:   { primary: '#cd7f32', secondary: '#f0e68c', glow: 'rgba(205,127,50,0.6)' },
};

function hexToNum(hex: string): number {
	return parseInt(hex.replace('#', ''), 16);
}

function pickColor(palette: ParticleColor): number {
	return Math.random() > 0.5 ? hexToNum(palette.primary) : hexToNum(palette.secondary);
}

let pixiApp: Application | null = null;
let trailContainer: Container | null = null;
let burstContainer: Container | null = null;
let ambientContainer: Container | null = null;
let filterContainer: Container | null = null;
let emitterContainer: Container | null = null;
let ambientTimers: ReturnType<typeof setTimeout>[] = [];
let currentRealm: string | undefined;

export function getPixiApp(): Application | null { return pixiApp; }
export function getBurstContainer(): Container | null { return burstContainer; }
export function getFilterContainer(): Container | null { return filterContainer; }
export function getEmitterContainer(): Container | null { return emitterContainer; }

interface RealmParticleConfig {
	colors: number[];
	count: number;
	sizeRange: [number, number];
	driftY: number;
	driftX: number;
	lifetime: [number, number];
	opacity: number;
	sway: number;
}

const REALM_CONFIGS: Record<string, RealmParticleConfig> = {
	niflheim:      { colors: [0x88ccff, 0xcceeFF, 0xffffff], count: 25, sizeRange: [1, 3], driftY: 0.5, driftX: 0.3, lifetime: [4, 7], opacity: 0.6, sway: 30 },
	muspelheim:    { colors: [0xff5500, 0xff8800, 0xffcc00], count: 28, sizeRange: [1, 3], driftY: -0.8, driftX: 0.2, lifetime: [3, 6], opacity: 0.7, sway: 20 },
	alfheim:       { colors: [0x88dd55, 0xffee88, 0xaaffaa], count: 20, sizeRange: [1, 3], driftY: 0.2, driftX: 0.1, lifetime: [5, 8], opacity: 0.5, sway: 50 },
	jotunheim:     { colors: [0xddddff, 0xffffff, 0xaaccee], count: 15, sizeRange: [2, 5], driftY: 0.15, driftX: 0.4, lifetime: [6, 10], opacity: 0.4, sway: 60 },
	helheim:       { colors: [0x6622aa, 0x44cc66, 0x884488], count: 20, sizeRange: [1, 4], driftY: -0.3, driftX: 0.5, lifetime: [3, 6], opacity: 0.5, sway: 80 },
	svartalfheim:  { colors: [0xff6600, 0xcc4400, 0xffaa22], count: 15, sizeRange: [1, 2], driftY: -0.6, driftX: 0.3, lifetime: [2, 5], opacity: 0.6, sway: 15 },
	asgard:        { colors: [0xffd700, 0xffee88, 0xffffff], count: 20, sizeRange: [1, 3], driftY: -0.4, driftX: 0.1, lifetime: [4, 7], opacity: 0.5, sway: 25 },
	vanaheim:      { colors: [0x44aa44, 0x88cc44, 0xaadd66], count: 20, sizeRange: [1, 3], driftY: 0.1, driftX: 0.15, lifetime: [5, 8], opacity: 0.45, sway: 60 },
	ginnungagap:   { colors: [0x8888ff, 0xffffff, 0x4466cc], count: 10, sizeRange: [3, 6], driftY: 0.05, driftX: 0.05, lifetime: [8, 12], opacity: 0.3, sway: 100 },
	midgard:       { colors: [0xccbbaa, 0xaa9988, 0xddccbb], count: 10, sizeRange: [1, 2], driftY: 0.05, driftX: 0.05, lifetime: [6, 10], opacity: 0.2, sway: 40 },
};

function spawnAmbientParticle(config: RealmParticleConfig) {
	if (!pixiApp || !ambientContainer) return;

	const w = window.innerWidth;
	const h = window.innerHeight;
	const x = Math.random() * w;
	const y = config.driftY < 0 ? h + 20 : (config.driftY > 0.3 ? -20 : Math.random() * h);
	const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
	const color = config.colors[Math.floor(Math.random() * config.colors.length)];
	const life = config.lifetime[0] + Math.random() * (config.lifetime[1] - config.lifetime[0]);

	const g = new Graphics();
	g.circle(0, 0, size);
	g.fill(color);
	g.position.set(x, y);
	g.alpha = 0;
	ambientContainer.addChild(g);

	const swayX = (Math.random() - 0.5) * config.sway;
	const endY = y + config.driftY * h * (life / 5);

	gsap.to(g, {
		alpha: config.opacity,
		duration: life * 0.2,
		ease: 'power1.in',
	});

	gsap.to(g, {
		x: x + swayX + config.driftX * w * 0.3 * (Math.random() - 0.5),
		y: endY,
		duration: life,
		ease: 'none',
		onComplete: () => {
			gsap.to(g, {
				alpha: 0,
				duration: 0.5,
				onComplete: () => {
					ambientContainer?.removeChild(g);
					g.destroy();
				}
			});
		}
	});

	gsap.to(g, {
		alpha: 0,
		duration: life * 0.3,
		delay: life * 0.7,
		ease: 'power1.out',
	});
}

export function startAmbientParticles(realm: string) {
	stopAmbientParticles();
	currentRealm = realm;
	const config = REALM_CONFIGS[realm] || REALM_CONFIGS.midgard;
	const interval = ((config.lifetime[0] + config.lifetime[1]) / 2 * 1000) / config.count;

	for (let i = 0; i < Math.min(config.count, 8); i++) {
		const delay = setTimeout(() => spawnAmbientParticle(config), i * 200);
		ambientTimers.push(delay);
	}

	const loop = () => {
		if (currentRealm !== realm) return;
		spawnAmbientParticle(config);
		const timer = setTimeout(loop, interval + Math.random() * interval * 0.5);
		ambientTimers.push(timer);
	};
	const startTimer = setTimeout(loop, 2000);
	ambientTimers.push(startTimer);
}

export function stopAmbientParticles() {
	currentRealm = undefined;
	ambientTimers.forEach(t => clearTimeout(t));
	ambientTimers = [];
	if (ambientContainer) {
		ambientContainer.removeChildren();
	}
}

export function spawnSlashTrail(
	sx: number, sy: number,
	tx: number, ty: number,
	count: number,
	palette: ParticleColor
) {
	if (!pixiApp || !trailContainer) return;
	const dx = tx - sx;
	const dy = ty - sy;
	const len = Math.sqrt(dx * dx + dy * dy);
	const nx = len > 0 ? -dy / len : 0;
	const ny = len > 0 ? dx / len : 0;

	for (let i = 0; i < count; i++) {
		const t = i / count;
		const spread = (Math.random() - 0.5) * 30;
		const x = sx + dx * t + nx * spread;
		const y = sy + dy * t + ny * spread;
		const r = 2 + Math.random() * 3;

		const g = new Graphics();
		g.circle(0, 0, r);
		g.fill(pickColor(palette));
		g.position.set(x, y);
		g.alpha = 0;
		trailContainer.addChild(g);

		gsap.to(g, {
			alpha: 1,
			duration: 0.1,
			delay: t * 0.25,
			onComplete: () => {
				gsap.to(g, {
					alpha: 0,
					duration: 0.3,
					ease: 'power2.out',
					onComplete: () => {
						trailContainer?.removeChild(g);
						g.destroy();
					}
				});
				gsap.to(g.scale, {
					x: 0.3,
					y: 0.3,
					duration: 0.3,
					ease: 'power2.out',
				});
			}
		});
	}
}

export function spawnParticleBurst(
	cx: number, cy: number,
	count: number,
	palette: ParticleColor
) {
	if (!pixiApp || !burstContainer) return;

	for (let i = 0; i < count; i++) {
		const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
		const dist = 30 + Math.random() * 90;
		const r = 2 + Math.random() * 6;
		const endX = cx + Math.cos(angle) * dist;
		const endY = cy + Math.sin(angle) * dist;

		const g = new Graphics();
		g.circle(0, 0, r);
		g.fill(pickColor(palette));
		g.position.set(cx, cy);
		g.alpha = 1;
		burstContainer.addChild(g);

		gsap.to(g, {
			x: endX,
			y: endY,
			alpha: 0,
			duration: 0.4 + Math.random() * 0.2,
			ease: 'power2.out',
			onComplete: () => {
				burstContainer?.removeChild(g);
				g.destroy();
			}
		});
	}
}

export function spawnImpactRing(
	cx: number, cy: number,
	palette: ParticleColor
) {
	if (!pixiApp || !burstContainer) return;

	const ring = new Graphics();
	ring.circle(0, 0, 20);
	ring.stroke({ width: 3, color: hexToNum(palette.primary) });
	ring.position.set(cx, cy);
	ring.alpha = 0.9;
	ring.scale.set(0.2);
	burstContainer.addChild(ring);

	gsap.to(ring, {
		alpha: 0,
		duration: 0.35,
		ease: 'power2.out',
		onComplete: () => {
			burstContainer?.removeChild(ring);
			ring.destroy();
		}
	});
	gsap.to(ring.scale, {
		x: 2.5,
		y: 2.5,
		duration: 0.35,
		ease: 'power2.out',
	});
}

export function spawnEmbers(
	cx: number, cy: number,
	count: number,
	palette: ParticleColor
) {
	if (!pixiApp || !burstContainer) return;

	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const dist = 10 + Math.random() * 40;
		const r = 1 + Math.random() * 2;

		const g = new Graphics();
		g.circle(0, 0, r);
		g.fill(hexToNum(palette.secondary));
		g.position.set(cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 20);
		g.alpha = 0.8;
		burstContainer.addChild(g);

		gsap.to(g, {
			x: cx + Math.cos(angle) * dist,
			y: cy + Math.sin(angle) * dist - 20,
			alpha: 0,
			duration: 0.8 + Math.random() * 0.6,
			delay: 0.3 + Math.random() * 0.3,
			ease: 'power1.out',
			onComplete: () => {
				burstContainer?.removeChild(g);
				g.destroy();
			}
		});
	}
}

export const PixiParticleCanvas: React.FC<{ realm?: string }> = ({ realm }) => {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const app = new Application();
		let mounted = true;

		app.init({
			backgroundAlpha: 0,
			resizeTo: window,
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
		}).then(() => {
			if (!mounted || !containerRef.current) {
				app.destroy(true);
				return;
			}

			containerRef.current.appendChild(app.canvas as HTMLCanvasElement);
			pixiApp = app;

			trailContainer = new Container();
			burstContainer = new Container();
			ambientContainer = new Container();
			filterContainer = new Container();
			emitterContainer = new Container();
			app.stage.addChild(ambientContainer);
			app.stage.addChild(trailContainer);
			app.stage.addChild(filterContainer);
			app.stage.addChild(emitterContainer);
			app.stage.addChild(burstContainer);
		});

		return () => {
			mounted = false;
			stopAmbientParticles();
			if (ambientContainer) { ambientContainer.destroy({ children: true }); ambientContainer = null; }
			if (trailContainer) { trailContainer.destroy({ children: true }); trailContainer = null; }
			if (filterContainer) { filterContainer.destroy({ children: true }); filterContainer = null; }
			if (emitterContainer) { emitterContainer.destroy({ children: true }); emitterContainer = null; }
			if (burstContainer) { burstContainer.destroy({ children: true }); burstContainer = null; }
			if (pixiApp === app) pixiApp = null;
			app.destroy(true);
		};
	}, []);

	useEffect(() => {
		if (realm) {
			startAmbientParticles(realm);
		} else {
			stopAmbientParticles();
		}
	}, [realm]);

	const overlay = (
		<div
			ref={containerRef}
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100vw',
				height: '100vh',
				pointerEvents: 'none',
				zIndex: 8500,
			}}
		/>
	);

	return createPortal(overlay, document.body);
};

export default PixiParticleCanvas;
