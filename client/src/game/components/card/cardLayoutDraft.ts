import type { CardShape, CardSize, CardStatsMode } from './types';
import type { CardFrameLayoutSurface } from './cardFrameLayoutAdapter';
import { RARITY, type Rarity } from '@shared/schemas/rarity';

export const CARD_LAYOUT_SCHEMA = 'norse-card-layout-draft/v1';

export const CARD_LAYOUT_SURFACES = [
	'collection',
	'pregame',
	'gameplay',
] as const;

export type CardLayoutSurface = typeof CARD_LAYOUT_SURFACES[number];

export const CARD_LAYOUT_MODES = [
	'collection',
	'pregame',
	'gameplay',
] as const;

export type CardLayoutMode = typeof CARD_LAYOUT_MODES[number];

export const CARD_LAYOUT_CARD_TYPES = [
	'minion',
	'spell',
	'weapon',
	'artifact',
	'armor',
	'hero',
	'secret',
	'location',
	'poker_spell',
] as const;

export type CardLayoutCardType = typeof CARD_LAYOUT_CARD_TYPES[number];

export const CARD_LAYOUT_SLOT_IDS = [
	'art',
	'mana',
	'name',
	'keywords',
	'description',
	'tribe',
	'attack',
	'health',
	'rarity',
	'badge',
	'count',
] as const;

export type CardLayoutSlotId = typeof CARD_LAYOUT_SLOT_IDS[number];

export const CARD_LAYOUT_TEXT_POLICIES = [
	'fit',
	'wrap',
	'clip',
	'hidden',
] as const;

export type CardLayoutTextPolicy = typeof CARD_LAYOUT_TEXT_POLICIES[number];

export const CARD_LAYOUT_FIELD_PRIORITIES = [
	'primary',
	'secondary',
	'tertiary',
	'hidden',
] as const;

export type CardLayoutFieldPriority = typeof CARD_LAYOUT_FIELD_PRIORITIES[number];

export type CardLayoutRenderFieldRule = {
	readonly id: CardLayoutSlotId;
	readonly label: string;
	readonly enabled: boolean;
	readonly priority: CardLayoutFieldPriority;
	readonly cardTypes: readonly CardLayoutCardType[];
	readonly rarities: readonly Rarity[];
};

export type CardLayoutAspectRatio = {
	readonly width: number;
	readonly height: number;
};

export type CardLayoutRenderer = {
	readonly surface: CardFrameLayoutSurface;
	readonly shape: CardShape;
	readonly size: CardSize;
	readonly statsMode: CardStatsMode;
	readonly showDescription: boolean;
};

export type CardLayoutSlot = {
	readonly id: CardLayoutSlotId;
	readonly label: string;
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
	readonly fontScale: number;
	readonly visible: boolean;
	readonly textPolicy: CardLayoutTextPolicy;
	readonly aspectLocked: boolean;
};

export type CardLayoutSurfaceDraft = {
	readonly surface: CardLayoutSurface;
	readonly mode: CardLayoutMode;
	readonly label: string;
	readonly scene: string;
	readonly baseWidth: number;
	readonly aspectRatio: CardLayoutAspectRatio;
	readonly renderer: CardLayoutRenderer;
	readonly renderFields: readonly CardLayoutRenderFieldRule[];
	readonly slots: readonly CardLayoutSlot[];
};

export type CardLayoutDraft = {
	readonly schema: typeof CARD_LAYOUT_SCHEMA;
	readonly updatedAt: string;
	readonly surfaces: readonly CardLayoutSurfaceDraft[];
};

export type CardLayoutSlotPatch = Partial<
	Pick<CardLayoutSlot, 'x' | 'y' | 'w' | 'h' | 'fontScale' | 'visible' | 'textPolicy' | 'aspectLocked'>
>;

export type CardLayoutRenderFieldPatch = Partial<
	Pick<CardLayoutRenderFieldRule, 'enabled' | 'priority' | 'cardTypes' | 'rarities'>
>;

const NFT_ASPECT: CardLayoutAspectRatio = { width: 7, height: 10 };
const ALL_CARD_TYPES = CARD_LAYOUT_CARD_TYPES;
const ALL_RARITIES = RARITY;
const COMBAT_STAT_CARD_TYPES: readonly CardLayoutCardType[] = ['minion', 'weapon', 'artifact'];

const ASPECT_LOCKED_SLOT_IDS = new Set<CardLayoutSlotId>([
	'art',
	'mana',
	'badge',
	'attack',
	'health',
	'rarity',
	'count',
]);

