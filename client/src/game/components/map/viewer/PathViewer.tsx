import { ENTITY_WAYPOINT_STYLE, buildSvgPath, type AtlasPath } from '../atlasPaths';
import type { MapRealmId } from '../types';

interface PathViewerProps {
	paths: readonly AtlasPath[];
	activeRealmId?: MapRealmId;
	activePathId?: string | null;
}

export default function PathViewer({ paths, activeRealmId, activePathId }: PathViewerProps) {
	return (
		<svg
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 z-30 h-full w-full"
		>
			{paths.map(path => {
				if (activeRealmId && path.realmId !== activeRealmId && path.id !== activePathId) return null;
				if (path.waypoints.length < 2) return null;
				const isActive = path.id === activePathId;
				const style = ENTITY_WAYPOINT_STYLE[path.entity];
				const closed = path.loopMode === 'loop';
				const d = buildSvgPath(path.waypoints, 96, closed);
				return (
					<path
						key={`line-${path.id}`}
						d={d}
						fill="none"
						stroke={style.color}
						strokeOpacity={isActive ? 0.9 : 0.35}
						strokeWidth={isActive ? 0.4 : 0.25}
						strokeDasharray={isActive ? '1 0.6' : '0.6 0.4'}
						vectorEffect="non-scaling-stroke"
					/>
				);
			})}
		</svg>
	);
}
