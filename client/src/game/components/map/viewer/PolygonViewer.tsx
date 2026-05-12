import type { RealmPolygon } from '../data/polygons';
import { getMapRealmById } from '../mapData';
import { contourToSvgPath } from '../queries/polygonOps';
import type { MapRealmId } from '../types';

interface PolygonViewerProps {
	polygons: Readonly<Record<MapRealmId, RealmPolygon>>;
	order: readonly MapRealmId[];
	selectedRealmId?: MapRealmId;
	activeRealmId?: MapRealmId | null;
}

export default function PolygonViewer({ polygons, order, selectedRealmId, activeRealmId }: PolygonViewerProps) {
	return (
		<svg
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 z-1 h-full w-full"
		>
			{order.map(realmId => {
				const polygon = polygons[realmId];
				if (polygon.contours.length === 0) return null;
				const realm = getMapRealmById(realmId);
				const isActive = realmId === activeRealmId;
				const isSelected = realmId === selectedRealmId;
				const fillOpacity = isActive ? 0.35 : isSelected ? 0.22 : 0.1;
				const strokeOpacity = isActive ? 0.95 : isSelected ? 0.6 : 0.3;
				const d = polygon.contours.map(c => contourToSvgPath(c, true)).join(' ');

				return (
					<path
						key={`zone-${realmId}`}
						d={d}
						fill={realm.color}
						fillOpacity={fillOpacity}
						stroke={realm.color}
						strokeOpacity={strokeOpacity}
						strokeWidth={isActive ? 0.45 : 0.25}
						vectorEffect="non-scaling-stroke"
						fillRule="evenodd"
					/>
				);
			})}
		</svg>
	);
}
