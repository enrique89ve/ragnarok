import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import gsap from 'gsap';
import { createEffectRandom } from '../effects/core/effectRandom';
import { getElementCenter, getArenaVfxHeroTarget, type ArenaVfxOwner } from '../combat/arenaVfxTargets';
import { getPixiApp, getThorContainer } from './PixiParticleCanvas';

const LIGHTNING = 0xffd34d;
const LIGHTNING_CORE = 0xf8fbff;
const BLUE_GLOW = 0x62b8ff;

type ThorHammerPose = 'left' | 'right' | 'strike' | 'front';

const HAMMER_POSE_URLS: Record<ThorHammerPose, string> = {
	left: '/assets/vfx/thor-hammer/hammer-left.webp',
	right: '/assets/vfx/thor-hammer/hammer-right.webp',
	strike: '/assets/vfx/thor-hammer/hammer-strike.webp',
	front: '/assets/vfx/thor-hammer/hammer-front.webp',
};

type ThorHammerTextures = Record<ThorHammerPose, Texture>;

let texturesPromise: Promise<ThorHammerTextures | null> | null = null;

function loadHammerTextures(): Promise<ThorHammerTextures | null> {
	if (!texturesPromise) {
		texturesPromise = Promise.all(
			(Object.entries(HAMMER_POSE_URLS) as Array<[ThorHammerPose, string]>).map(async ([pose, url]) => {
				const texture = await Assets.load<Texture>(url);
				return [pose, texture] as const;
			})
		).then(entries => Object.fromEntries(entries) as ThorHammerTextures).catch(() => null);
	}
	return texturesPromise;
}