const isCardLayoutSlotAspectLockedByDefault = (slotId: CardLayoutSlotId): boolean => (
	ASPECT_LOCKED_SLOT_IDS.has(slotId)
);

type CardLayoutSlotDefinition = Omit<CardLayoutSlot, 'aspectLocked'> & {
	readonly aspectLocked?: boolean;
};

const defineSlot = (slot: CardLayoutSlotDefinition): CardLayoutSlot => ({
	...slot,
	aspectLocked: slot.aspectLocked ?? isCardLayoutSlotAspectLockedByDefault(slot.id),
});

const collectionSlots = (): readonly CardLayoutSlot[] => [
	defineSlot({ id: 'art', label: 'Art', x: 3, y: 3, w: 94, h: 88, fontScale: 1, visible: true, textPolicy: 'hidden' }),
	defineSlot({ id: 'mana', label: 'Mana', x: 1.8, y: 1.3, w: 11, h: 7.7, fontScale: 1, visible: true, textPolicy: 'fit' }),
	defineSlot({ id: 'badge', label: 'Badge', x: 86, y: 3.2, w: 10.8, h: 7.6, fontScale: 1, visible: false, textPolicy: 'fit' }),
	defineSlot({ id: 'description', label: 'Description', x: 8, y: 57.2, w: 84, h: 16.7, fontScale: 0.92, visible: false, textPolicy: 'wrap' }),
	// Keywords are rendered inside the description slot. Keep their editor
	// rectangle as a centered inner rail instead of duplicating the full text
	// region, so the default canvas explains the composite layout at a glance.
	defineSlot({ id: 'keywords', label: 'Keywords', x: 27, y: 57.2, w: 46, h: 5.6, fontScale: 1, visible: false, textPolicy: 'fit' }),
	defineSlot({ id: 'tribe', label: 'Tribe', x: 24, y: 75.2, w: 52, h: 4.3, fontScale: 0.66, visible: false, textPolicy: 'fit' }),
	defineSlot({ id: 'name', label: 'Name', x: 13.5, y: 81.3, w: 73, h: 7.5, fontScale: 0.76, visible: true, textPolicy: 'wrap' }),
	defineSlot({ id: 'attack', label: 'Attack', x: 0, y: 94.1, w: 16, h: 5.9, fontScale: 0.92, visible: true, textPolicy: 'fit' }),
	defineSlot({ id: 'health', label: 'Health', x: 84, y: 94.1, w: 16, h: 5.9, fontScale: 0.92, visible: true, textPolicy: 'fit' }),
	// Keep the marker centered on the lower band while giving it 50% more room.
	defineSlot({ id: 'rarity', label: 'Rarity', x: 33.5, y: 96.7, w: 33, h: 5.4, fontScale: 1, visible: true, textPolicy: 'hidden' }),
	defineSlot({ id: 'count', label: 'Count', x: 79, y: 13.8, w: 16, h: 9, fontScale: 1, visible: false, textPolicy: 'fit' }),
];

const collectionSlotsWithVisibility = (
	visibility: Partial<Record<CardLayoutSlotId, boolean>>,
): readonly CardLayoutSlot[] => collectionSlots().map((slot) => ({
	...slot,
	visible: visibility[slot.id] ?? slot.visible,
}));

const collectionDetailSlots = (): readonly CardLayoutSlot[] => collectionSlotsWithVisibility({
	tribe: true,
	keywords: true,
	description: true,
});

type RenderFieldRuleDefinition = Omit<CardLayoutRenderFieldRule, 'cardTypes' | 'rarities'> & {
	readonly cardTypes?: readonly CardLayoutCardType[];
	readonly rarities?: readonly Rarity[];
};

const defineRenderFieldRule = (rule: RenderFieldRuleDefinition): CardLayoutRenderFieldRule => ({
	...rule,
	cardTypes: rule.cardTypes ?? ALL_CARD_TYPES,
	rarities: rule.rarities ?? ALL_RARITIES,
});

