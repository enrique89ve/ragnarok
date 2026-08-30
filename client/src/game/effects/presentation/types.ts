import type { ArenaVfxOwner } from '@/game/combat/arenaVfxTargets';

export type PresentationTarget =
	| { readonly type: 'card'; readonly instanceId: string }
	| { readonly type: 'hero'; readonly side: ArenaVfxOwner }
	| { readonly type: 'field'; readonly side: ArenaVfxOwner };

export type ImpactLevel = 'light' | 'normal' | 'heavy';

export type LocalFxPrimitive =
	| 'impact-light'
	| 'impact-normal'
	| 'impact-heavy'
	| 'white-flash'
	| 'shine'
	| 'shield-flash';

export type PixiFxPrimitive =
	| 'slashTrail'
	| 'impactBurst'
	| 'impactRing'
	| 'smokePuff'
	| 'sparkBurst';

export type VisualSnapshot = {
	readonly entityId: string;
	readonly rect: {
		readonly left: number;
		readonly top: number;
		readonly width: number;
		readonly height: number;
	};
	readonly center: {
		readonly x: number;
		readonly y: number;
	};
	readonly side?: ArenaVfxOwner;
};

export type PresentationImpact = {
	readonly target: PresentationTarget;
	/** Resolved combat impact used to choose FX intensity and motion. */
	readonly amount: number;
	/** Actual HP lost after shields/mitigation; this is the number shown to the player. */
	readonly healthDamage: number;
	readonly level: ImpactLevel;
	readonly outcome: 'damage' | 'shield';
	/** Null means gameplay has not supplied a lethal outcome yet. */
	readonly lethal: boolean | null;
};

export type PresentationCounterImpact = PresentationImpact & {
	readonly source: PresentationTarget;
};

export type CombatPresentation = {
	readonly id: string;
	readonly action: 'melee-hit';
	readonly source: PresentationTarget;
	readonly attackerSide: ArenaVfxOwner;
	readonly target: PresentationImpact;
	readonly counter?: PresentationCounterImpact;
};

export type EffectRecipeStep = {
	readonly primitive: LocalFxPrimitive | PixiFxPrimitive;
	readonly delayMs: number;
};