function reducedMotion(): boolean {
	return typeof window !== 'undefined'
		&& window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function drawLightningBolt(random: ReturnType<typeof createEffectRandom>, angle: number, length: number, width: number): Graphics {
	const bolt = new Graphics();
	const segments = 5;
	const spread = Math.min(22, length * 0.08);
	let x = 0;
	let y = 0;

	bolt.moveTo(x, y);
	for (let index = 1; index <= segments; index += 1) {
		const distance = length / segments;
		x += Math.cos(angle) * distance;
		y += Math.sin(angle) * distance;
		const offset = index === segments ? 0 : random.jitter(spread);
		bolt.lineTo(x + Math.cos(angle + Math.PI / 2) * offset, y + Math.sin(angle + Math.PI / 2) * offset);
	}
	bolt.stroke({ width, color: LIGHTNING, alpha: 0.78 });

	const core = new Graphics();
	core.moveTo(0, 0);
	core.lineTo(x, y);
	core.stroke({ width: Math.max(1, width * 0.28), color: LIGHTNING_CORE, alpha: 0.95 });
	bolt.addChild(core);
	return bolt;
}

function createLightningField(target: { x: number; y: number }, seed: string): Container {
	const random = createEffectRandom(`thor-hammer:${seed}`);
	const field = new Container();
	field.position.set(target.x, target.y);

	for (let index = 0; index < 10; index += 1) {
		const angle = (Math.PI * 2 * index) / 10 + random.jitter(0.16);
		const bolt = drawLightningBolt(random, angle, random.int(110, 190), random.int(2, 4));
		field.addChild(bolt);
	}

	return field;
}

function createImpactParticles(target: { x: number; y: number }, seed: string): Container {
	const random = createEffectRandom(`thor-impact:${seed}`);
	const particles = new Container();
	particles.position.set(target.x, target.y);

	for (let index = 0; index < 18; index += 1) {
		const particle = new Graphics();
		const size = random.int(2, 5);
		particle.rect(-size / 2, -size / 2, size, size * random.int(1, 3));
		particle.fill(index % 3 === 0 ? LIGHTNING_CORE : index % 2 === 0 ? LIGHTNING : BLUE_GLOW);
		particle.rotation = random.jitter(Math.PI);
		particle.position.set(random.jitter(16), random.jitter(16));
		particle.alpha = 0;
		particles.addChild(particle);

		const angle = random.jitter(Math.PI);
		const distance = random.int(50, 150);
		gsap.to(particle, {
			x: Math.cos(angle) * distance,
			y: Math.sin(angle) * distance,
			alpha: 0,
			duration: random.int(35, 60) / 100,
			delay: random.int(0, 12) / 100,
			ease: 'power2.out',
		});
		gsap.to(particle, { alpha: 0.95, duration: 0.06, delay: random.int(0, 8) / 100 });
	}

	return particles;
}

function createFlash(): Graphics {
	const flash = new Graphics();
	flash.rect(0, 0, window.innerWidth, window.innerHeight);
	flash.fill(0xb9e5ff);
	flash.alpha = 0;
	return flash;
}

/**
 * Plays the dedicated THOR'S HAMMER hand-rank moment.
 * The event id is the random seed, so replay and tests get the same ray layout.
 */
export async function playThorHammerVFX(options: {
	side?: ArenaVfxOwner;
	seed: string;
}): Promise<void> {
	if (typeof window === 'undefined' || !getPixiApp()) return;

	const root = getThorContainer();
	if (!root) return;

	const owner = options.side ?? 'player';
	const direction = owner === 'player' ? 1 : -1;
	const hero = getArenaVfxHeroTarget(owner);
	if (!hero) return;

	const target = getElementCenter(hero, 0.42);
	const textures = await loadHammerTextures();
	if (!textures || !getPixiApp() || getThorContainer() !== root) return;
	const effect = new Container();
	const lightning = createLightningField(target, options.seed);
	let particles: Container | null = null;
	const flash = createFlash();
	const hammer = new Sprite(textures.left);
	const scale = Math.max(0.22, Math.min(0.38, Math.min(window.innerWidth, window.innerHeight) / 2600));
	const entryX = target.x + direction * 270;
	const entryY = target.y - 250;

	hammer.anchor.set(0.5);
	hammer.scale.set(scale);
	hammer.position.set(entryX, entryY);
	hammer.alpha = 0;
	hammer.rotation = direction * -0.55;

	lightning.alpha = 0;
	effect.addChild(lightning, hammer);
	root.addChild(flash, effect);

	const cleanup = () => {
		if (effect.destroyed) return;
		root.removeChild(flash, effect);
		flash.destroy();
		effect.destroy({ children: true });
	};

	if (reducedMotion()) {
		particles = createImpactParticles(target, options.seed);
		effect.addChild(particles);
		flash.alpha = 0.18;
		lightning.alpha = 0.7;
		particles.alpha = 0.9;
		hammer.alpha = 1;
		hammer.position.set(target.x, target.y);
		hammer.texture = textures.front;
		gsap.to(flash, { alpha: 0, duration: 0.18 });
		gsap.to(effect, { alpha: 0, duration: 0.3, delay: 0.05, onComplete: cleanup });
		return;
	}

	const timeline = gsap.timeline({ onComplete: cleanup });
	timeline.to(hammer, { alpha: 1, duration: 0.14 });
	timeline.to(hammer, {
		x: target.x + direction * 72,
		y: target.y - 116,
		rotation: direction * 0.08,
		duration: 0.54,
		ease: 'power2.out',
	});
	timeline.call(() => { hammer.texture = textures.right; });
	timeline.to(hammer, {
		y: target.y - 104,
		rotation: direction * 0.22,
		duration: 0.2,
		ease: 'sine.inOut',
	});
	timeline.call(() => { hammer.texture = textures.strike; });
	timeline.to(hammer, {
		x: target.x,
		y: target.y,
		rotation: direction * -0.16,
		duration: 0.32,
		ease: 'power3.in',
	});
	timeline.call(() => {
		particles = createImpactParticles(target, options.seed);
		effect.addChild(particles);
		flash.alpha = 0.3;
		lightning.alpha = 1;
	}, []);
	timeline.to(flash, { alpha: 0, duration: 0.22 });
	timeline.to(lightning, { alpha: 0, scale: 1.28, duration: 0.58, ease: 'power2.out' });
	timeline.call(() => { hammer.texture = textures.front; });
	timeline.to(hammer, { scale: scale * 0.82, alpha: 0.88, duration: 0.18 });
	timeline.to(hammer, { y: target.y + 18, alpha: 0, duration: 0.5, ease: 'power2.out' });
}
