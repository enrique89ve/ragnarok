import type { RefObject } from 'react';
import type { MapPoint, MapRealmId } from './types';

export interface RealmMarker {
	id: MapRealmId;
	point: MapPoint;
}

export interface MapAtlasEditorOverlayProps {
	markerLayerRef: RefObject<HTMLDivElement | null>;
	selectedRealmId: MapRealmId;
	defaultRealmMarkers: ReadonlyArray<RealmMarker>;
}
