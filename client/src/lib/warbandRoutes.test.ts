import { describe, expect, it } from 'vitest';

import {
	DEFAULT_WARBAND_INTENT,
	getWarbandEntryRoute,
	parseWarbandIntent,
	WARBAND_INTENT_QUERY_PARAM,
} from './warbandRoutes';

describe('warband route intent', () => {
	it('defaults unknown or missing values to single', () => {
		expect(parseWarbandIntent(null)).toBe(DEFAULT_WARBAND_INTENT);
		expect(parseWarbandIntent(undefined)).toBe(DEFAULT_WARBAND_INTENT);
		expect(parseWarbandIntent('')).toBe(DEFAULT_WARBAND_INTENT);
		expect(parseWarbandIntent('campaign')).toBe(DEFAULT_WARBAND_INTENT);
	});

	it('parses multiplayer explicitly', () => {
		expect(parseWarbandIntent('multiplayer')).toBe('multiplayer');
	});

	it('builds one warband route with an intent query', () => {
		expect(getWarbandEntryRoute('single')).toBe(`/warband?${WARBAND_INTENT_QUERY_PARAM}=single`);
		expect(getWarbandEntryRoute('multiplayer')).toBe(`/warband?${WARBAND_INTENT_QUERY_PARAM}=multiplayer`);
	});
});
