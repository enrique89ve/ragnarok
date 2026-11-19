import type { Rarity } from '@shared/schemas/rarity';
import type { ArenaVfxOwner } from '../../arenaVfxTargets';

/**
 * Extensible tribe/faction VFX categories.
 * Add new tribe keys here as dedicated 2D PixiJS scenes are authored.
 */
export type TribeVfxCategory =
	| 'dragon'
	| 'beast'
	| 'pet'
	| 'undead'
	| 'elemental'
	| 'titan';

/** Lifecycle moments that can dispatch a faction/tribe VFX scene. */
export type FactionVfxTrigger = 'enter' | 'activate' | 'attack' | 'evolve';

/** Canonical scene identifiers owned by the faction VFX module. */
export type FactionVfxSceneId =
	| 'dragon-flame-ignition'
	| 'dragon-fire-breath'
	| 'dragon-shadow-flight'
	| 'titan-earth-slam'
	| 'titan-colossus-quake'
	| 'titan-pantheon-descent';

/** Read-only metadata extracted from a card or registry record. */
export interface FactionCardDescriptor {
	readonly cardId?: string | number;
	readonly cardName?: string;
	readonly race?: string | null;
	readonly rarity?: string | null;
	readonly faction?: string | null;
	readonly petFamily?: string | null;
	readonly petStage?: string | null;
	readonly element?: string | null;
	readonly keywords?: readonly string[] | null;
	readonly cardType?: string | null;
}

export interface ViewportPoint {
	readonly x: number;
	readonly y: number;
}

export interface FactionVfxSceneRequest {
	readonly sceneId: FactionVfxSceneId;
	readonly category: TribeVfxCategory;
	readonly trigger: FactionVfxTrigger;
	readonly side: ArenaVfxOwner;
	readonly seed: string;
	readonly sourceId?: string;
	readonly targetId?: string;
	readonly sourcePoint?: ViewportPoint;
	readonly targetPoint?: ViewportPoint;
	readonly element?: string;
	readonly cardName?: string;
	readonly rarity?: Rarity | null;
}

export interface FactionSceneHandle {
	readonly sceneId: FactionVfxSceneId;
	cancel(): void;
}

export type FactionSceneRenderer = (request: FactionVfxSceneRequest) => FactionSceneHandle | null;