const collectionRenderFields = (): readonly CardLayoutRenderFieldRule[] => [
	defineRenderFieldRule({ id: 'art', label: 'Art', enabled: true, priority: 'primary' }),
	defineRenderFieldRule({ id: 'mana', label: 'Mana', enabled: true, priority: 'primary' }),
	defineRenderFieldRule({ id: 'name', label: 'Name', enabled: true, priority: 'primary' }),
	defineRenderFieldRule({ id: 'rarity', label: 'Rarity', enabled: true, priority: 'secondary' }),
	defineRenderFieldRule({ id: 'attack', label: 'Attack', enabled: true, priority: 'primary', cardTypes: COMBAT_STAT_CARD_TYPES }),
	defineRenderFieldRule({ id: 'health', label: 'Health', enabled: true, priority: 'primary', cardTypes: ['minion', 'artifact', 'hero'] }),
	defineRenderFieldRule({ id: 'tribe', label: 'Tribe', enabled: true, priority: 'secondary', cardTypes: ['minion'] }),
	defineRenderFieldRule({ id: 'keywords', label: 'Keywords', enabled: true, priority: 'secondary' }),
	defineRenderFieldRule({ id: 'description', label: 'Description', enabled: true, priority: 'secondary' }),
	defineRenderFieldRule({ id: 'badge', label: 'Element badge', enabled: true, priority: 'tertiary', rarities: ['epic', 'mythic'] }),
	defineRenderFieldRule({ id: 'count', label: 'Collection count', enabled: true, priority: 'tertiary' }),
];

const pregameRenderFields = (): readonly CardLayoutRenderFieldRule[] => [
	defineRenderFieldRule({ id: 'art', label: 'Art', enabled: true, priority: 'primary' }),
	defineRenderFieldRule({ id: 'mana', label: 'Mana', enabled: true, priority: 'primary' }),
	defineRenderFieldRule({ id: 'name', label: 'Name', enabled: true, priority: 'primary' }),
	defineRenderFieldRule({ id: 'rarity', label: 'Rarity', enabled: true, priority: 'secondary' }),
	defineRenderFieldRule({ id: 'attack', label: 'Attack', enabled: true, priority: 'primary', cardTypes: COMBAT_STAT_CARD_TYPES }),
	defineRenderFieldRule({ id: 'health', label: 'Health', enabled: true, priority: 'primary', cardTypes: ['minion', 'artifact', 'hero'] }),
	defineRenderFieldRule({ id: 'keywords', label: 'Keywords', enabled: true, priority: 'secondary' }),
	defineRenderFieldRule({ id: 'description', label: 'Description', enabled: false, priority: 'hidden' }),
	defineRenderFieldRule({ id: 'tribe', label: 'Tribe', enabled: false, priority: 'hidden' }),
	defineRenderFieldRule({ id: 'badge', label: 'Element badge', enabled: false, priority: 'hidden' }),
	defineRenderFieldRule({ id: 'count', label: 'Collection count', enabled: false, priority: 'hidden' }),
];

const gameplayRenderFields = (): readonly CardLayoutRenderFieldRule[] => [
	defineRenderFieldRule({ id: 'art', label: 'Art', enabled: true, priority: 'primary' }),
	defineRenderFieldRule({ id: 'mana', label: 'Mana', enabled: true, priority: 'primary' }),
	defineRenderFieldRule({ id: 'name', label: 'Name', enabled: true, priority: 'primary' }),
	defineRenderFieldRule({ id: 'attack', label: 'Attack', enabled: true, priority: 'primary', cardTypes: COMBAT_STAT_CARD_TYPES }),
	defineRenderFieldRule({ id: 'health', label: 'Health', enabled: true, priority: 'primary', cardTypes: ['minion', 'artifact', 'hero'] }),
	defineRenderFieldRule({ id: 'rarity', label: 'Rarity', enabled: true, priority: 'tertiary', rarities: ['epic', 'mythic'] }),
	defineRenderFieldRule({ id: 'keywords', label: 'Keywords', enabled: true, priority: 'secondary' }),
	defineRenderFieldRule({ id: 'description', label: 'Description', enabled: false, priority: 'hidden' }),
	defineRenderFieldRule({ id: 'tribe', label: 'Tribe', enabled: false, priority: 'hidden' }),
	defineRenderFieldRule({ id: 'badge', label: 'Element badge', enabled: false, priority: 'hidden' }),
	defineRenderFieldRule({ id: 'count', label: 'Collection count', enabled: false, priority: 'hidden' }),
];

const renderFieldsForSurface = (surface: CardLayoutSurface): readonly CardLayoutRenderFieldRule[] => {
	switch (surface) {
		case 'collection': return collectionRenderFields();
		case 'pregame': return pregameRenderFields();
		case 'gameplay': return gameplayRenderFields();
	}
};

