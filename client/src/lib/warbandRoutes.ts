import { routes } from './routes';

export type WarbandIntent = 'single' | 'multiplayer';

export const DEFAULT_WARBAND_INTENT: WarbandIntent = 'single';
export const WARBAND_INTENT_QUERY_PARAM = 'mode';

export function parseWarbandIntent(value: string | null | undefined): WarbandIntent {
	return value === 'multiplayer' ? 'multiplayer' : DEFAULT_WARBAND_INTENT;
}

export function getWarbandEntryRoute(intent: WarbandIntent = DEFAULT_WARBAND_INTENT): string {
	return `${routes.warband}?${WARBAND_INTENT_QUERY_PARAM}=${intent}`;
}
