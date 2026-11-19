export type {
	FactionCardDescriptor,
	FactionSceneHandle,
	FactionSceneRenderer,
	FactionVfxSceneId,
	FactionVfxSceneRequest,
	FactionVfxTrigger,
	TribeVfxCategory,
	ViewportPoint,
} from './types';

export {
	classifyCardForFactionVfx,
	hydrateCardDescriptor,
	inferTitanRealmElement,
	isDragonCard,
	isTitanCard,
	resolveFactionVfxScene,
	type ClassifiedCardVfx,
} from './classifier';

export {
	cancelAllFactionVfxScenes,
	getActiveFactionSceneCount,
	playFactionVfxScene,
	registerFactionVfxScene,
	resetFactionVfxRegistry,
} from './sceneRegistry';

export {
	clearFactionVfxSubscriberState,
	registerFactionVfxSubscriber,
	syncBattlefieldForFactionVfx,
	useFactionBattlefieldVfx,
} from './factionVfxSubscriber';

export {
	createUnifiedFlameProfile,
	playDragonFireBreath,
	playDragonFlameIgnition,
	resolveDragonFlameTheme,
	resolveDragonSceneAnchors,
	sampleUnifiedFlameContour,
	type DragonFlameTheme,
	type ResolvedDragonAnchors,
	type UnifiedFlameProfile,
} from './scenes/dragonFlameScene';

export {
	computeDragonFlightPath,
	DRAGON_FLIGHT_SPRITESHEET,
	loadDragonShadowFrames,
	playDragonShadowFlight,
	type DragonFlightPath,
} from './scenes/dragonShadowFlightScene';

export {
	computeQuakeCrackPoints,
	playTitanColossusQuake,
	playTitanEarthSlam,
	playTitanPantheonDescent,
	resolveTitanTheme,
	type TitanRealmKey,
	type TitanVisualTheme,
} from './scenes/titanScene';

export {
	disposeAllFactionGpuAssets,
	getGpuPoolDiagnostics,
	preloadDragonShadowFrames,
} from './runtime/gpuAssetPool';

export {
	getRunningPixiSceneCount,
	runTimedPixiScene,
	stopAllRunningPixiScenes,
} from './runtime/sceneRunner';

export {
	playFactionSfx,
	resolveArenaEndpoints,
	resolveFactionSceneAnchors,
	type FactionAudioCue,
	type ResolvedArenaEndpoints,
	type ResolvedFactionAnchors,
} from './runtime/sceneContext';