export const DEFAULT_CARD_LAYOUT_DRAFT = {
	schema: CARD_LAYOUT_SCHEMA,
	updatedAt: '2026-06-13T00:00:00.000Z',
	surfaces: [
		{
			surface: 'collection',
			mode: 'collection',
			label: 'Collection',
			scene: 'collection',
			baseWidth: 156,
			aspectRatio: NFT_ASPECT,
			renderer: { surface: 'collection', shape: 'tile', size: 'large', statsMode: 'frame', showDescription: true },
			renderFields: collectionRenderFields(),
			slots: collectionDetailSlots(),
		},
		{
			surface: 'pregame',
			mode: 'pregame',
			label: 'Pre-game',
			scene: 'mulligan',
			baseWidth: 220,
			aspectRatio: NFT_ASPECT,
			renderer: { surface: 'collection', shape: 'tile', size: 'large', statsMode: 'frame', showDescription: false },
			renderFields: pregameRenderFields(),
			slots: collectionSlotsWithVisibility({ keywords: true }),
		},
		{
			surface: 'gameplay',
			mode: 'gameplay',
			label: 'Game',
			scene: 'combat',
			baseWidth: 156,
			aspectRatio: NFT_ASPECT,
			renderer: { surface: 'collection', shape: 'tile', size: 'medium', statsMode: 'frame', showDescription: false },
			renderFields: gameplayRenderFields(),
			slots: collectionSlotsWithVisibility({ keywords: true }),
		},
	],
} satisfies CardLayoutDraft;

export const cloneCardLayoutDraft = (draft: CardLayoutDraft): CardLayoutDraft => ({
	schema: draft.schema,
	updatedAt: draft.updatedAt,
	surfaces: draft.surfaces.map((surface) => ({
		...surface,
		aspectRatio: { ...surface.aspectRatio },
		renderer: { ...surface.renderer },
		renderFields: surface.renderFields.map((field) => ({
			...field,
			cardTypes: [...field.cardTypes],
			rarities: [...field.rarities],
		})),
		slots: surface.slots.map((slot) => ({ ...slot })),
	})),
});

export const createDefaultCardLayoutDraft = (): CardLayoutDraft => (
	cloneCardLayoutDraft(DEFAULT_CARD_LAYOUT_DRAFT)
);

export const getCardLayoutSurfaceDraft = (
	draft: CardLayoutDraft,
	surface: CardLayoutSurface,
): CardLayoutSurfaceDraft => {
	const found = draft.surfaces.find((candidate) => candidate.surface === surface);
	if (found === undefined) {
		throw new Error(`Missing card layout surface: ${surface}`);
	}
	return found;
};

export const updateCardLayoutSlot = (
	draft: CardLayoutDraft,
	surfaceId: CardLayoutSurface,
	slotId: CardLayoutSlotId,
	patch: CardLayoutSlotPatch,
): CardLayoutDraft => ({
	schema: draft.schema,
	updatedAt: new Date().toISOString(),
	surfaces: draft.surfaces.map((surface) => {
		if (surface.surface !== surfaceId) return surface;
		return {
			...surface,
			slots: surface.slots.map((slot) => (
				slot.id === slotId ? { ...slot, ...patch } : slot
			)),
		};
	}),
});

export const updateCardLayoutRenderField = (
	draft: CardLayoutDraft,
	surfaceId: CardLayoutSurface,
	slotId: CardLayoutSlotId,
	patch: CardLayoutRenderFieldPatch,
): CardLayoutDraft => ({
	schema: draft.schema,
	updatedAt: new Date().toISOString(),
	surfaces: draft.surfaces.map((surface) => {
		if (surface.surface !== surfaceId) return surface;
		return {
			...surface,
			renderFields: surface.renderFields.map((field) => (
				field.id === slotId
					? {
						...field,
						...patch,
						cardTypes: patch.cardTypes ?? field.cardTypes,
						rarities: patch.rarities ?? field.rarities,
					}
					: field
			)),
		};
	}),
});

export const serializeCardLayoutDraft = (draft: CardLayoutDraft): string => (
	JSON.stringify(draft, null, 2)
);

