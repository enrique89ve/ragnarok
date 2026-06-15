import type {
	CardLayoutSlot,
	CardLayoutSlotId,
	CardLayoutSurfaceDraft,
} from './cardLayoutDraft';
import type { SimpleCardData } from './SimpleCardCompat';

export const CARD_LAYOUT_RENDER_SCHEMA = 'norse-card-layout-render/v1';

export type CardLayoutSlotValue =
	| { readonly kind: 'empty'; readonly value: null }
	| { readonly kind: 'image'; readonly value: string }
	| { readonly kind: 'list'; readonly value: readonly string[] }
	| { readonly kind: 'text'; readonly value: string };

export type CardLayoutSlotCss = {
	readonly left: string;
	readonly top: string;
	readonly width: string;
	readonly height: string;
	readonly '--slot-font-scale': string;
};

export type CardLayoutRenderedSlot = CardLayoutSlot & {
	readonly css: CardLayoutSlotCss;
	readonly value: CardLayoutSlotValue;
};

export type CardLayoutRenderedCardData = {
	readonly id: string;
	readonly name: string;
	readonly manaCost: number;
	readonly attack: number | null;
	readonly health: number | null;
	readonly description: string;
	readonly type: string;
	readonly rarity: string;
	readonly tribe: string | null;
	readonly keywords: readonly string[];
	readonly element: string | null;
	readonly artPath: string;
};

export type CardLayoutRenderData = {
	readonly schema: typeof CARD_LAYOUT_RENDER_SCHEMA;
	readonly surface: Pick<CardLayoutSurfaceDraft, 'surface' | 'mode' | 'label' | 'scene' | 'baseWidth' | 'aspectRatio' | 'renderer' | 'renderFields'>;
	readonly card: CardLayoutRenderedCardData;
	readonly slots: readonly CardLayoutRenderedSlot[];
};

type SlotValueInput = {
	readonly card: SimpleCardData;
	readonly artPath: string;
};

const numberValue = (value: number | undefined): CardLayoutSlotValue => (
	value === undefined ? { kind: 'empty', value: null } : { kind: 'text', value: String(value) }
);

const textValue = (value: string | undefined | null): CardLayoutSlotValue => (
	value === undefined || value === null || value.length === 0
		? { kind: 'empty', value: null }
		: { kind: 'text', value }
);

const slotValueResolvers: Record<CardLayoutSlotId, (input: SlotValueInput) => CardLayoutSlotValue> = {
	art: ({ artPath }) => ({ kind: 'image', value: artPath }),
	mana: ({ card }) => ({ kind: 'text', value: String(card.manaCost) }),
	name: ({ card }) => ({ kind: 'text', value: card.name }),
	keywords: ({ card }) => ({ kind: 'list', value: card.keywords ?? [] }),
	description: ({ card }) => textValue(card.description),
	tribe: ({ card }) => textValue(card.tribe),
	attack: ({ card }) => numberValue(card.attack),
	health: ({ card }) => numberValue(card.health),
	rarity: ({ card }) => ({ kind: 'text', value: card.rarity ?? 'common' }),
	badge: ({ card }) => textValue(card.element === 'neutral' ? null : card.element),
	count: () => ({ kind: 'empty', value: null }),
};

const slotCss = (slot: CardLayoutSlot): CardLayoutSlotCss => ({
	left: `${slot.x}%`,
	top: `${slot.y}%`,
	width: `${slot.w}%`,
	height: `${slot.h}%`,
	'--slot-font-scale': String(slot.fontScale),
});

export const buildCardLayoutRenderData = (input: {
	readonly surface: CardLayoutSurfaceDraft;
	readonly card: SimpleCardData;
	readonly artPath: string;
}): CardLayoutRenderData => {
	const { surface, card, artPath } = input;
	return {
		schema: CARD_LAYOUT_RENDER_SCHEMA,
		surface: {
			surface: surface.surface,
			mode: surface.mode,
			label: surface.label,
			scene: surface.scene,
			baseWidth: surface.baseWidth,
			aspectRatio: surface.aspectRatio,
			renderer: surface.renderer,
			renderFields: surface.renderFields,
		},
		card: {
			id: String(card.id),
			name: card.name,
			manaCost: card.manaCost,
			attack: card.attack ?? null,
			health: card.health ?? null,
			description: card.description ?? '',
			type: card.type,
			rarity: card.rarity ?? 'common',
			tribe: card.tribe ?? null,
			keywords: card.keywords ?? [],
			element: card.element ?? null,
			artPath,
		},
		slots: surface.slots.map((slot) => ({
			...slot,
			css: slotCss(slot),
			value: slotValueResolvers[slot.id]({ card, artPath }),
		})),
	};
};

export const serializeCardLayoutRenderData = (renderData: CardLayoutRenderData): string => (
	JSON.stringify(renderData, null, 2)
);
