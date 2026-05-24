import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
	ChevronLeft,
	Crosshair,
	Minus,
	MoveDown,
	MoveLeft,
	MoveRight,
	MoveUp,
	MapPin,
	Plus,
	RotateCcw,
	Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentType, PointerEvent, WheelEvent } from 'react';
import { routes } from '../../../lib/routes';
import { FACTIONS } from '../../pvp/pvpData';
import type { FactionId } from '../../pvp/pvpData';
import { MAP_REALMS, getFactionHomeRealm, getMapRealmById, getMapRealmCardSections } from './mapData';
import AtlasAmbientCanvas from './AtlasAmbientCanvas';
import AtlasPathCanvas from './AtlasPathCanvas';
import { REALM_EFFECTS } from './data/effects';
import { REALM_PATHS } from './data/paths';
import MapCardDossier from './MapCardDossier';
import MapLaunchPanel from './MapLaunchPanel';
import type { MapAtlasEditorOverlayProps, RealmMarker } from './editorOverlayApi';
import type { MapCardSectionId, MapPoint, MapRealmId } from './types';

interface MapViewState {
	zoom: number;
	x: number;
	y: number;
}

interface MapDragState {
	pointerId: number;
	startX: number;
	startY: number;
	startView: MapViewState;
	width: number;
	height: number;
}

const MAP_BACKGROUND_URL = '/art/maps/map-extended-safe.webp';
const MAP_TRANSFORM_ORIGIN: MapPoint = { x: 50, y: 57 };
const MAP_ZOOM_MIN = 1;
const MAP_ZOOM_MIN_EDITOR = 0.55;
const MAP_ZOOM_MAX = 3;
const DEFAULT_VIEW: MapViewState = { zoom: 1, x: 0, y: 0 };
const EDITOR_DEFAULT_VIEW: MapViewState = { zoom: 0.75, x: 0, y: 0 };
const REALM_MARKERS: ReadonlyArray<RealmMarker> = [
	{ id: 'asgard', point: { x: 57.6, y: 25.2 } },
	{ id: 'midgard', point: { x: 53.7, y: 49.4 } },
	{ id: 'jotunheim', point: { x: 28.0, y: 25.3 } },
	{ id: 'niflheim', point: { x: 80.8, y: 32.2 } },
	{ id: 'muspelheim', point: { x: 22.0, y: 55.7 } },
	{ id: 'helheim', point: { x: 84.9, y: 53.4 } },
	{ id: 'alfheim', point: { x: 34.6, y: 76.2 } },
	{ id: 'svartalfheim', point: { x: 56.0, y: 75.8 } },
	{ id: 'vanaheim', point: { x: 70.6, y: 80.7 } },
];
const FACTION_BY_HOME_REALM: Partial<Record<MapRealmId, FactionId>> = {
	asgard: 'aesir',
	vanaheim: 'vanir',
	jotunheim: 'jotun',
	helheim: 'helheim',
	muspelheim: 'muspell',
};

// `import.meta.glob` only resolves modules that exist at build time. The editor
// overlay file is intentionally gitignored (internal authoring tool) — when it
// isn't present on a fresh clone the glob returns an empty object and the page
// silently renders viewer-only.
const editorOverlayLoaders = import.meta.glob<{ default: ComponentType<MapAtlasEditorOverlayProps> }>(
	'./MapAtlasEditorOverlay.tsx',
);

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function getPanLimit(zoom: number, editorMode: boolean): MapPoint {
	if (editorMode) {
		const zoomOverflow = Math.max(0, zoom - MAP_ZOOM_MIN);
		return {
			x: 80 + zoomOverflow * 20,
			y: 80 + zoomOverflow * 20,
		};
	}

	const zoomOverflow = Math.max(0, zoom - MAP_ZOOM_MIN);
	return {
		x: 10 + zoomOverflow * 8,
		y: 8 + zoomOverflow * 7,
	};
}

function isInteractiveMapTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && Boolean(target.closest('a, button, input, select, textarea, [role="button"]'));
}

export default function MapPage() {
	const [searchParams] = useSearchParams();
	const editorRequested = import.meta.env.DEV && searchParams.get('editor') === '1';
	const [EditorOverlay, setEditorOverlay] = useState<ComponentType<MapAtlasEditorOverlayProps> | null>(null);

	useEffect(() => {
		if (!editorRequested) {
			setEditorOverlay(null);
			return;
		}
		const loader = editorOverlayLoaders['./MapAtlasEditorOverlay.tsx'];
		if (!loader) return;
		let cancelled = false;
		loader()
			.then(mod => {
				if (!cancelled) setEditorOverlay(() => mod.default);
			})
			.catch(() => {
				// Editor overlay module not available (production / public clone).
			});
		return () => {
			cancelled = true;
		};
	}, [editorRequested]);

	const editorActive = editorRequested && EditorOverlay !== null;
	const [selectedRealmId, setSelectedRealmId] = useState<MapRealmId>('asgard');
	const [selectedFactionId, setSelectedFactionId] = useState<FactionId>('aesir');
	const [activeCardSectionId, setActiveCardSectionId] = useState<MapCardSectionId>('characters');
	const [isCardDossierOpen, setIsCardDossierOpen] = useState(false);
	const [view, setView] = useState<MapViewState>(DEFAULT_VIEW);
	const [isDragging, setIsDragging] = useState(false);
	const dragStateRef = useRef<MapDragState | null>(null);
	const markerLayerRef = useRef<HTMLDivElement | null>(null);

	const selectedRealm = getMapRealmById(selectedRealmId);
	const selectedFaction = FACTIONS.find(faction => faction.id === selectedFactionId) ?? FACTIONS[0];
	const selectedFactionHomeRealm = getMapRealmById(getFactionHomeRealm(selectedFaction.id));
	const cardSections = getMapRealmCardSections(selectedRealmId);
	const selectedRealmFaction = FACTIONS.find(faction => faction.id === FACTION_BY_HOME_REALM[selectedRealmId]);
	const cardDossierContextLabel = selectedRealmFaction?.name ?? 'Yggdrasil Atlas';
	const cardDossierContextColor = selectedRealmFaction?.color ?? selectedRealm.color;

	const minZoom = editorActive ? MAP_ZOOM_MIN_EDITOR : MAP_ZOOM_MIN;

	const updateView = (next: Partial<MapViewState>) => {
		setView(current => {
			const zoom = clamp(next.zoom ?? current.zoom, minZoom, MAP_ZOOM_MAX);
			const limit = getPanLimit(zoom, editorActive);

			return {
				zoom,
				x: clamp(next.x ?? current.x, -limit.x, limit.x),
				y: clamp(next.y ?? current.y, -limit.y, limit.y),
			};
		});
	};

	const resetView = useCallback(() => {
		setView(editorActive ? EDITOR_DEFAULT_VIEW : DEFAULT_VIEW);
	}, [editorActive]);

	useEffect(() => {
		resetView();
	}, [editorActive, resetView]);

	const selectRealm = (id: MapRealmId) => {
		setSelectedRealmId(id);
		setActiveCardSectionId('characters');
	};
	const openRealmCards = (id: MapRealmId) => {
		selectRealm(id);
		const factionId = FACTION_BY_HOME_REALM[id];
		if (factionId) setSelectedFactionId(factionId);
		setIsCardDossierOpen(true);
	};
	const selectFaction = (id: FactionId) => {
		setSelectedFactionId(id);
		setSelectedRealmId(getFactionHomeRealm(id));
		setActiveCardSectionId('characters');
		setIsCardDossierOpen(false);
		resetView();
	};
	const viewActions = {
		moveUp: () => updateView({ y: view.y + 5 }),
		moveRight: () => updateView({ x: view.x - 5 }),
		moveDown: () => updateView({ y: view.y - 5 }),
		moveLeft: () => updateView({ x: view.x + 5 }),
		zoomIn: () => updateView({ zoom: view.zoom + Math.max(0.25, view.zoom * 0.18) }),
		zoomOut: () => updateView({ zoom: view.zoom - Math.max(0.25, view.zoom * 0.18) }),
		overview: resetView,
		detail: () => updateView({ zoom: MAP_ZOOM_MAX }),
		reset: resetView,
	};

	const handleMapPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0 || isInteractiveMapTarget(event.target)) return;

		const bounds = event.currentTarget.getBoundingClientRect();
		dragStateRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startView: view,
			width: bounds.width,
			height: bounds.height,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
		event.preventDefault();
		setIsDragging(true);
	};

	const handleMapPointerMove = (event: PointerEvent<HTMLDivElement>) => {
		const dragState = dragStateRef.current;
		if (!dragState || dragState.pointerId !== event.pointerId) return;

		const deltaX = ((event.clientX - dragState.startX) / dragState.width) * 100;
		const deltaY = ((event.clientY - dragState.startY) / dragState.height) * 100;
		updateView({
			x: dragState.startView.x + deltaX / Math.max(1, dragState.startView.zoom),
			y: dragState.startView.y + deltaY / Math.max(1, dragState.startView.zoom),
		});
		event.preventDefault();
	};

	const handleMapPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
		const dragState = dragStateRef.current;
		if (!dragState || dragState.pointerId !== event.pointerId) return;

		dragStateRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		setIsDragging(false);
	};

	const handleMapWheel = (event: WheelEvent<HTMLDivElement>) => {
		event.preventDefault();
		const zoomDelta = event.deltaY < 0 ? Math.max(0.12, view.zoom * 0.12) : -Math.max(0.12, view.zoom * 0.12);

		updateView({ zoom: view.zoom + zoomDelta });
	};

	return (
		<main className="h-screen w-screen overflow-hidden bg-obsidian-950 text-ink-0">
			<header className="relative z-40 border-b border-obsidian-700/80 bg-obsidian-950/90 backdrop-blur-md">
				<div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between gap-4 px-4 md:px-6">
					<div className="flex min-w-0 items-center gap-3">
						<Link
							to={routes.home}
							aria-label="Back home"
							className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-obsidian-700 bg-obsidian-900/80 text-ink-200 transition-colors hover:border-gold-300/45 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
						>
							<ChevronLeft className="h-5 w-5" aria-hidden="true" />
						</Link>
						<div className="min-w-0">
							<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-300">Atlas</p>
							<h1 className="truncate font-display text-xl font-black uppercase tracking-[0.14em] text-ink-0 md:text-2xl">
								Yggdrasil
							</h1>
						</div>
					</div>

					<div className="hidden items-center gap-2 md:grid md:grid-cols-3" aria-label="Atlas summary">
						<HeaderMetric value={MAP_REALMS.length} label="Realms" />
						<HeaderMetric value={selectedRealm.connections.length} label="Links" />
						<HeaderMetric value={`${view.zoom.toFixed(1)}x`} label="Zoom" />
					</div>
				</div>
			</header>

			<section className="relative z-10 mx-auto grid h-[calc(100dvh-4rem)] max-w-[1800px] grid-rows-[minmax(0,1fr)_minmax(20rem,42dvh)] gap-3 p-3 md:p-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-1 xl:grid-cols-[minmax(0,1fr)_340px]">
				<div
					className={`relative h-full overflow-hidden rounded-xl border border-gold-300/22 bg-obsidian-950 shadow-[0_28px_100px_-55px_rgba(0,0,0,0.95)] ${
						isDragging ? 'cursor-grabbing' : 'cursor-grab'
					}`}
					onPointerDown={handleMapPointerDown}
					onPointerMove={handleMapPointerMove}
					onPointerUp={handleMapPointerEnd}
					onPointerCancel={handleMapPointerEnd}
					onWheel={handleMapWheel}
					style={{ touchAction: 'none' }}
				>
					<div className="absolute inset-0 overflow-hidden bg-[#070910]">
						<div
							className={`absolute inset-[-12%] bg-cover bg-center opacity-55 blur-2xl will-change-transform ${
								isDragging ? 'transition-none' : 'transition-transform duration-300 ease-out'
							}`}
							style={{
								backgroundImage: `url(${MAP_BACKGROUND_URL})`,
								backgroundPosition: `${MAP_TRANSFORM_ORIGIN.x}% ${MAP_TRANSFORM_ORIGIN.y}%`,
								transform: `translate3d(${view.x * 0.2}%, ${view.y * 0.2}%, 0) scale(1.08)`,
							}}
						/>
						<div className="absolute inset-0">
							<div
								className={`absolute inset-0 grid place-items-center will-change-transform ${
									isDragging ? 'transition-none' : 'transition-transform duration-300 ease-out'
								}`}
								style={{
									transform: `translate3d(${view.x}%, ${view.y}%, 0) scale(${view.zoom})`,
									transformOrigin: `${MAP_TRANSFORM_ORIGIN.x}% ${MAP_TRANSFORM_ORIGIN.y}%`,
								}}
							>
								<img
									src={MAP_BACKGROUND_URL}
									alt=""
									className="h-full w-full select-none object-cover shadow-[0_44px_95px_-58px_rgba(246,196,83,0.7)] ring-1 ring-gold-300/16"
									style={{ objectPosition: `${MAP_TRANSFORM_ORIGIN.x}% ${MAP_TRANSFORM_ORIGIN.y}%` }}
									draggable={false}
								/>
								<div ref={markerLayerRef} className="absolute inset-0">
									<AtlasAmbientCanvas
										targetRef={markerLayerRef}
										effects={REALM_EFFECTS}
										paused={false}
									/>
									<AtlasPathCanvas
										targetRef={markerLayerRef}
										paths={REALM_PATHS}
										paused={false}
									/>
									{!editorActive && REALM_MARKERS.map(marker => {
										const realm = getMapRealmById(marker.id);
										const active = marker.id === selectedRealmId;

										return (
											<button
												key={marker.id}
												type="button"
												title={`Open ${realm.name} regional cards`}
												aria-label={`Open ${realm.name} regional cards`}
												onClick={() => openRealmCards(marker.id)}
												className={`absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-obsidian-950/72 text-ink-0 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.95)] backdrop-blur transition-colors hover:border-gold-300 hover:bg-obsidian-900/86 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 ${
													active ? 'border-gold-300/80' : 'border-obsidian-600/80'
												}`}
												style={{
													left: `${marker.point.x}%`,
													top: `${marker.point.y}%`,
													color: realm.color,
													boxShadow: active
														? `0 0 0 1px ${realm.color}55, 0 0 22px ${realm.glow}`
														: `0 0 16px ${realm.glow}`,
												}}
											>
												<MapPin className="h-4 w-4" aria-hidden="true" />
												<span className="absolute left-1/2 top-[calc(100%+0.25rem)] -translate-x-1/2 whitespace-nowrap rounded border border-obsidian-700 bg-obsidian-950/88 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-ink-200 hidden md:block">
													{realm.name}
												</span>
											</button>
										);
									})}
								</div>
							</div>
						</div>
					</div>

					<div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-obsidian-950/80 to-transparent" />
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-obsidian-950/88 to-transparent" />

					<div className="absolute left-3 top-3 z-20 max-w-[min(23rem,calc(100%-1.5rem))] rounded-lg border border-obsidian-700/80 bg-obsidian-950/76 px-3 py-2 backdrop-blur-md">
						<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em]" style={{ color: selectedRealm.color }}>
							Selected / {selectedRealm.id}
						</p>
						<div className="mt-1 flex items-center gap-2">
							<span className="grid h-6 w-6 place-items-center rounded-md border font-display text-sm font-black" style={{ borderColor: `${selectedRealm.color}77`, color: selectedRealm.color }}>
								{selectedRealm.runeSymbol}
							</span>
							<h2 className="truncate font-display text-sm font-black uppercase tracking-[0.1em] text-ink-0">
								{selectedRealm.name}
							</h2>
						</div>
						<p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-200">{selectedRealm.description}</p>
					</div>

					<div className="absolute bottom-3 right-3 z-30 flex items-end gap-1.5 rounded-lg border border-obsidian-700/80 bg-obsidian-950/76 p-1.5 backdrop-blur-md">
						<div className="grid grid-cols-3 gap-1" aria-label="Pan atlas">
							<MapHudSpacer />
							<MapHudIconButton label="Pan up" icon={MoveUp} onClick={viewActions.moveUp} />
							<MapHudSpacer />
							<MapHudIconButton label="Pan left" icon={MoveLeft} onClick={viewActions.moveLeft} />
							<MapHudIconButton label="Reset view" icon={RotateCcw} onClick={viewActions.reset} />
							<MapHudIconButton label="Pan right" icon={MoveRight} onClick={viewActions.moveRight} />
							<MapHudSpacer />
							<MapHudIconButton label="Pan down" icon={MoveDown} onClick={viewActions.moveDown} />
							<MapHudSpacer />
						</div>
						<div className="grid gap-1 border-l border-obsidian-700/80 pl-1.5" aria-label="Zoom and view">
							<MapHudIconButton label="Zoom in" icon={Plus} onClick={viewActions.zoomIn} />
							<MapHudIconButton label="Detail view" icon={Search} onClick={viewActions.detail} />
							<MapHudIconButton label="Zoom out" icon={Minus} onClick={viewActions.zoomOut} />
							<MapHudIconButton label="Overview" icon={Crosshair} onClick={viewActions.overview} />
						</div>
					</div>

					{EditorOverlay && editorRequested ? (
						<EditorOverlay
							markerLayerRef={markerLayerRef}
							selectedRealmId={selectedRealmId}
							defaultRealmMarkers={REALM_MARKERS}
						/>
					) : null}

					{isCardDossierOpen && !editorActive && (
						<MapCardDossier
							activeSectionId={activeCardSectionId}
							contextColor={cardDossierContextColor}
							contextLabel={cardDossierContextLabel}
							realm={selectedRealm}
							sections={cardSections}
							onClose={() => setIsCardDossierOpen(false)}
							onSelectSection={setActiveCardSectionId}
						/>
					)}
				</div>

				<MapLaunchPanel
					factions={FACTIONS}
					selectedFaction={selectedFaction}
					selectedFactionHomeRealm={selectedFactionHomeRealm}
					selectedFactionId={selectedFactionId}
					realms={MAP_REALMS}
					selectedRealm={selectedRealm}
					selectedRealmId={selectedRealmId}
					zoom={view.zoom}
					onSelectFaction={selectFaction}
					onSelectRealm={selectRealm}
				/>
			</section>
		</main>
	);
}

function MapHudIconButton({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			onClick={onClick}
			className="grid h-8 w-8 place-items-center rounded-md border border-obsidian-700 bg-obsidian-900/88 text-ink-200 transition-colors hover:border-gold-300/45 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
		>
			<Icon className="h-3.5 w-3.5" aria-hidden="true" />
		</button>
	);
}

function MapHudSpacer() {
	return <span className="h-8 w-8" aria-hidden="true" />;
}

function HeaderMetric({ value, label }: { value: number | string; label: string }) {
	return (
		<div className="min-w-[5.5rem] rounded-md border border-obsidian-700 bg-obsidian-900/70 px-3 py-2 text-right">
			<p className="font-display text-sm font-black leading-none text-ink-0">{value}</p>
			<p className="mt-1 font-mono text-[8px] uppercase tracking-[0.2em] text-ink-400">{label}</p>
		</div>
	);
}
