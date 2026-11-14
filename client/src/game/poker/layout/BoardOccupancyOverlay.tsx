import {
	boardGridRequested,
	boardOccupants,
	findBoardOverlaps,
} from './boardOccupancy';
import './board-occupancy.css';

/** Dev map of the arena grid. Open the table with ?boardGrid=1. */
export function BoardOccupancyOverlay() {
	if (!boardGridRequested()) return null;

	const occupants = boardOccupants();
	const hits = findBoardOverlaps(occupants);
	const hitIds = new Set(hits.flatMap((hit) => [hit.a, hit.b]));

	return (
		<div className="board-occupancy" aria-hidden="true">
			{occupants.map((occupant) => (
				<div
					key={occupant.id}
					className={`board-occupancy-box${hitIds.has(occupant.id) ? ' is-hit' : ''}${occupant.plate ? ' is-plate' : ''}`}
					style={{
						left: occupant.rect.x,
						top: occupant.rect.y,
						width: occupant.rect.width,
						height: occupant.rect.height,
					}}
				>
					<span className="board-occupancy-label">
						{occupant.id}
						<span>{occupant.windows.join(' ')}</span>
					</span>
				</div>
			))}
			<ul className="board-occupancy-report">
				{hits.length === 0 ? <li>No simultaneous overlaps</li> : null}
				{hits.map((hit) => (
					<li key={`${hit.a}|${hit.b}`}>
						{hit.a} × {hit.b}
						<span>{hit.window}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
