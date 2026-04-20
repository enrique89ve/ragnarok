/** Exported memory */
export declare const memory: WebAssembly.Memory;
// Exported runtime interface
export declare function __new(size: number, id: number): number;
export declare function __pin(ptr: number): number;
export declare function __unpin(ptr: number): void;
export declare function __collect(): void;
export declare const __rtti_base: number;
/**
 * assembly/index/getResult
 * @returns `~lib/string/String`
 */
export declare function getResult(): string;
/**
 * assembly/index/getResultLength
 * @returns `i32`
 */
export declare function getResultLength(): number;
/**
 * assembly/index/hashStateJson
 * @param stateJson `~lib/string/String`
 * @returns `~lib/string/String`
 */
export declare function hashStateJson(stateJson: string): string;
/**
 * assembly/index/computeCanonicalHash
 * @param state `assembly/types/GameState/GameState`
 * @returns `~lib/string/String`
 */
export declare function computeCanonicalHash(state: __Internref12): string;
/**
 * assembly/index/getEngineVersion
 * @returns `~lib/string/String`
 */
export declare function getEngineVersion(): string;
/**
 * assembly/index/_start
 */
export declare function _start(): void;
/**
 * assembly/index/createGameState
 * @returns `assembly/types/GameState/GameState`
 */
export declare function createGameState(): __Internref12;
/**
 * assembly/index/createPlayer
 * @param id `i32`
 * @returns `assembly/types/GameState/Player`
 */
export declare function createPlayer(id: number): __Internref13;
/**
 * assembly/index/createManaPool
 * @param current `i32`
 * @param max `i32`
 * @returns `assembly/types/GameState/ManaPool`
 */
export declare function createManaPool(current: number, max: number): __Internref16;
/**
 * assembly/index/createHeroPower
 * @param name `~lib/string/String`
 * @param cost `i32`
 * @returns `assembly/types/GameState/HeroPower`
 */
export declare function createHeroPower(name: string, cost: number): __Internref17;
/**
 * assembly/index/createCardInstance
 * @param instanceId `~lib/string/String`
 * @param cardId `i32`
 * @returns `assembly/types/GameState/CardInstance`
 */
export declare function createCardInstance(instanceId: string, cardId: number): __Internref14;
/**
 * assembly/index/createEngineAction
 * @param actionType `i32`
 * @returns `assembly/types/GameState/EngineAction`
 */
export declare function createEngineAction(actionType: number): __Internref18;
/**
 * assembly/index/applyGameAction
 * @param state `assembly/types/GameState/GameState`
 * @param action `assembly/types/GameState/EngineAction`
 * @returns `assembly/types/GameState/EngineResult`
 */
export declare function applyGameAction(state: __Internref12, action: __Internref18): __Internref19;
/**
 * assembly/index/getStateHash
 * @param state `assembly/types/GameState/GameState`
 * @returns `~lib/string/String`
 */
export declare function getStateHash(state: __Internref12): string;
/**
 * assembly/util/cardLookup/beginCard
 * @param id `i32`
 * @param name `~lib/string/String`
 * @param cardType `i32`
 * @param manaCost `i32`
 */
export declare function beginCard(id: number, name: string, cardType: number, manaCost: number): void;
/**
 * assembly/util/cardLookup/setCardStats
 * @param attack `i32`
 * @param health `i32`
 * @param heroClass `i32`
 * @param overload `i32`
 * @param spellDamage `i32`
 */
export declare function setCardStats(attack: number, health: number, heroClass: number, overload: number, spellDamage: number): void;
/**
 * assembly/util/cardLookup/setCardMeta
 * @param rarity `~lib/string/String`
 * @param race `~lib/string/String`
 * @param heroId `~lib/string/String`
 * @param armorSlot `~lib/string/String`
 */
export declare function setCardMeta(rarity: string, race: string, heroId: string, armorSlot: string): void;
/**
 * assembly/util/cardLookup/addCardKeyword
 * @param keyword `~lib/string/String`
 */
