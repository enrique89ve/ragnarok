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
	DEFAULT_CARD_LAYOUT_DRAFT,
	cloneCardLayoutDraft,
	createDefaultCardLayoutDraft,
	parseCardLayoutDraft,
	serializeCardLayoutDraft,
	updateCardLayoutSlot,
	type CardLayoutDraft,
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
import { toSimpleCardData } from '../card/cardDataAdapter';
import type { SimpleCardData } from '../card/SimpleCardCompat';
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

const STORAGE_KEY = 'norse:card-layout-canvas-draft:v1';
const STAGE_MAX_WIDTH = 520;

type MoveScope = 'single' | 'same' | 'all';

const cloneDraft = cloneCardLayoutDraft;

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
	return {
		showArt: isFieldRendered(renderData, card, 'art'),
		showCount: isFieldRendered(renderData, card, 'count'),
		showMana: isFieldRendered(renderData, card, 'mana'),
		showName: isFieldRendered(renderData, card, 'name'),
		showRarity: isFieldRendered(renderData, card, 'rarity'),
		showStats: isFieldRendered(renderData, card, 'attack') || isFieldRendered(renderData, card, 'health'),
		...(isFieldRendered(renderData, card, 'tribe') && card.tribe ? { tribe: card.tribe } : {}),
		...(isFieldRendered(renderData, card, 'description') && card.description ? { description: card.description } : {}),
		...(isFieldRendered(renderData, card, 'keywords') && card.keywords !== undefined ? { keywords: card.keywords } : {}),
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
							<span>{compactList(rule.cardTypes, 9)}</span>
							<span>{compactList(rule.rarities, 4)}</span>
						</div>
					</div>
				);
			})}
		</div>
	</div>
);

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

	const stageWidth = useMemo(() => Math.min(STAGE_MAX_WIDTH, Math.round(surface.baseWidth * 1.55)), [surface.baseWidth]);
	const stageHeight = useMemo(() => stageWidth * (surface.aspectRatio.height / surface.aspectRatio.width), [stageWidth, surface.aspectRatio]);

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
		height: `${stageHeight}px`,
	}), [stageWidth, stageHeight]);

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
							<RenderFieldAudit renderData={renderData} card={simpleCard} />
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
