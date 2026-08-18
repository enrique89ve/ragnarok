/**
 * Card level helpers. Rates and gain formulas live in xpEconomy.ts.
 */

export {
	CARD_LEVEL_CURVE,
	ECONOMIC_XP_CONFIG,
	instanceLevelThresholds,
	calculateInstanceXpGain,
	calculateMatchXp,
	getEconomicLevelForXP,
	getEconomicXPConfig,
	getEconomicXPPerMvp,
	getEconomicXPPerWin,
	getXPToNextLevel,
	isInstanceXpEligible,
	projectInstanceXp,
	normalizeWinnerInstanceUids,
	parseWinnerInstanceUids,
	projectInstanceXpGain,
} from './xpEconomy';
export type {
	EconomicXPConfig,
	EconomicXPKey,
	InstanceXpProjection,
	MatchXpResult,
	XpAuthority,
} from './xpEconomy';
