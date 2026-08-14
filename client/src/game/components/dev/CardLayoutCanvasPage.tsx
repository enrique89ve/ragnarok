/**
 * Card Layout Canvas — dev-only route.
 *
 * Manual slot editor for the canonical NFT card frame. Lets a designer /
 * engineer pick one of the three real render phases (collection, pre-game,
 * gameplay), drag any of the 11 frame slots (art, mana, name, keywords,
 * description, tribe, attack, health, rarity, badge, count) on a scaled stage,
 * and produce a normalized JSON layout draft keyed to
 * `norse-card-layout-draft/v1`.
 *
 * The same draft shape the production card frame consumes. Aspect-locked slots
 * preserve w/h ratio while dragged.
 *
 * Access: only mounted when `import.meta.env.DEV` is true (gated in App.tsx).
 * The lazy chunk is excluded from production builds via `import.meta.glob`.
 *
 * Trust boundary: this page never touches matchmaking, account state, or chain
 * APIs. It writes only to React state + `localStorage`.
 *
 * Keyboard focus: all interactive controls (slots, buttons, inputs, textarea)
 * expose a visible :focus-visible style defined in CardLayoutCanvasPage.css.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Copy, FlaskConical } from 'lucide-react';
import {
	MetaPageHeader,
	MetaPageHeaderButton,
	MetaPageHeaderLink,
} from '../../../components/navigation/MetaPageHeader';
import { routes } from '../../../lib/routes';
import {
	CARD_LAYOUT_SCHEMA,
	CARD_LAYOUT_CARD_TYPES,
	CARD_LAYOUT_FIELD_PRIORITIES,
	DEFAULT_CARD_LAYOUT_DRAFT,
	cloneCardLayoutDraft,
	createDefaultCardLayoutDraft,
	parseCardLayoutDraft,
	serializeCardLayoutDraft,
	updateCardLayoutRenderField,
	updateCardLayoutSlot,
	type CardLayoutDraft,
	type CardLayoutCardType,
	type CardLayoutFieldPriority,
	type CardLayoutRenderFieldRule,
	type CardLayoutSlot,
	type CardLayoutSlotId,
	type CardLayoutSurface,
	type CardLayoutSurfaceDraft,
} from '../card/cardLayoutDraft';
import {
	buildCardLayoutRenderData,
	serializeCardLayoutRenderData,
	type CardLayoutRenderData,
	type CardLayoutRenderedCardData,
	type CardLayoutRenderedSlot,
	type CardLayoutSlotValue,
} from '../card/cardLayoutRenderData';
import {
	CARD_KEYWORD_SEMANTICS,
	getCardKeywordsForSurface,
	getCardKeywordRenderImportance,
	getCardKeywordSemantics,
	CARD_PRESENTATION_SURFACES,
	shouldRenderCardKeywordOnSurface,
	type CardKeywordFunction,
	type CardKeywordSemantics,
	type CardPresentationSurface,
	type CardRenderImportance,
} from '../card/cardPresentationContract';
import { toSimpleCardData } from '../card/cardDataAdapter';
import type { SimpleCardData } from '../card/SimpleCardCompat';
import { KEYWORD_ICON_MAP } from '../ui/CardIconsSVG';
import {
	CollectionCardTile,
	type CollectionTileCard,
	type CollectionTileRenderedFields,
	type CollectionTileStats,
} from '../collection/CollectionCardTile';
import { RARITY, type Rarity } from '@shared/schemas/rarity';
import { sampleForRarity, resolveSample } from './cardLab/sampleCards';
import { DEFAULT_PORTRAIT, getCardArtPath } from '../../utils/art/artMapping';
import { ELEMENT_BAND } from '../../utils/art/elementBand';
import './CardLayoutCanvasPage.css';

// v4 resets the editor's saved baseline after the composite description/
// keyword slots were given an explicit centered relationship.
const STORAGE_KEY = 'norse:card-layout-canvas-draft:v4';
const STAGE_MAX_WIDTH = 520;
const STAGE_ZOOM = 2.1;

type MoveScope = 'single' | 'same' | 'all';
type CanvasSegment = 'layout' | 'keywords' | 'frame';
type KeywordIconTone = 'choice' | 'combat' | 'filter' | 'poker' | 'progression' | 'resource' | 'state' | 'summon' | 'theme' | 'trigger';

const cloneDraft = cloneCardLayoutDraft;

const KEYWORD_PREVIEW_LIMITS = {
	collection: 4,
	pregame: 3,
	gameplay: 2,
} satisfies Record<CardPresentationSurface, number>;

const KEYWORD_FUNCTION_TONES = {
	filter: 'filter',
	trigger: 'trigger',
	'static-combat-rule': 'combat',
	'targeting-rule': 'combat',
	'state-rule': 'state',
	'resource-rule': 'resource',
	'choice-rule': 'choice',
	'progression-rule': 'progression',
	'summon-rule': 'summon',
	'card-generation': 'choice',
	'deck-construction': 'filter',
	'poker-rule': 'poker',
	'theme-marker': 'theme',
} satisfies Record<CardKeywordFunction, KeywordIconTone>;

const KEYWORD_ICON_LOOKUP: Readonly<Record<string, React.FC<React.SVGProps<SVGSVGElement>> | undefined>> = KEYWORD_ICON_MAP;

const KEYWORD_CATALOG = Object.values(CARD_KEYWORD_SEMANTICS).sort((a, b) => a.label.localeCompare(b.label));

const keywordToneFor = (semantics: CardKeywordSemantics): KeywordIconTone => {
	const primaryFunction = semantics.functions[0];
	return primaryFunction === undefined ? 'filter' : KEYWORD_FUNCTION_TONES[primaryFunction];
};

const formatKeywordFunction = (value: CardKeywordFunction): string => value.replace(/-/g, ' ');

const formatSurfaceLabel = (surface: CardPresentationSurface): string => {
	if (surface === 'pregame') return 'Pre-game';
	return surface.charAt(0).toUpperCase() + surface.slice(1);
};

const loadStoredDraft = (): CardLayoutDraft | null => {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (raw === null) return null;
		return parseCardLayoutDraft(raw);
	} catch {
		return null;
	}
};

const saveDraft = (draft: CardLayoutDraft): void => {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, serializeCardLayoutDraft(draft));
	} catch {
		// localStorage may be disabled; editor still works in-memory.
	}
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

const snapTo = (value: number, grid: number): number => Math.round(value / grid) * grid;

const clampMeasure = (value: number): number => Math.max(1, Math.min(100, value));

const visualSlotAspect = (
	slot: Pick<CardLayoutSlot, 'w' | 'h'>,
	surface: Pick<CardLayoutSurfaceDraft, 'aspectRatio'>,
): number => (slot.w * surface.aspectRatio.width) / (slot.h * surface.aspectRatio.height);

const heightForVisualAspect = (
	width: number,
	visualAspect: number,
	surface: Pick<CardLayoutSurfaceDraft, 'aspectRatio'>,
): number => (width * surface.aspectRatio.width) / (visualAspect * surface.aspectRatio.height);

const widthForVisualAspect = (
	height: number,
	visualAspect: number,
	surface: Pick<CardLayoutSurfaceDraft, 'aspectRatio'>,
): number => (visualAspect * height * surface.aspectRatio.height) / surface.aspectRatio.width;

const resolveSizePatch = (
	slot: CardLayoutSlot,
	surface: CardLayoutSurfaceDraft,
	field: 'w' | 'h',
	value: number,
): Pick<CardLayoutSlot, 'w' | 'h'> => {
	if (!slot.aspectLocked) {
		return field === 'w'
			? { w: clampMeasure(value), h: slot.h }
			: { w: slot.w, h: clampMeasure(value) };
	}
	const visualAspect = visualSlotAspect(slot, surface);
	if (!Number.isFinite(visualAspect) || visualAspect <= 0) {
		return field === 'w'
			? { w: clampMeasure(value), h: slot.h }
			: { w: slot.w, h: clampMeasure(value) };
	}
	if (field === 'w') {
		const width = clampMeasure(value);
		const height = clampMeasure(heightForVisualAspect(width, visualAspect, surface));
		return { w: width, h: height };
	}
	const height = clampMeasure(value);
	const width = clampMeasure(widthForVisualAspect(height, visualAspect, surface));
	return { w: width, h: height };
};

const sameLayer = (id: CardLayoutSlotId): 'corner' | 'stats' | 'body' => {
	if (id === 'art' || id === 'mana' || id === 'badge' || id === 'count' || id === 'rarity') return 'corner';
	if (id === 'attack' || id === 'health') return 'stats';
	return 'body';
};

const formatSlotValue = (value: CardLayoutSlotValue): string => {
	if (value.kind === 'empty') return '';
	if (value.kind === 'image') return '';
	if (value.kind === 'list') return value.value.join(' · ');
	return value.value;
};

const renderSlotInner = (slot: CardLayoutRenderedSlot): React.ReactNode => {
	if (slot.value.kind === 'image') {
		return (
			<div
				className="card-layout-canvas-real-slot__image"
				style={{ backgroundImage: `url(${slot.value.value})` }}
				aria-hidden="true"
			/>
		);
	}
	const text = formatSlotValue(slot.value);
	return <span>{text}</span>;
};

const toCollectionTileCard = (card: SimpleCardData): CollectionTileCard => {
	const numericId = Number(card.id);
	return {
		id: Number.isFinite(numericId) ? numericId : 0,
		name: card.name,
		rarity: card.rarity ?? 'common',
		type: card.type,
		heroClass: card.cardClass ?? 'neutral',
		quantity: 2,
		collectionSource: 'qa_full_catalog',
		...(card.description !== undefined ? { description: card.description } : {}),
		...(card.element !== undefined ? { element: card.element } : {}),
		...(card.attack !== undefined ? { attack: card.attack } : {}),
		...(card.health !== undefined ? { health: card.health } : {}),
		...(card.manaCost !== undefined ? { manaCost: card.manaCost } : {}),
	};
};

const isSlotVisible = (
	slots: readonly CardLayoutRenderedSlot[],
	slotId: CardLayoutSlotId,
): boolean => slots.some((slot) => slot.id === slotId && slot.visible);

const renderFieldRuleFor = (
	renderData: CardLayoutRenderData,
	slotId: CardLayoutSlotId,
): CardLayoutRenderFieldRule | undefined => (
	renderData.surface.renderFields.find((field) => field.id === slotId)
);

const renderFieldAppliesToCard = (
	rule: CardLayoutRenderFieldRule | undefined,
	card: SimpleCardData,
): boolean => (
	rule !== undefined &&
	rule.enabled &&
	rule.priority !== 'hidden' &&
	rule.cardTypes.includes(card.type) &&
	rule.rarities.includes(card.rarity ?? 'common')
);

const isFieldRendered = (
	renderData: CardLayoutRenderData,
	card: SimpleCardData,
	slotId: CardLayoutSlotId,
): boolean => (
	isSlotVisible(renderData.slots, slotId) &&
	renderFieldAppliesToCard(renderFieldRuleFor(renderData, slotId), card)
);

const fieldsForRenderData = (
	renderData: CardLayoutRenderData,
	card: SimpleCardData,
): CollectionTileRenderedFields => {
	const renderedKeywords = getCardKeywordsForSurface(card.keywords, renderData.surface.surface);
	return {
		showArt: isFieldRendered(renderData, card, 'art'),
		showCount: isFieldRendered(renderData, card, 'count'),
		showMana: isFieldRendered(renderData, card, 'mana'),
		showName: isFieldRendered(renderData, card, 'name'),
		showRarity: isFieldRendered(renderData, card, 'rarity'),
		showStats: isFieldRendered(renderData, card, 'attack') || isFieldRendered(renderData, card, 'health'),
		...(isFieldRendered(renderData, card, 'tribe') && card.tribe ? { tribe: card.tribe } : {}),
		...(isFieldRendered(renderData, card, 'description') && card.description ? { description: card.description } : {}),
		...(isFieldRendered(renderData, card, 'keywords') && renderedKeywords.length > 0 ? { keywords: renderedKeywords } : {}),
		keywordLimit: null,
		keywordLabelMode: renderData.surface.surface === 'gameplay' ? 'compact' : 'full',
	};
};

const statsForCard = (card: SimpleCardData): CollectionTileStats | undefined => {
	if (card.attack === undefined || card.health === undefined) return undefined;
	return {
		attack: { value: card.attack, tone: 'base' },
		health: { value: card.health, tone: 'base' },
	};
};

const compactList = (items: readonly string[], allCount: number): string => (
	items.length === allCount ? 'all' : items.join(', ')
);

const valueForRule = (
	renderData: CardLayoutRenderData,
	rule: CardLayoutRenderFieldRule,
): string => {
	const slot = renderData.slots.find((candidate) => candidate.id === rule.id);
	if (slot === undefined) return '—';
	const value = formatSlotValue(slot.value);
	return value.length > 0 ? value : '—';
};

const RenderFieldAudit: React.FC<{
	readonly renderData: CardLayoutRenderData;
	readonly card: SimpleCardData;
}> = ({ renderData, card }) => (
	<div className="card-layout-render-fields" aria-label="Rendered fields">
		<div className="card-layout-render-fields__context">
			<span>{card.type}</span>
			<span>{card.rarity ?? 'common'}</span>
			<span>{renderData.surface.surface}</span>
		</div>
		<div className="card-layout-render-fields__table">
			{renderData.surface.renderFields.map((rule) => {
				const slotVisible = isSlotVisible(renderData.slots, rule.id);
				const applies = renderFieldAppliesToCard(rule, card);
				const rendered = slotVisible && applies;
				const slot = renderData.slots.find((candidate) => candidate.id === rule.id);
				const semantics = slot?.semantics;
				const rowClassName = [
					'card-layout-render-field',
					`card-layout-render-field--${rule.priority}`,
					rendered ? 'card-layout-render-field--rendered' : 'card-layout-render-field--muted',
				].join(' ');
				return (
					<div className={rowClassName} key={rule.id}>
						<div className="card-layout-render-field__main">
							<strong>{rule.label}</strong>
							<span>{valueForRule(renderData, rule)}</span>
						</div>
						<div className="card-layout-render-field__meta">
							<span>{rule.priority}</span>
							<span>{rendered ? 'rendered' : applies ? 'slot hidden' : 'filtered'}</span>
							<span>{semantics?.render ?? 'unknown'}</span>
							<span>{semantics?.purpose.join(', ') ?? 'unknown'}</span>
							<span>{compactList(rule.cardTypes, 9)}</span>
							<span>{compactList(rule.rarities, 4)}</span>
						</div>
					</div>
				);
			})}
		</div>
	</div>
);

const toggleListValue = <T extends string>(
	items: readonly T[],
	value: T,
): readonly T[] => (
	items.includes(value)
		? items.filter((item) => item !== value)
		: [...items, value]
);

const rarityShortLabel = (rarity: Rarity): string => {
	if (rarity === 'common') return 'Com';
	if (rarity === 'rare') return 'Rare';
	if (rarity === 'epic') return 'Epic';
	return 'Myth';
};

const RenderFieldEditor: React.FC<{
	readonly rules: readonly CardLayoutRenderFieldRule[];
	readonly slots: readonly CardLayoutSlot[];
	readonly selectedSlotId: CardLayoutSlotId;
	readonly onPatch: (slotId: CardLayoutSlotId, patch: Partial<Pick<CardLayoutRenderFieldRule, 'enabled' | 'priority' | 'cardTypes' | 'rarities'>>) => void;
	readonly onSelectSlot: (slotId: CardLayoutSlotId) => void;
	readonly onSlotVisibleChange: (slotId: CardLayoutSlotId, visible: boolean) => void;
}> = ({
	rules,
	slots,
	selectedSlotId,
	onPatch,
	onSelectSlot,
	onSlotVisibleChange,
}) => {
	const slotVisibleById = useMemo(() => new Map(slots.map((slot) => [slot.id, slot.visible])), [slots]);

	return (
		<div className="card-layout-field-editor" aria-label="Render field editor">
			{rules.map((rule) => {
				const slotVisible = slotVisibleById.get(rule.id) ?? false;
				const selected = selectedSlotId === rule.id;
				return (
					<article
						key={rule.id}
						className={[
							'card-layout-field-editor__rule',
							rule.enabled ? 'card-layout-field-editor__rule--enabled' : 'card-layout-field-editor__rule--disabled',
							selected ? 'card-layout-field-editor__rule--selected' : '',
						].filter(Boolean).join(' ')}
					>
						<header className="card-layout-field-editor__rule-head">
							<label className="card-layout-field-editor__enabled">
								<input
									type="checkbox"
									checked={rule.enabled}
									onChange={(event) => onPatch(rule.id, { enabled: event.target.checked })}
								/>
								<span>{rule.label}</span>
							</label>
							<div className="card-layout-field-editor__actions">
								<button
									type="button"
									className={[
										'card-layout-field-editor__small-button',
										slotVisible ? 'card-layout-field-editor__small-button--active' : '',
									].filter(Boolean).join(' ')}
									onClick={() => onSlotVisibleChange(rule.id, !slotVisible)}
								>
									Slot {slotVisible ? 'on' : 'off'}
								</button>
								<button
									type="button"
									className={[
										'card-layout-field-editor__small-button',
										selected ? 'card-layout-field-editor__small-button--active' : '',
									].filter(Boolean).join(' ')}
									onClick={() => onSelectSlot(rule.id)}
								>
									Focus
								</button>
							</div>
						</header>
						<label className="card-layout-field-editor__priority">
							<span>Priority</span>
							<select
								value={rule.priority}
								onChange={(event) => onPatch(rule.id, { priority: event.target.value as CardLayoutFieldPriority })}
							>
								{CARD_LAYOUT_FIELD_PRIORITIES.map((priority) => (
									<option key={priority} value={priority}>{priority}</option>
								))}
							</select>
						</label>
						<div className="card-layout-field-editor__chips" aria-label={`${rule.label} card types`}>
							{CARD_LAYOUT_CARD_TYPES.map((cardType) => {
								const active = rule.cardTypes.includes(cardType);
								return (
									<button
										key={cardType}
										type="button"
										className={[
											'card-layout-field-editor__chip',
											active ? 'card-layout-field-editor__chip--active' : '',
										].filter(Boolean).join(' ')}
										onClick={() => onPatch(rule.id, { cardTypes: toggleListValue<CardLayoutCardType>(rule.cardTypes, cardType) })}
									>
										{cardType}
									</button>
								);
							})}
						</div>
						<div className="card-layout-field-editor__chips card-layout-field-editor__chips--rarity" aria-label={`${rule.label} rarities`}>
							{RARITY.map((candidate) => {
								const active = rule.rarities.includes(candidate);
								return (
									<button
										key={candidate}
										type="button"
										className={[
											'card-layout-field-editor__chip',
											'card-layout-field-editor__chip--rarity',
											active ? 'card-layout-field-editor__chip--active' : '',
										].filter(Boolean).join(' ')}
										data-rarity={candidate}
										onClick={() => onPatch(rule.id, { rarities: toggleListValue<Rarity>(rule.rarities, candidate) })}
									>
										{rarityShortLabel(candidate)}
									</button>
								);
							})}
						</div>
					</article>
				);
			})}
		</div>
	);
};

const KeywordContractAudit: React.FC<{
	readonly keywords: readonly string[];
	readonly surface: CardPresentationSurface;
}> = ({ keywords, surface }) => {
	const uniqueKeywords = Array.from(new Set(keywords));
	if (uniqueKeywords.length === 0) return null;
	return (
		<div className="card-layout-keyword-contract" aria-label="Keyword contract">
			{uniqueKeywords.map((keyword) => {
				const semantics = getCardKeywordSemantics(keyword);
				const importance = getCardKeywordRenderImportance(keyword, surface);
				const rendered = shouldRenderCardKeywordOnSurface(keyword, surface);
				return (
					<div
						key={keyword}
						className={[
							'card-layout-keyword-contract__row',
							rendered ? 'card-layout-keyword-contract__row--rendered' : 'card-layout-keyword-contract__row--hidden',
						].join(' ')}
					>
						<strong>{semantics.label}</strong>
						<span>{semantics.functions.join(', ')}</span>
						<span>{semantics.filterable ? 'filter' : 'no filter'}</span>
						<span>{surface}: {importance}</span>
						<span>{rendered ? 'rendered' : 'not rendered'}</span>
					</div>
				);
			})}
		</div>
	);
};

const KeywordIconMark: React.FC<{
	readonly semantics: CardKeywordSemantics;
	readonly size?: 'compact' | 'large';
}> = ({ semantics, size = 'large' }) => {
	const Icon = KEYWORD_ICON_LOOKUP[semantics.keyword];
	if (Icon === undefined) {
		return (
			<span className={`card-layout-keyword-icon card-layout-keyword-icon--${size}`}>
				<span className="card-layout-keyword-icon__fallback">{semantics.compactLabel}</span>
			</span>
		);
	}
	return (
		<span className={`card-layout-keyword-icon card-layout-keyword-icon--${size}`}>
			<Icon aria-hidden="true" focusable="false" />
		</span>
	);
};

const KeywordSurfaceBadge: React.FC<{
	readonly surface: CardPresentationSurface;
	readonly importance: CardRenderImportance;
	readonly rendered: boolean;
}> = ({ surface, importance, rendered }) => (
	<span
		className={[
			'card-layout-keyword-surface',
			`card-layout-keyword-surface--${importance}`,
			rendered ? 'card-layout-keyword-surface--rendered' : 'card-layout-keyword-surface--hidden',
		].join(' ')}
	>
		<span>{formatSurfaceLabel(surface)}</span>
		<strong>{importance}</strong>
	</span>
);

const KeywordIconCatalog: React.FC<{
	readonly surface: CardPresentationSurface;
	readonly onSurfaceChange: (surface: CardPresentationSurface) => void;
}> = ({ surface, onSurfaceChange }) => {
	const visibleKeywordsForSurface = getCardKeywordsForSurface(Object.keys(CARD_KEYWORD_SEMANTICS), surface);
	const previewLimit = KEYWORD_PREVIEW_LIMITS[surface];
	const previewKeywords = visibleKeywordsForSurface.slice(0, previewLimit);
	const overflowCount = Math.max(0, visibleKeywordsForSurface.length - previewKeywords.length);
	const mappedIconCount = KEYWORD_CATALOG.filter((semantics) => KEYWORD_ICON_LOOKUP[semantics.keyword] !== undefined).length;

	return (
		<section className="card-layout-keyword-catalog" aria-label="Keyword icon catalog">
			<header className="card-layout-keyword-catalog__header">
				<div>
					<h2 className="card-layout-keyword-catalog__title">Keywords</h2>
					<p className="card-layout-keyword-catalog__subtitle">
						{mappedIconCount}/{KEYWORD_CATALOG.length} icons · preview cap {previewLimit} · {formatSurfaceLabel(surface)}
					</p>
				</div>
				<label className="card-layout-canvas-field card-layout-keyword-catalog__surface-select">
					<span>Surface</span>
					<select
						value={surface}
						onChange={(event) => onSurfaceChange(event.target.value as CardPresentationSurface)}
					>
						{CARD_PRESENTATION_SURFACES.map((candidate) => (
							<option key={candidate} value={candidate}>{formatSurfaceLabel(candidate)}</option>
						))}
					</select>
				</label>
			</header>

			<div className="card-layout-keyword-preview" aria-label={`${formatSurfaceLabel(surface)} keyword preview`}>
				<div className="card-layout-keyword-preview__rail">
					{previewKeywords.map((keyword) => {
						const semantics = getCardKeywordSemantics(keyword);
						return (
							<span
								key={keyword}
								className="card-layout-keyword-preview__item"
								data-tone={keywordToneFor(semantics)}
								title={`${semantics.label}: ${semantics.description}`}
							>
								<KeywordIconMark semantics={semantics} size="compact" />
								<span>{semantics.compactLabel}</span>
							</span>
						);
					})}
					{overflowCount > 0 && (
						<span className="card-layout-keyword-preview__overflow">+{overflowCount}</span>
					)}
				</div>
				<div className="card-layout-keyword-preview__caps">
					{CARD_PRESENTATION_SURFACES.map((candidate) => (
						<span key={candidate}>{formatSurfaceLabel(candidate)} {KEYWORD_PREVIEW_LIMITS[candidate]}</span>
					))}
				</div>
			</div>

			<div className="card-layout-keyword-grid">
				{KEYWORD_CATALOG.map((semantics) => {
					const tone = keywordToneFor(semantics);
					const currentImportance = getCardKeywordRenderImportance(semantics.keyword, surface);
					const renderedOnSurface = shouldRenderCardKeywordOnSurface(semantics.keyword, surface);
					return (
						<article
							key={semantics.keyword}
							className={[
								'card-layout-keyword-card',
								renderedOnSurface ? 'card-layout-keyword-card--surface-visible' : 'card-layout-keyword-card--surface-hidden',
							].join(' ')}
							data-tone={tone}
							data-importance={currentImportance}
						>
							<header className="card-layout-keyword-card__header">
								<KeywordIconMark semantics={semantics} />
								<div className="card-layout-keyword-card__identity">
									<h3>{semantics.label}</h3>
									<span>{semantics.compactLabel}</span>
								</div>
							</header>
							<p className="card-layout-keyword-card__description">{semantics.description}</p>
							<div className="card-layout-keyword-card__functions" aria-label={`${semantics.label} functions`}>
								{semantics.functions.map((fn) => (
									<span key={fn}>{formatKeywordFunction(fn)}</span>
								))}
							</div>
							<div className="card-layout-keyword-card__surfaces" aria-label={`${semantics.label} surface contract`}>
								{CARD_PRESENTATION_SURFACES.map((candidate) => (
									<KeywordSurfaceBadge
										key={candidate}
										surface={candidate}
										importance={semantics[candidate]}
										rendered={shouldRenderCardKeywordOnSurface(semantics.keyword, candidate)}
									/>
								))}
							</div>
						</article>
					);
				})}
			</div>
		</section>
	);
};

const RealCardRenderer: React.FC<{
	readonly renderData: CardLayoutRenderData;
	readonly card: SimpleCardData;
	readonly variant: 'canvas' | 'preview';
}> = ({ renderData, card, variant }) => {
	const slotStyle = useMemo(() => {
		const style: React.CSSProperties & { [key: `--card-layout-slot-${string}`]: string } = { maxWidth: 'none' };
		for (const slot of renderData.slots) {
			style[`--card-layout-slot-${slot.id}-x`] = slot.css.left;
			style[`--card-layout-slot-${slot.id}-y`] = slot.css.top;
			style[`--card-layout-slot-${slot.id}-w`] = slot.css.width;
			style[`--card-layout-slot-${slot.id}-h`] = slot.css.height;
			style[`--card-layout-slot-${slot.id}-font-scale`] = slot.css['--slot-font-scale'];
			style[`--card-layout-slot-${slot.id}-display`] = slot.visible ? 'flex' : 'none';
		}
		return style;
	}, [renderData.slots]);

	return (
		<CollectionCardTile
			card={toCollectionTileCard(card)}
			dataCardSurface={renderData.surface.renderer.surface}
			fields={fieldsForRenderData(renderData, card)}
			frameClassName={`card-layout-real-frame card-layout-real-frame--${variant} card-layout-real-frame--surface-${renderData.surface.surface}`}
			frameSize={renderData.surface.renderer.size}
			frameStyle={variant === 'canvas' ? { ...slotStyle, height: '100%' } : slotStyle}
			shellClassName={`card-layout-real-shell card-layout-real-shell--${variant}`}
			shellStyle={variant === 'canvas' ? { height: '100%' } : undefined}
			stats={statsForCard(card)}
		/>
	);
};

const FrameStudy: React.FC<{
	readonly card: SimpleCardData;
	readonly draft: CardLayoutDraft;
	readonly rarity: Rarity;
	readonly renderData: CardLayoutRenderData;
	readonly surfaceId: CardLayoutSurface;
	readonly onRarityChange: (rarity: Rarity) => void;
	readonly onSurfaceChange: (surface: CardLayoutSurface) => void;
}> = ({ card, draft, rarity, renderData, surfaceId, onRarityChange, onSurfaceChange }) => (
	<main className="card-layout-frame-study">
		<header className="card-layout-frame-study__intro">
			<div>
				<p className="card-layout-frame-study__eyebrow">Isolated preview</p>
				<h2>Minimal frame study</h2>
				<p>
					A thicker silhouette built from three quiet material planes. The PNG owns only the frame;
					card art, values, labels and rarity remain independent layers.
				</p>
			</div>
			<div className="card-layout-frame-study__controls">
				<label className="card-layout-canvas-field">
					<span>Surface</span>
					<select value={surfaceId} onChange={(event) => onSurfaceChange(event.target.value as CardLayoutSurface)}>
						{draft.surfaces.map((surface) => (
							<option key={surface.surface} value={surface.surface}>{surface.label}</option>
						))}
					</select>
				</label>
				<label className="card-layout-canvas-field">
					<span>Sample</span>
					<select value={rarity} onChange={(event) => onRarityChange(event.target.value as Rarity)}>
						{RARITY.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}
					</select>
				</label>
			</div>
		</header>

		<div className="card-layout-frame-study__comparison">
			<article className="card-layout-frame-study__option">
				<header>
					<p className="card-layout-frame-study__eyebrow">Baseline</p>
					<h3>Current CSS frame</h3>
					<p>Thin inner line, restrained shadow and the existing independent rarity marker.</p>
				</header>
				<div className="card-layout-frame-study__card">
					<RealCardRenderer renderData={renderData} card={card} variant="preview" />
				</div>
			</article>

			<article className="card-layout-frame-study__option card-layout-frame-study__option--candidate">
				<header>
					<p className="card-layout-frame-study__eyebrow">PNG concept · v4</p>
					<h3>Minimal war-table frame</h3>
					<p>Half-weight inner rail, compact stat sockets, a tighter upper corner and no rarity shape baked into the asset.</p>
				</header>
				<div className="card-layout-frame-study__card card-layout-frame-study__card--concept">
					<RealCardRenderer renderData={renderData} card={card} variant="preview" />
				</div>
			</article>
		</div>

		<dl className="card-layout-frame-study__facts">
			<div><dt>Frame weight</dt><dd>3.5–3.8% side rails</dd></div>
			<div><dt>Art contract</dt><dd>7:10 · cover · centered</dd></div>
			<div><dt>Rarity</dt><dd>Dynamic SVG · upper layer</dd></div>
			<div><dt>Status</dt><dd>Preview only · not applied</dd></div>
		</dl>
	</main>
);

const StageSlot: React.FC<{
	slot: CardLayoutRenderedSlot;
	selected: boolean;
	draggable: boolean;
	onPointerDown: (event: React.PointerEvent<HTMLDivElement>, id: CardLayoutSlotId) => void;
}> = ({ slot, selected, draggable, onPointerDown }) => {
	const cls = [
		'card-layout-canvas-slot',
		slot.visible ? '' : 'card-layout-canvas-slot--hidden',
		selected ? 'card-layout-canvas-slot--selected' : '',
		slot.aspectLocked ? 'card-layout-canvas-slot--aspect-locked' : '',
		`card-layout-canvas-slot--${slot.id}`,
	].filter(Boolean).join(' ');
	const style: React.CSSProperties = {
		left: slot.css.left,
		top: slot.css.top,
		width: slot.css.width,
		height: slot.css.height,
		fontSize: `calc(var(--slot-font-scale, 1) * 0.65rem)`,
	};
	return (
		<div
			className={cls}
			style={style}
			onPointerDown={draggable ? (e) => onPointerDown(e, slot.id) : undefined}
			role={draggable ? 'button' : undefined}
			tabIndex={draggable ? 0 : -1}
			aria-label={`${slot.label} slot`}
		>
			<span>{slot.label}</span>
		</div>
	);
};

const CardLayoutCanvasPage: React.FC = () => {
	const [draft, setDraft] = useState<CardLayoutDraft>(() => loadStoredDraft() ?? cloneDraft(DEFAULT_CARD_LAYOUT_DRAFT));
	const [surfaceId, setSurfaceId] = useState<CardLayoutSurface>('collection');
	const [selectedSlotId, setSelectedSlotId] = useState<CardLayoutSlotId>('mana');
	const [rarity, setRarity] = useState<Rarity>('mythic');
	const [jsonText, setJsonText] = useState<string>(() => serializeCardLayoutDraft(loadStoredDraft() ?? DEFAULT_CARD_LAYOUT_DRAFT));
	const [jsonError, setJsonError] = useState<string | null>(null);
	const [moveScope, setMoveScope] = useState<MoveScope>('single');
	const [snap, setSnap] = useState(true);
	const [activeSegment, setActiveSegment] = useState<CanvasSegment>('layout');

	const stageRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<{ id: CardLayoutSlotId; startX: number; startY: number; startSlotX: number; startSlotY: number } | null>(null);

	const surface = useMemo<CardLayoutSurfaceDraft>(() => {
		const found = draft.surfaces.find(s => s.surface === surfaceId);
		if (found !== undefined) return found;
		return draft.surfaces[0];
	}, [draft, surfaceId]);

	const selectedSlot = useMemo<CardLayoutSlot>(
		() => surface.slots.find(s => s.id === selectedSlotId) ?? surface.slots[0],
		[surface, selectedSlotId],
	);

	const sample = useMemo(() => sampleForRarity(rarity), [rarity]);
	const sampleCardData = useMemo(() => resolveSample(sample), [sample]);
	const simpleCard = useMemo(() => toSimpleCardData(sampleCardData), [sampleCardData]);
	const artPath = useMemo(() => getCardArtPath(sampleCardData.id) ?? DEFAULT_PORTRAIT, [sampleCardData.id]);

	const renderData = useMemo(() => {
		if (simpleCard === null) return null;
		return buildCardLayoutRenderData({ surface, card: simpleCard, artPath });
	}, [surface, simpleCard, artPath]);

	const cardRenderMeta: CardLayoutRenderedCardData | null = renderData?.card ?? null;
	const renderJson = useMemo(() => renderData === null ? '{}' : serializeCardLayoutRenderData(renderData), [renderData]);

	useEffect(() => {
		setJsonText(serializeCardLayoutDraft(draft));
	}, [draft]);

	const stageWidth = useMemo(() => Math.min(STAGE_MAX_WIDTH, Math.round(surface.baseWidth * STAGE_ZOOM)), [surface.baseWidth]);

	const onPointerDownSlot = useCallback((event: React.PointerEvent<HTMLDivElement>, id: CardLayoutSlotId) => {
		const stage = stageRef.current;
		if (stage === null) return;
		const slot = surface.slots.find(s => s.id === id);
		if (slot === undefined) return;
		setSelectedSlotId(id);
		stage.setPointerCapture(event.pointerId);
		dragRef.current = {
			id,
			startX: event.clientX,
			startY: event.clientY,
			startSlotX: slot.x,
			startSlotY: slot.y,
		};
	}, [surface]);

	const onPointerMoveStage = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (drag === null) return;
		const stage = stageRef.current;
		if (stage === null) return;
		const rect = stage.getBoundingClientRect();
		const scaleX = 100 / rect.width;
		const scaleY = 100 / rect.height;
		const dx = (event.clientX - drag.startX) * scaleX;
		const dy = (event.clientY - drag.startY) * scaleY;
		const applyDelta = (slot: CardLayoutSlot, startX: number, startY: number): CardLayoutSlot => {
			const rawX = clampPercent(snap ? snapTo(startX + dx, 0.5) : startX + dx);
			const rawY = clampPercent(snap ? snapTo(startY + dy, 0.5) : startY + dy);
			return { ...slot, x: rawX, y: rawY };
		};
		setDraft(prev => {
			const surfaceDraft = prev.surfaces.find(s => s.surface === surfaceId);
			if (surfaceDraft === undefined) return prev;
			const updatedSlots = surfaceDraft.slots.map(slot => {
				if (slot.id === drag.id) return applyDelta(slot, drag.startSlotX, drag.startSlotY);
				if (moveScope === 'all') return applyDelta(slot, slot.x, slot.y);
				if (moveScope === 'same' && sameLayer(slot.id) === sameLayer(drag.id)) {
					return applyDelta(slot, slot.x, slot.y);
				}
				return slot;
			});
			return updateCardLayoutSlot({ ...prev, surfaces: prev.surfaces.map(s => s.surface === surfaceId ? { ...s, slots: updatedSlots } : s) }, surfaceId, drag.id, {});
		});
	}, [moveScope, snap, surfaceId]);

	const onPointerUpStage = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
		const stage = stageRef.current;
		if (stage !== null && stage.hasPointerCapture(event.pointerId)) {
			stage.releasePointerCapture(event.pointerId);
		}
		dragRef.current = null;
	}, []);

	const updateSelected = useCallback((patch: Partial<CardLayoutSlot>) => {
		setDraft(prev => updateCardLayoutSlot(prev, surfaceId, selectedSlotId, patch));
	}, [surfaceId, selectedSlotId]);

	const updateRenderField = useCallback((
		slotId: CardLayoutSlotId,
		patch: Partial<Pick<CardLayoutRenderFieldRule, 'enabled' | 'priority' | 'cardTypes' | 'rarities'>>,
	) => {
		setDraft(prev => updateCardLayoutRenderField(prev, surfaceId, slotId, patch));
	}, [surfaceId]);

	const updateSlotVisibility = useCallback((slotId: CardLayoutSlotId, visible: boolean) => {
		setDraft(prev => updateCardLayoutSlot(prev, surfaceId, slotId, { visible }));
	}, [surfaceId]);

	const handleReset = useCallback(() => {
		setDraft(createDefaultCardLayoutDraft());
		setJsonError(null);
	}, []);

	const handleCopy = useCallback(async () => {
		const text = serializeCardLayoutDraft(draft);
		setJsonText(text);
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
				await navigator.clipboard.writeText(text);
			}
		} catch {
			// Clipboard may be blocked; the textarea still reflects the latest.
		}
	}, [draft]);

	const handleApplyJson = useCallback(() => {
		try {
			const parsed = parseCardLayoutDraft(jsonText);
			setDraft(parsed);
			setJsonError(null);
		} catch (err) {
			setJsonError(err instanceof Error ? err.message : 'Invalid draft JSON');
		}
	}, [jsonText]);

	const stageStyle = useMemo<React.CSSProperties>(() => ({
		width: `${stageWidth}px`,
		height: 'auto',
		maxWidth: '100%',
		aspectRatio: `${surface.aspectRatio.width} / ${surface.aspectRatio.height}`,
	}), [stageWidth, surface.aspectRatio]);

	const aspectRatio = useMemo(() => {
		if (selectedSlot.w <= 0 || selectedSlot.h <= 0) return '—';
		const visualAspect = visualSlotAspect(selectedSlot, surface);
		return Number.isFinite(visualAspect) ? `${Number(visualAspect.toFixed(3))}:1` : '—';
	}, [selectedSlot, surface]);

	const elementLabel = useMemo(() => {
		if (cardRenderMeta?.element === null || cardRenderMeta?.element === undefined) return null;
		return ELEMENT_BAND[cardRenderMeta.element as keyof typeof ELEMENT_BAND]?.label ?? null;
	}, [cardRenderMeta?.element]);

	return (
		<div className="card-layout-canvas-page">
			<h1 className="visually-hidden">Card Layout Canvas</h1>
			<MetaPageHeader
				title="Card Layout Canvas"
				kicker={`Dev · ${surface.mode} · ${surface.label} · ${surface.scene} · ${surface.aspectRatio.width}:${surface.aspectRatio.height} · ${surface.renderer.size}`}
				showAccount={false}
				actions={
					<>
						<MetaPageHeaderLink
							to={routes.cardLab}
							icon={FlaskConical}
							aria-label="Open Card Lab"
						>
							Card Lab
						</MetaPageHeaderLink>
						<MetaPageHeaderButton
							icon={RotateCcw}
							onClick={handleReset}
							aria-label="Reset draft"
						>
							Reset
						</MetaPageHeaderButton>
						<MetaPageHeaderButton
							icon={Copy}
							tone="gold"
							onClick={handleCopy}
							aria-label="Copy draft JSON"
						>
							Copy JSON
						</MetaPageHeaderButton>
					</>
				}
			/>
			<header className="card-layout-canvas-page__statusbar" aria-hidden="true">
				<span className="card-layout-canvas-page__statuschip card-layout-canvas-page__statuschip--dev">DEV</span>
				<p className="card-layout-canvas-page__statusline">
					{surface.mode} · {surface.label} · {surface.scene} · {surface.aspectRatio.width}:{surface.aspectRatio.height} · {surface.renderer.size}
				</p>
			</header>
			<div className="card-layout-canvas-page__segments" role="tablist" aria-label="Card layout canvas sections">
				{(['layout', 'keywords', 'frame'] as const).map((segment) => (
					<button
						key={segment}
						type="button"
						role="tab"
						aria-selected={activeSegment === segment}
						className={[
							'card-layout-canvas-page__segment',
							activeSegment === segment ? 'card-layout-canvas-page__segment--active' : '',
						].filter(Boolean).join(' ')}
						onClick={() => setActiveSegment(segment)}
					>
						{segment === 'layout' ? 'Layout' : segment === 'keywords' ? 'Keywords' : 'Frame study'}
					</button>
				))}
			</div>

			{activeSegment === 'layout' ? (
			<main className="card-layout-canvas-page__grid">
				<section className="card-layout-canvas-page__col card-layout-canvas-page__col--left" aria-label="Stage">
					<div className="card-layout-canvas-fieldrow">
						<label className="card-layout-canvas-field">
							<span>Surface</span>
							<select
								value={surfaceId}
								onChange={e => {
									const next = e.target.value as CardLayoutSurface;
									setSurfaceId(next);
									const nextSurface = draft.surfaces.find(s => s.surface === next);
									if (nextSurface !== undefined && nextSurface.slots[0] !== undefined) {
										setSelectedSlotId(nextSurface.slots[0].id);
									}
								}}
							>
								{draft.surfaces.map(candidate => (
									<option key={candidate.surface} value={candidate.surface}>{candidate.label}</option>
								))}
							</select>
						</label>
					</div>
					<div className="card-layout-canvas-fieldrow">
						<label className="card-layout-canvas-field">
							<span>Sample</span>
							<select value={rarity} onChange={e => setRarity(e.target.value as Rarity)}>
								{RARITY.map(r => <option key={r} value={r}>{r}</option>)}
							</select>
						</label>
					</div>

					<div className="card-layout-canvas-stage-wrap">
						<div
							ref={stageRef}
							className="card-layout-canvas-stage"
							style={stageStyle}
							onPointerMove={onPointerMoveStage}
							onPointerUp={onPointerUpStage}
							onPointerCancel={onPointerUpStage}
						>
							{renderData !== null && simpleCard !== null && (
								<div className="card-layout-canvas-stage__underlay" aria-hidden="true">
									<RealCardRenderer
										renderData={renderData}
										card={simpleCard}
										variant="canvas"
									/>
								</div>
							)}
							<div className="card-layout-canvas-stage__overlay">
								{renderData?.slots.map(slot => (
									<StageSlot
										key={slot.id}
										slot={slot}
										selected={slot.id === selectedSlotId}
										draggable
										onPointerDown={onPointerDownSlot}
									/>
								))}
							</div>
						</div>
					</div>
				</section>

				<section className="card-layout-canvas-page__col card-layout-canvas-page__col--middle" aria-label="Slot controls">
					<div className="card-layout-canvas-panel">
						<header className="card-layout-canvas-panel__header card-layout-canvas-panel__header--slot">
							<h2 className="card-layout-canvas-panel__title">Slot</h2>
							<p className="card-layout-canvas-panel__subtitle">{selectedSlot.label}</p>
						</header>
						<label className="card-layout-canvas-field">
							<span>Layer</span>
							<select
								value={selectedSlotId}
								onChange={e => setSelectedSlotId(e.target.value as CardLayoutSlotId)}
							>
								{surface.slots.map(s => (
									<option key={s.id} value={s.id}>{s.label}</option>
								))}
							</select>
						</label>
						<div className="card-layout-canvas-measure-grid">
							{(['x', 'y', 'w', 'h'] as const).map(field => (
								<label key={field} className="card-layout-canvas-measure">
									<span>{field.toUpperCase()}</span>
									<input
										type="number"
										step="0.1"
										value={selectedSlot[field]}
										onChange={e => {
											const n = Number(e.target.value);
											if (!Number.isFinite(n)) return;
											if (field === 'w' || field === 'h') {
												updateSelected(resolveSizePatch(selectedSlot, surface, field, n));
												return;
											}
											updateSelected({ [field]: clampPercent(n) });
										}}
									/>
								</label>
							))}
						</div>
						<label className="card-layout-canvas-field">
							<span>Fontscale</span>
							<input
								type="number"
								step="0.05"
								min={0.1}
								max={3}
								value={selectedSlot.fontScale}
								onChange={e => {
									const n = Number(e.target.value);
									if (!Number.isFinite(n) || n <= 0) return;
									updateSelected({ fontScale: Math.min(3, n) });
								}}
							/>
						</label>
						<div className="card-layout-canvas-checkrow">
							<label className="card-layout-canvas-check">
								<input
									type="checkbox"
									checked={selectedSlot.visible}
									onChange={e => updateSelected({ visible: e.target.checked })}
								/>
								<span>Visible</span>
							</label>
							<label className="card-layout-canvas-check">
								<input
									type="checkbox"
									checked={selectedSlot.aspectLocked}
									onChange={e => updateSelected({ aspectLocked: e.target.checked })}
								/>
								<span>Lock aspect</span>
							</label>
						</div>
						<label className="card-layout-canvas-field">
							<span>Text</span>
							<select
								value={selectedSlot.textPolicy}
								onChange={e => updateSelected({ textPolicy: e.target.value as CardLayoutSlot['textPolicy'] })}
							>
								<option value="fit">fit</option>
								<option value="wrap">wrap</option>
								<option value="clip">clip</option>
								<option value="hidden">hidden</option>
							</select>
						</label>
						<dl className="card-layout-canvas-facts card-layout-canvas-facts--inline">
							<div><dt>Renderer</dt><dd>{surface.renderer.surface} / {surface.renderer.shape}</dd></div>
							<div><dt>Width</dt><dd>{surface.baseWidth}px base</dd></div>
							<div><dt>Aspect</dt><dd>{selectedSlot.aspectLocked ? 'Locked' : 'Free'} · {aspectRatio}</dd></div>
						</dl>
					</div>

					<div className="card-layout-canvas-panel">
						<header className="card-layout-canvas-panel__header card-layout-canvas-panel__header--slot">
							<h2 className="card-layout-canvas-panel__title">Real preview</h2>
							<p className="card-layout-canvas-panel__subtitle">{cardRenderMeta?.name ?? '—'}</p>
						</header>
						<div className="card-layout-canvas-real-wrap">
							{renderData !== null && simpleCard !== null && (
								<RealCardRenderer
									renderData={renderData}
									card={simpleCard}
									variant="preview"
								/>
							)}
						</div>
						{elementLabel !== null && (
							<p className="card-layout-canvas-meta">{elementLabel} · {cardRenderMeta?.type}</p>
						)}
					</div>

					<div className="card-layout-canvas-panel">
						<header className="card-layout-canvas-panel__header card-layout-canvas-panel__header--slot">
							<h2 className="card-layout-canvas-panel__title">Rendered fields</h2>
							<p className="card-layout-canvas-panel__subtitle">phase · type · rarity</p>
						</header>
						{renderData !== null && simpleCard !== null && (
							<>
								<RenderFieldAudit renderData={renderData} card={simpleCard} />
								<RenderFieldEditor
									rules={surface.renderFields}
									slots={surface.slots}
									selectedSlotId={selectedSlotId}
									onPatch={updateRenderField}
									onSelectSlot={setSelectedSlotId}
									onSlotVisibleChange={updateSlotVisibility}
								/>
								<KeywordContractAudit
									keywords={simpleCard.keywords ?? []}
									surface={renderData.surface.surface}
								/>
							</>
						)}
					</div>
				</section>

				<section className="card-layout-canvas-page__col card-layout-canvas-page__col--right" aria-label="Render and JSON">
					<div className="card-layout-canvas-panel card-layout-canvas-panel--json">
						<header className="card-layout-canvas-panel__header">
							<h2 className="card-layout-canvas-panel__title">Render data</h2>
							<p className="card-layout-canvas-panel__subtitle">norse-card-layout-render/v1</p>
						</header>
						<textarea
							className="card-layout-canvas-json"
							value={renderJson}
							spellCheck={false}
							readOnly
							aria-label="Render data JSON"
						/>
					</div>

					<div className="card-layout-canvas-panel card-layout-canvas-panel--json">
						<header className="card-layout-canvas-panel__header">
							<h2 className="card-layout-canvas-panel__title">Layout JSON</h2>
							<p className="card-layout-canvas-panel__subtitle">{CARD_LAYOUT_SCHEMA}</p>
						</header>
						<textarea
							className="card-layout-canvas-json"
							value={jsonText}
							spellCheck={false}
							onChange={e => {
								setJsonText(e.target.value);
								setJsonError(null);
							}}
							aria-label="Layout draft JSON"
						/>
						<div className="card-layout-canvas-json-actions">
							<button className="card-layout-canvas-button" type="button" onClick={handleApplyJson}>
								Apply JSON
							</button>
							<button
								className="card-layout-canvas-button card-layout-canvas-button--primary"
								type="button"
								onClick={handleCopy}
							>
								<Copy size={12} aria-hidden="true" />
								<span>Copy</span>
							</button>
						</div>
						{jsonError !== null && (
							<p className="card-layout-canvas-error" role="alert">{jsonError}</p>
						)}
					</div>
				</section>
			</main>
			) : activeSegment === 'keywords' ? (
			<main className="card-layout-canvas-page__keywords-main">
				<KeywordIconCatalog
					surface={surfaceId}
					onSurfaceChange={(nextSurface) => {
						setSurfaceId(nextSurface);
						const nextSurfaceDraft = draft.surfaces.find((candidate) => candidate.surface === nextSurface);
						if (nextSurfaceDraft !== undefined && nextSurfaceDraft.slots[0] !== undefined) {
							setSelectedSlotId(nextSurfaceDraft.slots[0].id);
						}
					}}
				/>
			</main>
			) : renderData !== null && simpleCard !== null ? (
				<FrameStudy
					card={simpleCard}
					draft={draft}
					rarity={rarity}
					renderData={renderData}
					surfaceId={surfaceId}
					onRarityChange={setRarity}
					onSurfaceChange={(nextSurface) => {
						setSurfaceId(nextSurface);
						const nextSurfaceDraft = draft.surfaces.find((candidate) => candidate.surface === nextSurface);
						if (nextSurfaceDraft !== undefined && nextSurfaceDraft.slots[0] !== undefined) {
							setSelectedSlotId(nextSurfaceDraft.slots[0].id);
						}
					}}
				/>
			) : null}

			<footer className="card-layout-canvas-page__footer">
				<button
					type="button"
					className="card-layout-canvas-page__save"
					onClick={() => saveDraft(draft)}
				>
					Save draft to {STORAGE_KEY}
				</button>
				<label className="card-layout-canvas-page__mover">
					<span>Move scope</span>
					<select value={moveScope} onChange={e => setMoveScope(e.target.value as MoveScope)}>
						<option value="single">Single slot</option>
						<option value="same">Same layer</option>
						<option value="all">All slots</option>
					</select>
				</label>
				<label className="card-layout-canvas-page__mover">
					<span>Snap</span>
					<input
						type="checkbox"
						checked={snap}
						onChange={e => setSnap(e.target.checked)}
					/>
				</label>
			</footer>
		</div>
	);
};

export default CardLayoutCanvasPage;