const SURFACE_SET = new Set<string>(CARD_LAYOUT_SURFACES);
const MODE_SET = new Set<string>(CARD_LAYOUT_MODES);
const CARD_TYPE_SET = new Set<string>(CARD_LAYOUT_CARD_TYPES);
const SLOT_SET = new Set<string>(CARD_LAYOUT_SLOT_IDS);
const TEXT_POLICY_SET = new Set<string>(CARD_LAYOUT_TEXT_POLICIES);
const FIELD_PRIORITY_SET = new Set<string>(CARD_LAYOUT_FIELD_PRIORITIES);
const RARITY_SET = new Set<string>(RARITY);
const CARD_SHAPE_SET = new Set<string>(['portrait', 'tile', 'row', 'hand', 'board', 'hero', 'poker']);
const CARD_SIZE_SET = new Set<string>(['small', 'medium', 'large', 'preview']);
const STATS_MODE_SET = new Set<string>(['frame', 'battlefield', 'hidden']);
const CARD_FRAME_LAYOUT_SURFACE_SET = new Set<string>([
	'collection',
	'gameplay',
	'battlefield',
	'compact',
	'mulligan',
	'preview',
]);
const MODE_BY_SURFACE = {
	collection: 'collection',
	pregame: 'pregame',
	gameplay: 'gameplay',
} satisfies Record<CardLayoutSurface, CardLayoutMode>;
const RENDERER_SURFACE_BY_SURFACE = {
	collection: 'collection',
	pregame: 'collection',
	gameplay: 'gameplay',
} satisfies Record<CardLayoutSurface, CardFrameLayoutSurface>;

const isRecord = (value: unknown): value is Record<string, unknown> => (
	typeof value === 'object' && value !== null && !Array.isArray(value)
);

const readString = (
	record: Record<string, unknown>,
	key: string,
	path: string,
): string => {
	const value = record[key];
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new Error(`${path}.${key} must be a non-empty string`);
	}
	return value;
};

const readBoolean = (
	record: Record<string, unknown>,
	key: string,
	path: string,
): boolean => {
	const value = record[key];
	if (typeof value !== 'boolean') {
		throw new Error(`${path}.${key} must be a boolean`);
	}
	return value;
};

const readOptionalBoolean = (
	record: Record<string, unknown>,
	key: string,
	path: string,
	fallback: boolean,
): boolean => {
	const value = record[key];
	if (value === undefined) return fallback;
	if (typeof value !== 'boolean') {
		throw new Error(`${path}.${key} must be a boolean`);
	}
	return value;
};

const readNumber = (
	record: Record<string, unknown>,
	key: string,
	path: string,
): number => {
	const value = record[key];
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`${path}.${key} must be a finite number`);
	}
	return value;
};

const readOneOf = <T extends string>(
	record: Record<string, unknown>,
	key: string,
	values: ReadonlySet<string>,
	path: string,
): T => {
	const value = readString(record, key, path);
	if (!values.has(value)) {
		throw new Error(`${path}.${key} has unsupported value: ${value}`);
	}
	return value as T;
};

const readStringList = <T extends string>(
	record: Record<string, unknown>,
	key: string,
	values: ReadonlySet<string>,
	path: string,
	fallback: readonly T[],
): readonly T[] => {
	const value = record[key];
	if (value === undefined) return fallback;
	if (!Array.isArray(value)) throw new Error(`${path}.${key} must be an array`);
	return value.map((entry, index) => {
		if (typeof entry !== 'string' || !values.has(entry)) {
			throw new Error(`${path}.${key}[${index}] has unsupported value: ${String(entry)}`);
		}
		return entry as T;
	});
};

const validateAspectRatio = (value: unknown, path: string): CardLayoutAspectRatio => {
	if (!isRecord(value)) throw new Error(`${path} must be an object`);
	const width = readNumber(value, 'width', path);
	const height = readNumber(value, 'height', path);
	if (width <= 0 || height <= 0) throw new Error(`${path} must use positive numbers`);
	return { width, height };
};

const validateRenderer = (
	value: unknown,
	path: string,
	fallbackSurface: CardFrameLayoutSurface,
): CardLayoutRenderer => {
	if (!isRecord(value)) throw new Error(`${path} must be an object`);
	const surface = typeof value.surface === 'string'
		? readOneOf<CardFrameLayoutSurface>(value, 'surface', CARD_FRAME_LAYOUT_SURFACE_SET, path)
		: fallbackSurface;
	return {
		surface,
		shape: readOneOf<CardShape>(value, 'shape', CARD_SHAPE_SET, path),
		size: readOneOf<CardSize>(value, 'size', CARD_SIZE_SET, path),
		statsMode: readOneOf<CardStatsMode>(value, 'statsMode', STATS_MODE_SET, path),
		showDescription: readBoolean(value, 'showDescription', path),
	};
};

const validatePercent = (value: number, path: string): number => {
	if (value < 0 || value > 100) throw new Error(`${path} must be between 0 and 100`);
	return value;
};