export declare function addCardKeyword(keyword: string): void;
/**
 * assembly/util/cardLookup/setCardBattlecry
 * @param pattern `~lib/string/String`
 * @param value `i32`
 * @param value2 `i32`
 * @param targetType `~lib/string/String`
 * @param condition `~lib/string/String`
 * @param cardId `i32`
 * @param count `i32`
 */
export declare function setCardBattlecry(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void;
/**
 * assembly/util/cardLookup/setCardDeathrattle
 * @param pattern `~lib/string/String`
 * @param value `i32`
 * @param value2 `i32`
 * @param targetType `~lib/string/String`
 * @param condition `~lib/string/String`
 * @param cardId `i32`
 * @param count `i32`
 */
export declare function setCardDeathrattle(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void;
/**
 * assembly/util/cardLookup/setCardSpellEffect
 * @param pattern `~lib/string/String`
 * @param value `i32`
 * @param value2 `i32`
 * @param targetType `~lib/string/String`
 * @param condition `~lib/string/String`
 * @param cardId `i32`
 * @param count `i32`
 */
export declare function setCardSpellEffect(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void;
/**
 * assembly/util/cardLookup/commitCard
 */
export declare function commitCard(): void;
/**
 * assembly/util/cardLookup/getCardCount
 * @returns `i32`
 */
export declare function getCardCount(): number;
/**
 * assembly/util/cardLookup/clearCardData
 */
export declare function clearCardData(): void;
/**
 * assembly/poker/handEvaluator/evaluateFiveCardHand
 * @param cards `~lib/array/Array<assembly/types/PokerTypes/PokerCard>`
 * @returns `assembly/types/PokerTypes/EvaluatedHand`
 */
export declare function evaluateFiveCardHand(cards: Array<__Internref22>): __Internref24;
/**
 * assembly/poker/handEvaluator/findBestHand
 * @param holeCards `~lib/array/Array<assembly/types/PokerTypes/PokerCard>`
 * @param communityCards `~lib/array/Array<assembly/types/PokerTypes/PokerCard>`
 * @returns `assembly/types/PokerTypes/EvaluatedHand`
 */
export declare function findBestHand(holeCards: Array<__Internref22>, communityCards: Array<__Internref22>): __Internref24;
/**
 * assembly/poker/handEvaluator/compareHands
 * @param hand1 `assembly/types/PokerTypes/EvaluatedHand`
 * @param hand2 `assembly/types/PokerTypes/EvaluatedHand`
 * @returns `i32`
 */
export declare function compareHands(hand1: __Internref24, hand2: __Internref24): number;
/**
 * assembly/poker/handEvaluator/calculateHandStrength
 * @param holeCards `~lib/array/Array<assembly/types/PokerTypes/PokerCard>`
 * @param communityCards `~lib/array/Array<assembly/types/PokerTypes/PokerCard>`
 * @returns `i32`
 */
export declare function calculateHandStrength(holeCards: Array<__Internref22>, communityCards: Array<__Internref22>): number;
/**
 * assembly/poker/bettingEngine/processBettingAction
 * @param state `assembly/types/PokerTypes/BettingState`
 * @param actor `i32`
 * @param action `i32`
 * @param amount `i32`
 * @param actorHp `i32`
 * @returns `assembly/poker/bettingEngine/BettingResult`
 */
export declare function processBettingAction(state: __Internref28, actor: number, action: number, amount: number, actorHp: number): __Internref29;
/**
 * assembly/poker/bettingEngine/initializeBettingState
 * @returns `assembly/types/PokerTypes/BettingState`
 */
export declare function initializeBettingState(): __Internref28;
/**
 * assembly/poker/bettingEngine/resetForNewRound
 * @param state `assembly/types/PokerTypes/BettingState`
 * @returns `assembly/types/PokerTypes/BettingState`
 */
export declare function resetForNewRound(state: __Internref28): __Internref28;
/**
 * assembly/poker/bettingEngine/calculateCallAmount
 * @param state `assembly/types/PokerTypes/BettingState`
 * @param isPlayer `bool`
 * @returns `i32`
 */
export declare function calculateCallAmount(state: __Internref28, isPlayer: boolean): number;
/**
 * assembly/poker/bettingEngine/calculateMinRaise
 * @param state `assembly/types/PokerTypes/BettingState`
 * @returns `i32`
 */
export declare function calculateMinRaise(state: __Internref28): number;
/**
 * assembly/poker/phaseManager/getNextPhase
 * @param currentPhase `i32`
 * @returns `i32`
 */
export declare function getNextPhase(currentPhase: number): number;
/**
 * assembly/poker/phaseManager/getBettingRound
 * @param phase `i32`
 * @returns `i32`
 */
export declare function getBettingRound(phase: number): number;
/**
 * assembly/poker/phaseManager/isBettingPhase
 * @param phase `i32`
 * @returns `bool`
 */
export declare function isBettingPhase(phase: number): boolean;
/**
 * assembly/poker/phaseManager/isRevealPhase
 * @param phase `i32`
 * @returns `bool`
 */
export declare function isRevealPhase(phase: number): boolean;
/**
 * assembly/poker/phaseManager/getCommunityCardsToReveal
 * @param phase `i32`
 * @returns `i32`
 */
export declare function getCommunityCardsToReveal(phase: number): number;
/**
 * assembly/poker/phaseManager/getTotalCommunityCards
 * @param phase `i32`
 * @returns `i32`
 */
export declare function getTotalCommunityCards(phase: number): number;
/**
 * assembly/types/PokerTypes/calculateFinalDamage
 * @param baseAttack `i32`
 * @param hpBet `i32`
 * @param handRank `i32`
 * @param extraDamage `i32`
 * @returns `i32`
 */
export declare function calculateFinalDamage(baseAttack: number, hpBet: number, handRank: number, extraDamage: number): number;
/**
 * assembly/types/PokerTypes/createPokerDeck
 * @returns `~lib/array/Array<assembly/types/PokerTypes/PokerCard>`
 */
export declare function createPokerDeck(): Array<__Internref22>;
/** assembly/types/GameState/GameState */
declare class __Internref12 extends Number {
  private __nominal12: symbol;
  private __nominal0: symbol;
}
/** assembly/types/GameState/Player */
declare class __Internref13 extends Number {
  private __nominal13: symbol;
  private __nominal0: symbol;
}
/** assembly/types/GameState/ManaPool */
declare class __Internref16 extends Number {
  private __nominal16: symbol;
  private __nominal0: symbol;
}
/** assembly/types/GameState/HeroPower */
declare class __Internref17 extends Number {
  private __nominal17: symbol;
  private __nominal0: symbol;
}
/** assembly/types/GameState/CardInstance */
declare class __Internref14 extends Number {
  private __nominal14: symbol;
  private __nominal0: symbol;
}
/** assembly/types/GameState/EngineAction */
declare class __Internref18 extends Number {
  private __nominal18: symbol;
  private __nominal0: symbol;
}
/** assembly/types/GameState/EngineResult */
declare class __Internref19 extends Number {
  private __nominal19: symbol;
  private __nominal0: symbol;
}
/** assembly/types/PokerTypes/PokerCard */
declare class __Internref22 extends Number {
  private __nominal22: symbol;
  private __nominal0: symbol;
}
/** assembly/types/PokerTypes/EvaluatedHand */
declare class __Internref24 extends Number {
  private __nominal24: symbol;
  private __nominal0: symbol;
}
/** assembly/types/PokerTypes/BettingState */
declare class __Internref28 extends Number {
  private __nominal28: symbol;
  private __nominal0: symbol;
}
/** assembly/poker/bettingEngine/BettingResult */
declare class __Internref29 extends Number {
  private __nominal29: symbol;
  private __nominal0: symbol;
}
