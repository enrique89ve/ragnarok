/**
 * spritePool.ts
 *
 * Zero-GC Sprite object pool for PixiJS v8 VFX particles, rings, flashes,
 * projectiles, and ambient motes.
 *
 * Eliminates per-spawn `new Sprite()` allocations and per-death `sprite.destroy()`
 * WebGL/JS churn during high-intensity poker bursts.
 */

import { Sprite, type Container, type Texture } from 'pixi.js';

export interface SpritePoolStats {
	readonly active: number;
	readonly pooled: number;
	readonly created: number;
	readonly reused: number;
}

export interface SpritePool {
	/** Acquires a reset Sprite from the pool (or creates one if empty) and optionally attaches it to `container`. */
	acquire(texture: Texture, container?: Container): Sprite;
	/** Detaches a Sprite from `container` and returns it to the pool (or destroys it if pool is full). */
	release(sprite: Sprite, container?: Container | null): void;
	/** Destroys all retained pooled sprites (call on Pixi Application unmount). */
	drain(): void;
	/** Diagnostic counters for profiling pool hit rate. */
	getStats(): SpritePoolStats;
}

export function createSpritePool(
	maxRetained = 512,
	factory: (texture: Texture) => Sprite = (texture) => new Sprite(texture),
): SpritePool {
	const freeList: Sprite[] = [];
	let active = 0;
	let created = 0;
	let reused = 0;

	return {
		acquire(texture: Texture, container?: Container): Sprite {
			let sprite: Sprite | undefined;
			while (freeList.length > 0) {
				const candidate = freeList.pop();
				if (candidate && !candidate.destroyed) {
					sprite = candidate;
					break;
				}
			}

			if (sprite) {
				reused += 1;
				sprite.texture = texture;
				sprite.anchor.set(0.5);
				sprite.position.set(0, 0);
				sprite.scale.set(1, 1);
				sprite.rotation = 0;
				sprite.alpha = 1;
				sprite.tint = 0xffffff;
				sprite.blendMode = 'normal';
				sprite.visible = true;
			} else {
				created += 1;
				sprite = factory(texture);
				sprite.anchor.set(0.5);
			}

			active += 1;
			if (container) container.addChild(sprite);
			return sprite;
		},

		release(sprite: Sprite, container?: Container | null): void {
			if (active > 0) active -= 1;
			if (sprite.destroyed) return;

			const parent = container ?? sprite.parent;
			if (parent && sprite.parent === parent) {
				parent.removeChild(sprite);
			}

			if (freeList.length < maxRetained) {
				sprite.visible = false;
				sprite.alpha = 0;
				freeList.push(sprite);
			} else {
				sprite.destroy();
			}
		},

		drain(): void {
			for (const sprite of freeList) {
				if (!sprite.destroyed) {
					sprite.destroy();
				}
			}
			freeList.length = 0;
			active = 0;
		},

		getStats(): SpritePoolStats {
			return {
				active,
				pooled: freeList.length,
				created,
				reused,
			};
		},
	};
}

/**
 * O(1) unordered array removal — avoids O(n) shift cost of `Array.prototype.splice`
 * when retiring particles, rings, flashes, or motes in reverse simulation loops.
 */
export function swapRemoveAt<T>(arr: T[], index: number): void {
	const lastIdx = arr.length - 1;
	if (index < 0 || index > lastIdx) return;
	if (index !== lastIdx) {
		arr[index] = arr[lastIdx];
	}
	arr.pop();
}