const validateSlot = (value: unknown, path: string): CardLayoutSlot => {
	if (!isRecord(value)) throw new Error(`${path} must be an object`);
	const id = readOneOf<CardLayoutSlotId>(value, 'id', SLOT_SET, path);
	const slot: CardLayoutSlot = {
		id,
		label: readString(value, 'label', path),
		x: validatePercent(readNumber(value, 'x', path), `${path}.x`),
		y: validatePercent(readNumber(value, 'y', path), `${path}.y`),
		w: validatePercent(readNumber(value, 'w', path), `${path}.w`),
		h: validatePercent(readNumber(value, 'h', path), `${path}.h`),
		fontScale: readNumber(value, 'fontScale', path),
		visible: readBoolean(value, 'visible', path),
		textPolicy: readOneOf<CardLayoutTextPolicy>(value, 'textPolicy', TEXT_POLICY_SET, path),
		aspectLocked: readOptionalBoolean(
			value,
			'aspectLocked',
			path,
			isCardLayoutSlotAspectLockedByDefault(id),
		),
	};
	if (slot.w <= 0 || slot.h <= 0) throw new Error(`${path}.w and ${path}.h must be positive`);
	if (slot.fontScale <= 0 || slot.fontScale > 3) {
		throw new Error(`${path}.fontScale must be greater than 0 and at most 3`);
	}
	return slot;
};

const validateRenderFieldRule = (value: unknown, path: string): CardLayoutRenderFieldRule => {
	if (!isRecord(value)) throw new Error(`${path} must be an object`);
	const id = readOneOf<CardLayoutSlotId>(value, 'id', SLOT_SET, path);
	return {
		id,
		label: readString(value, 'label', path),
		enabled: readBoolean(value, 'enabled', path),
		priority: readOneOf<CardLayoutFieldPriority>(value, 'priority', FIELD_PRIORITY_SET, path),
		cardTypes: readStringList<CardLayoutCardType>(
			value,
			'cardTypes',
			CARD_TYPE_SET,
			path,
			ALL_CARD_TYPES,
		),
		rarities: readStringList<Rarity>(
			value,
			'rarities',
			RARITY_SET,
			path,
			ALL_RARITIES,
		),
	};
};

const validateSurface = (value: unknown, path: string): CardLayoutSurfaceDraft => {
	if (!isRecord(value)) throw new Error(`${path} must be an object`);
	const slots = value.slots;
	if (!Array.isArray(slots)) throw new Error(`${path}.slots must be an array`);
	const surface = readOneOf<CardLayoutSurface>(value, 'surface', SURFACE_SET, path);
	const renderFields = value.renderFields;
	if (renderFields !== undefined && !Array.isArray(renderFields)) {
		throw new Error(`${path}.renderFields must be an array`);
	}
	const mode = typeof value.mode === 'string'
		? readOneOf<CardLayoutMode>(value, 'mode', MODE_SET, path)
		: MODE_BY_SURFACE[surface];
	return {
		surface,
		mode,
		label: readString(value, 'label', path),
		scene: readString(value, 'scene', path),
		baseWidth: readNumber(value, 'baseWidth', path),
		aspectRatio: validateAspectRatio(value.aspectRatio, `${path}.aspectRatio`),
		renderer: validateRenderer(
			value.renderer,
			`${path}.renderer`,
			RENDERER_SURFACE_BY_SURFACE[surface],
		),
		renderFields: renderFields === undefined
			? renderFieldsForSurface(surface)
			: renderFields.map((field, index) => validateRenderFieldRule(field, `${path}.renderFields[${index}]`)),
		slots: slots.map((slot, index) => validateSlot(slot, `${path}.slots[${index}]`)),
	};
};

export const parseCardLayoutDraft = (source: string): CardLayoutDraft => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(source);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Invalid card layout JSON: ${message}`);
	}

	if (!isRecord(parsed)) throw new Error('Card layout draft must be an object');
	if (parsed.schema !== CARD_LAYOUT_SCHEMA) {
		throw new Error(`Card layout schema must be ${CARD_LAYOUT_SCHEMA}`);
	}

	const surfaces = parsed.surfaces;
	if (!Array.isArray(surfaces)) throw new Error('Card layout draft surfaces must be an array');
	return {
		schema: CARD_LAYOUT_SCHEMA,
		updatedAt: readString(parsed, 'updatedAt', 'draft'),
		surfaces: surfaces.map((surface, index) => validateSurface(surface, `draft.surfaces[${index}]`)),
	};
};
