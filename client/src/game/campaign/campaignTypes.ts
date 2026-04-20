export interface AIBehaviorProfile {
	aggression: number;
	efficiency: number;
	bluffFrequency: number;
	tightness: number;
	usesHeroPower: boolean;
	prioritizeFace: boolean;
	tradeEfficiency?: number;
	heroPowerPriority?: number;
}

/*
  Adapt a per-mission AIBehaviorProfile to the AIConfig shape that
  SmartAI.getSmartAIAction() consumes. SmartAI's AIConfig is intentionally
  small (3 fields) and gets all 41 hand-tuned mission profiles to act
  through a uniform interface.

  Difficulty multiplier:
    normal  → x1.00 (profile as authored)
    heroic  → x1.10 (slightly more aggressive)
    mythic  → x1.20 (full aggression / less tightness)

  Mythic also reduces tightness by 10% so the AI plays more hands and
  punishes the player who tries to fold-out a tough boss. Aggression is
  clamped to [0, 1] so we never overflow the SmartAI math.
*/
export type SmartAIConfigShape = {
	aggressiveness: number;
	bluffFrequency: number;
	tightness: number;
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export function profileToSmartAIConfig(
	profile: AIBehaviorProfile,
	difficulty: Difficulty,
): SmartAIConfigShape {
	const aggressionMult =
		difficulty === 'mythic' ? 1.20 : difficulty === 'heroic' ? 1.10 : 1.00;
	const tightnessMult =
		difficulty === 'mythic' ? 0.90 : difficulty === 'heroic' ? 0.95 : 1.00;

	return {
		aggressiveness: clamp01(profile.aggression * aggressionMult),
		bluffFrequency: clamp01(profile.bluffFrequency),
		tightness: clamp01(profile.tightness * tightnessMult),
	};
}

/*
  MusicCueId — enum-style identifiers for in-game music tracks.
  Each value maps to a Howler track in useAudio.tsx. The cinematic
  system can attach a `musicId` to any scene; the renderer crossfades
  to that track when the scene mounts and the previous one when it
  exits. If a scene has no `musicId`, the current track keeps playing.

  Authoring guideline: pick the cue that matches the EMOTION, not the
  literal source — `forge_anvil` plays during any worldbuilding/creation
  beat, not just literal forging. The cue catalog is intentionally short
  so it stays composer-shippable; add new cues only when no existing
  one fits.
*/
export type MusicCueId =
	| 'primordial_dread'    // chaos, void, formless menace
	| 'forge_anvil'         // worldbuilding, creation, smithing
	| 'aesir_triumph'       // gods victorious, fortress walls rising
	| 'vanir_war'           // green war, nature against order
	| 'jotun_rage'          // giant grief, ancient grudges
	| 'twilight_horn'       // omens, prophecy, the long winter
	| 'ragnarok'            // the end of all things
	| 'rebirth'             // green earth from the sea
	| 'mead_hall'           // celebration, drinking, sagas told
	| 'shadow_root'         // dark elves, treachery, the under-realms
	| 'olympian_hymn'       // Greek divine triumph
	| 'duat_passage'        // Egyptian funeral, soul-weighing
	| 'celtic_mist'         // otherworld, sidhe mounds
	| 'celestial_court';    // Eastern jade emperor, divine court

export interface CinematicScene {
	narration: string;
	visualCue?: string;
	/**
	 * Free-form prose music description (legacy / authoring documentation).
	 * The system does not parse this — use `musicId` to actually play music.
	 */
	musicCue?: string;
	/** Music cue ID — when set, the renderer plays this track for the scene. */
	musicId?: MusicCueId;
	/**
	 * Optional speaker portrait. Path to an image (relative or absolute).
	 * If set, the renderer shows the portrait alongside the narration —
	 * lets the cinematic feel like character dialogue rather than disembodied
	 * narration. Use sparingly; works best for ONE character speaking per scene.
	 */
	speakerPortrait?: string;
	speakerName?: string;
	durationHint?: number;
}

export interface CinematicIntro {
	title: string;
	style?: string;
	scenes: CinematicScene[];
}

export interface BossRule {
	type: 'extra_mana' | 'extra_health' | 'start_with_minion' | 'bonus_draw' | 'passive_damage';
	value?: number;
	cardId?: number;
	description: string;
}

export interface CampaignReward {
	type: 'card' | 'rune' | 'pack' | 'eitr';
	cardId?: number;
	amount?: number;
}

export interface CampaignArmy {
	king?: string;
	queen?: string;
	rook?: string;
	bishop?: string;
	knight?: string;
}

/*
  Boss quips — short in-character lines the boss says during combat.
  Optional. When set, BossQuipBubble pops over the opponent hero portrait
  on key events: combat start, low HP threshold (50%), lethal incoming.
  All fields optional so existing missions continue to work without
  any quips authored. Order of preference for content: boss-specific
  (Ymir roars, Loki taunts, Odin is laconic) > generic mission lines.
*/
export interface BossQuips {
	onCombatStart?: string;
	onLowHP?: string;
	onLethal?: string;
	onVictory?: string;
}

/*
  BossPhase — a mid-combat escalation that fires when the opponent hero
  drops below `hpPercent`. Each phase can do three things at once:
    - say a quip (in-character story injection)
    - flash the screen a tinted color (spectacle)
    - apply a mechanical effect (gameplay escalation)

  Phases fire ONCE per combat in HP-descending order. A boss with phases
  at 75% / 50% / 25% triggers each as the opponent loses HP, in order.
  This is the unified mechanism for both "Tier 2 mid-mission story
  injection" and "Tier 2 mythic boss mechanics" — they're really the
  same feature with three optional layers (story / visual / gameplay).

  effects:
    - 'heal_self N': opponent heroes restore N HP
    - 'damage_player N': player hero takes N damage immediately
    - 'buff_attack N': all opponent minions gain +N attack (rest of combat)
    - 'summon_minion cardId': spawn the named card on the opponent side
    - 'add_armor N': opponent gains N armor
    - 'enrage': opponent's mana production speeds up (+1 max mana)

  All effects optional. A phase with only `quip` is a pure story beat.
  A phase with only `effect` is a pure mechanic. The combo is the win.
*/
export type BossPhaseEffect =
	| { type: 'heal_self'; value: number }
	| { type: 'damage_player'; value: number }
	| { type: 'buff_attack'; value: number }
	| { type: 'summon_minion'; cardId: number }
	| { type: 'add_armor'; value: number }
	| { type: 'enrage'; value: number };

export type BossPhaseFlash = 'red' | 'gold' | 'blue' | 'green' | 'purple';

export interface BossPhase {
	hpPercent: number;          // 0-100. Phase fires when opponent HP <= this
	quip?: string;              // Optional in-character line
	flash?: BossPhaseFlash;     // Optional screen tint
	effect?: BossPhaseEffect;   // Optional mechanical effect
	description: string;        // Saga feed entry / debug log
}

export interface CampaignMission {
	id: string;
	chapterId: string;
	missionNumber: number;
	name: string;
	description: string;
	narrativeBefore: string;
	narrativeAfter: string;
	narrativeVictory?: string;
	narrativeDefeat?: string;
	aiHeroId: string;
	aiHeroClass: string;
	aiDeckCardIds: number[];
	aiProfile: AIBehaviorProfile;
	bossRules: BossRule[];
	prerequisiteIds: string[];
	rewards: CampaignReward[];
	realm?: string;
	campaignArmy?: CampaignArmy;
	bossQuips?: BossQuips;
	bossPhases?: BossPhase[];
	/*
	  When true, this mission gets the finale visual treatment:
	    - "FINAL CONFRONTATION" badge on mission_intro
	    - Pulsing crimson border on the chess phase
	    - Pulsing crimson aura on the combat arena
	    - Future: dedicated finale music track
	  Set on the LAST mission of every chapter.
	*/
	isChapterFinale?: boolean;
	/*
	  Optional victory cinematic — plays AFTER combat ends in a win,
	  BEFORE the game_over screen. Reuses CinematicCrawl with a synthetic
	  intro built from these scenes. Use for high-stakes missions where
	  a static text screen would fail to land the moment (chapter finales,
	  named-boss kills, story climax beats). Skippable like any cinematic.
	*/
	victoryCinematic?: CinematicScene[];
	/*
	  Optional defeat cinematic — same idea on a loss. Lets the game show
	  a canonical failure moment ("the void laughs, creation ends stillborn")
	  instead of a generic red DEFEAT screen. Falls back to the standard
	  defeat screen if not set.
	*/
	defeatCinematic?: CinematicScene[];
	/*
	  Story bridge — short cinematic scenes that play AFTER the player
	  clicks "Back to Campaign" on a victory, BEFORE returning to the map.
	  This is the connective tissue between missions: "Years pass. The
	  mountains settle. Yggdrasil drinks deep from the well of Urd..."
	  Authored on the FORWARD-EDGE mission (the one the player just beat),
	  describing the time/events that pass before the next mission begins.
	*/
	storyBridge?: CinematicScene[];
	/*
	  Optional music cue for the combat phase of this mission. If set,
	  the combat arena starts this track on mount and stops it on unmount.
	  Falls back to the chapter default. Use to mark special battles
	  (Ragnarok gets `ragnarok`; the Mead of Poetry gets `mead_hall`).
	*/
	combatMusicId?: MusicCueId;
	/*
	  Per-mission star thresholds. Boss fights with many phases or
	  extra_health should have higher thresholds (more turns expected).
	  If not set, DEFAULT_STAR_THRESHOLDS are used (12 / 20).
	*/
	starThresholds?: { threeStar: number; twoStar: number };
}

/*
  Star rating — computed from turn count vs. mission difficulty.
  Default thresholds (used if the mission doesn't override):
    3 stars: ≤ 12 turns  (quick decisive victory)
    2 stars: ≤ 20 turns  (solid play)
    1 star:  > 20 turns   (eventual win)
  Missions with complex boss rules can override via starThresholds.
*/
export const DEFAULT_STAR_THRESHOLDS = { threeStar: 12, twoStar: 20 };

export function getMissionStars(turns: number, mission?: CampaignMission): number {
  const t3 = mission?.starThresholds?.threeStar ?? DEFAULT_STAR_THRESHOLDS.threeStar;
  const t2 = mission?.starThresholds?.twoStar ?? DEFAULT_STAR_THRESHOLDS.twoStar;
  if (turns <= t3) return 3;
  if (turns <= t2) return 2;
  return 1;
}

export interface CampaignChapter {
	id: string;
	name: string;
	faction: 'norse' | 'greek' | 'egyptian' | 'celtic' | 'eastern';
	description: string;
	cinematicIntro?: CinematicIntro;
	missions: CampaignMission[];
	chapterReward: CampaignReward[];
}

export type Difficulty = 'normal' | 'heroic' | 'mythic';

export const AI_PROFILES: Record<string, AIBehaviorProfile> = {
	easy: { aggression: 0.3, efficiency: 0.4, bluffFrequency: 0.1, tightness: 0.3, usesHeroPower: false, prioritizeFace: false },
	medium: { aggression: 0.5, efficiency: 0.6, bluffFrequency: 0.3, tightness: 0.5, usesHeroPower: true, prioritizeFace: false },
	hard: { aggression: 0.7, efficiency: 0.8, bluffFrequency: 0.5, tightness: 0.7, usesHeroPower: true, prioritizeFace: true },
	boss: { aggression: 0.9, efficiency: 0.9, bluffFrequency: 0.6, tightness: 0.8, usesHeroPower: true, prioritizeFace: true },

	// Norse primordial profiles
	ymir: { aggression: 0.9, efficiency: 0.4, bluffFrequency: 0.1, tightness: 0.2, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.3 },
	bergelmir: { aggression: 0.8, efficiency: 0.7, bluffFrequency: 0.2, tightness: 0.6, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.6 },
	vanirWarlord: { aggression: 0.6, efficiency: 0.8, bluffFrequency: 0.3, tightness: 0.7, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.8, heroPowerPriority: 0.7 },

	// Norse god-specific profiles
	fenrir: { aggression: 0.4, efficiency: 0.3, bluffFrequency: 0.1, tightness: 0.2, usesHeroPower: false, prioritizeFace: true, tradeEfficiency: 0.3 },
	ratatosk: { aggression: 0.4, efficiency: 0.5, bluffFrequency: 0.7, tightness: 0.3, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.4 },
	brokkr: { aggression: 0.5, efficiency: 0.8, bluffFrequency: 0.2, tightness: 0.7, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.8 },
	hel: { aggression: 0.3, efficiency: 0.7, bluffFrequency: 0.4, tightness: 0.8, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.7, heroPowerPriority: 0.9 },
	jormungandr: { aggression: 0.6, efficiency: 0.7, bluffFrequency: 0.3, tightness: 0.6, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.6 },
	loki: { aggression: 0.5, efficiency: 0.6, bluffFrequency: 0.95, tightness: 0.3, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.5 },
	thor: { aggression: 0.85, efficiency: 0.7, bluffFrequency: 0.2, tightness: 0.7, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.6 },
	odin: { aggression: 0.6, efficiency: 0.95, bluffFrequency: 0.5, tightness: 0.8, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.9, heroPowerPriority: 0.8 },

	// Greek god-specific profiles
	uranus: { aggression: 0.6, efficiency: 0.7, bluffFrequency: 0.2, tightness: 0.8, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.7, heroPowerPriority: 0.8 },
	kronos: { aggression: 0.8, efficiency: 0.8, bluffFrequency: 0.3, tightness: 0.7, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.7 },
	atlas: { aggression: 0.7, efficiency: 0.75, bluffFrequency: 0.2, tightness: 0.7, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.7 },
	typhon: { aggression: 0.9, efficiency: 0.5, bluffFrequency: 0.7, tightness: 0.3, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.4 },
	porphyrion: { aggression: 0.85, efficiency: 0.6, bluffFrequency: 0.2, tightness: 0.4, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.5 },
	gaiaRemnant: { aggression: 0.5, efficiency: 0.9, bluffFrequency: 0.4, tightness: 0.85, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.9, heroPowerPriority: 0.9 },
	medusa: { aggression: 0.5, efficiency: 0.6, bluffFrequency: 0.3, tightness: 0.6, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.7 },
	hydra: { aggression: 0.6, efficiency: 0.5, bluffFrequency: 0.2, tightness: 0.4, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.5 },
	ares: { aggression: 0.95, efficiency: 0.4, bluffFrequency: 0.1, tightness: 0.2, usesHeroPower: false, prioritizeFace: true, tradeEfficiency: 0.3 },
	poseidon: { aggression: 0.7, efficiency: 0.7, bluffFrequency: 0.4, tightness: 0.6, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.6 },
	hades: { aggression: 0.4, efficiency: 0.8, bluffFrequency: 0.6, tightness: 0.9, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.8, heroPowerPriority: 0.9 },
	athena: { aggression: 0.3, efficiency: 0.95, bluffFrequency: 0.4, tightness: 0.9, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.95, heroPowerPriority: 0.7 },
	zeus: { aggression: 0.8, efficiency: 0.85, bluffFrequency: 0.5, tightness: 0.7, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.8, heroPowerPriority: 0.8 },

	// Egyptian god-specific profiles
	maat: { aggression: 0.3, efficiency: 0.7, bluffFrequency: 0.1, tightness: 0.9, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.8 },
	ammit: { aggression: 0.8, efficiency: 0.5, bluffFrequency: 0.2, tightness: 0.4, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.4 },
	set: { aggression: 0.7, efficiency: 0.4, bluffFrequency: 0.7, tightness: 0.3, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.3 },
	ra: { aggression: 0.6, efficiency: 0.8, bluffFrequency: 0.3, tightness: 0.7, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.7, heroPowerPriority: 0.8 },
	isis: { aggression: 0.4, efficiency: 0.9, bluffFrequency: 0.5, tightness: 0.8, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.9, heroPowerPriority: 0.9 },
	anubis: { aggression: 0.5, efficiency: 0.8, bluffFrequency: 0.4, tightness: 0.8, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.8, heroPowerPriority: 0.8 },
	apophis: { aggression: 0.9, efficiency: 0.6, bluffFrequency: 0.6, tightness: 0.3, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.4 },
	osiris: { aggression: 0.5, efficiency: 0.9, bluffFrequency: 0.4, tightness: 0.9, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.9, heroPowerPriority: 0.9 },

	// Celtic god-specific profiles
	morrigan: { aggression: 0.6, efficiency: 0.5, bluffFrequency: 0.7, tightness: 0.4, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.5 },
	cuChulainn: { aggression: 0.9, efficiency: 0.5, bluffFrequency: 0.1, tightness: 0.3, usesHeroPower: false, prioritizeFace: true, tradeEfficiency: 0.4 },
	balor: { aggression: 0.7, efficiency: 0.6, bluffFrequency: 0.3, tightness: 0.5, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.5, heroPowerPriority: 0.9 },
	dagda: { aggression: 0.5, efficiency: 0.7, bluffFrequency: 0.3, tightness: 0.7, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.7, heroPowerPriority: 0.8 },
	cernunnos: { aggression: 0.8, efficiency: 0.7, bluffFrequency: 0.4, tightness: 0.5, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.6 },
	brigid: { aggression: 0.5, efficiency: 0.85, bluffFrequency: 0.3, tightness: 0.8, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.8, heroPowerPriority: 0.8 },
	lugh: { aggression: 0.7, efficiency: 0.9, bluffFrequency: 0.5, tightness: 0.8, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.9, heroPowerPriority: 0.7 },

	// Eastern god-specific profiles
	amaterasu: { aggression: 0.4, efficiency: 0.85, bluffFrequency: 0.2, tightness: 0.8, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.8, heroPowerPriority: 0.8 },
	jadeEmperor: { aggression: 0.3, efficiency: 0.9, bluffFrequency: 0.3, tightness: 0.9, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.9, heroPowerPriority: 0.9 },
	susanoo: { aggression: 0.85, efficiency: 0.6, bluffFrequency: 0.3, tightness: 0.3, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.5 },
	sunWukong: { aggression: 0.7, efficiency: 0.6, bluffFrequency: 0.9, tightness: 0.3, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.5 },
	izanami: { aggression: 0.5, efficiency: 0.7, bluffFrequency: 0.5, tightness: 0.7, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.7, heroPowerPriority: 0.9 },
	ganesha: { aggression: 0.2, efficiency: 0.95, bluffFrequency: 0.2, tightness: 0.95, usesHeroPower: true, prioritizeFace: false, tradeEfficiency: 0.95, heroPowerPriority: 0.9 },
	kali: { aggression: 0.95, efficiency: 0.7, bluffFrequency: 0.4, tightness: 0.3, usesHeroPower: true, prioritizeFace: true, tradeEfficiency: 0.5, heroPowerPriority: 0.7 },
};
