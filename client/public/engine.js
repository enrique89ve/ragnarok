async function instantiate(module, imports = {}) {
  const adaptedImports = {
    env: Object.setPrototypeOf({
      abort(message, fileName, lineNumber, columnNumber) {
        // ~lib/builtins/abort(~lib/string/String | null?, ~lib/string/String | null?, u32?, u32?) => void
        message = __liftString(message >>> 0);
        fileName = __liftString(fileName >>> 0);
        lineNumber = lineNumber >>> 0;
        columnNumber = columnNumber >>> 0;
        (() => {
          // @external.js
          throw Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`);
        })();
      },
    }, Object.assign(Object.create(globalThis), imports.env || {})),
  };
  const { exports } = await WebAssembly.instantiate(module, adaptedImports);
  const memory = exports.memory || imports.env.memory;
  const adaptedExports = Object.setPrototypeOf({
    getResult() {
      // assembly/index/getResult() => ~lib/string/String
      return __liftString(exports.getResult() >>> 0);
    },
    hashStateJson(stateJson) {
      // assembly/index/hashStateJson(~lib/string/String) => ~lib/string/String
      stateJson = __lowerString(stateJson) || __notnull();
      return __liftString(exports.hashStateJson(stateJson) >>> 0);
    },
    computeCanonicalHash(state) {
      // assembly/index/computeCanonicalHash(assembly/types/GameState/GameState) => ~lib/string/String
      state = __lowerInternref(state) || __notnull();
      return __liftString(exports.computeCanonicalHash(state) >>> 0);
    },
    getEngineVersion() {
      // assembly/index/getEngineVersion() => ~lib/string/String
      return __liftString(exports.getEngineVersion() >>> 0);
    },
    createGameState() {
      // assembly/index/createGameState() => assembly/types/GameState/GameState
      return __liftInternref(exports.createGameState() >>> 0);
    },
    createPlayer(id) {
      // assembly/index/createPlayer(i32) => assembly/types/GameState/Player
      return __liftInternref(exports.createPlayer(id) >>> 0);
    },
    createManaPool(current, max) {
      // assembly/index/createManaPool(i32, i32) => assembly/types/GameState/ManaPool
      return __liftInternref(exports.createManaPool(current, max) >>> 0);
    },
    createHeroPower(name, cost) {
      // assembly/index/createHeroPower(~lib/string/String, i32) => assembly/types/GameState/HeroPower
      name = __lowerString(name) || __notnull();
      return __liftInternref(exports.createHeroPower(name, cost) >>> 0);
    },
    createCardInstance(instanceId, cardId) {
      // assembly/index/createCardInstance(~lib/string/String, i32) => assembly/types/GameState/CardInstance
      instanceId = __lowerString(instanceId) || __notnull();
      return __liftInternref(exports.createCardInstance(instanceId, cardId) >>> 0);
    },
    createEngineAction(actionType) {
      // assembly/index/createEngineAction(i32) => assembly/types/GameState/EngineAction
      return __liftInternref(exports.createEngineAction(actionType) >>> 0);
    },
    applyGameAction(state, action) {
      // assembly/index/applyGameAction(assembly/types/GameState/GameState, assembly/types/GameState/EngineAction) => assembly/types/GameState/EngineResult
      state = __retain(__lowerInternref(state) || __notnull());
      action = __lowerInternref(action) || __notnull();
      try {
        return __liftInternref(exports.applyGameAction(state, action) >>> 0);
      } finally {
        __release(state);
      }
    },
    getStateHash(state) {
      // assembly/index/getStateHash(assembly/types/GameState/GameState) => ~lib/string/String
      state = __lowerInternref(state) || __notnull();
      return __liftString(exports.getStateHash(state) >>> 0);
    },
    beginCard(id, name, cardType, manaCost) {
      // assembly/util/cardLookup/beginCard(i32, ~lib/string/String, i32, i32) => void
      name = __lowerString(name) || __notnull();
      exports.beginCard(id, name, cardType, manaCost);
    },
    setCardMeta(rarity, race, heroId, armorSlot) {
      // assembly/util/cardLookup/setCardMeta(~lib/string/String, ~lib/string/String, ~lib/string/String, ~lib/string/String) => void
      rarity = __retain(__lowerString(rarity) || __notnull());
      race = __retain(__lowerString(race) || __notnull());
      heroId = __retain(__lowerString(heroId) || __notnull());
      armorSlot = __lowerString(armorSlot) || __notnull();
      try {
        exports.setCardMeta(rarity, race, heroId, armorSlot);
      } finally {
        __release(rarity);
        __release(race);
        __release(heroId);
      }
    },
    addCardKeyword(keyword) {
      // assembly/util/cardLookup/addCardKeyword(~lib/string/String) => void
      keyword = __lowerString(keyword) || __notnull();
      exports.addCardKeyword(keyword);
    },
    setCardBattlecry(pattern, value, value2, targetType, condition, cardId, count) {
      // assembly/util/cardLookup/setCardBattlecry(~lib/string/String, i32, i32, ~lib/string/String, ~lib/string/String, i32, i32) => void
      pattern = __retain(__lowerString(pattern) || __notnull());
      targetType = __retain(__lowerString(targetType) || __notnull());
      condition = __lowerString(condition) || __notnull();
      try {
        exports.setCardBattlecry(pattern, value, value2, targetType, condition, cardId, count);
      } finally {
        __release(pattern);
        __release(targetType);
      }
    },
    setCardDeathrattle(pattern, value, value2, targetType, condition, cardId, count) {
      // assembly/util/cardLookup/setCardDeathrattle(~lib/string/String, i32, i32, ~lib/string/String, ~lib/string/String, i32, i32) => void
      pattern = __retain(__lowerString(pattern) || __notnull());
      targetType = __retain(__lowerString(targetType) || __notnull());
      condition = __lowerString(condition) || __notnull();
      try {
        exports.setCardDeathrattle(pattern, value, value2, targetType, condition, cardId, count);
      } finally {
        __release(pattern);
        __release(targetType);
      }
    },
    setCardSpellEffect(pattern, value, value2, targetType, condition, cardId, count) {
      // assembly/util/cardLookup/setCardSpellEffect(~lib/string/String, i32, i32, ~lib/string/String, ~lib/string/String, i32, i32) => void
      pattern = __retain(__lowerString(pattern) || __notnull());
      targetType = __retain(__lowerString(targetType) || __notnull());
      condition = __lowerString(condition) || __notnull();
      try {
        exports.setCardSpellEffect(pattern, value, value2, targetType, condition, cardId, count);
      } finally {
        __release(pattern);
        __release(targetType);
      }
    },
    evaluateFiveCardHand(cards) {
      // assembly/poker/handEvaluator/evaluateFiveCardHand(~lib/array/Array<assembly/types/PokerTypes/PokerCard>) => assembly/types/PokerTypes/EvaluatedHand
      cards = __lowerArray((pointer, value) => { __setU32(pointer, __lowerInternref(value) || __notnull()); }, 23, 2, cards) || __notnull();
      return __liftInternref(exports.evaluateFiveCardHand(cards) >>> 0);
    },
    findBestHand(holeCards, communityCards) {
      // assembly/poker/handEvaluator/findBestHand(~lib/array/Array<assembly/types/PokerTypes/PokerCard>, ~lib/array/Array<assembly/types/PokerTypes/PokerCard>) => assembly/types/PokerTypes/EvaluatedHand
      holeCards = __retain(__lowerArray((pointer, value) => { __setU32(pointer, __lowerInternref(value) || __notnull()); }, 23, 2, holeCards) || __notnull());
      communityCards = __lowerArray((pointer, value) => { __setU32(pointer, __lowerInternref(value) || __notnull()); }, 23, 2, communityCards) || __notnull();
      try {
        return __liftInternref(exports.findBestHand(holeCards, communityCards) >>> 0);
      } finally {
        __release(holeCards);
      }
    },
    compareHands(hand1, hand2) {
      // assembly/poker/handEvaluator/compareHands(assembly/types/PokerTypes/EvaluatedHand, assembly/types/PokerTypes/EvaluatedHand) => i32
      hand1 = __retain(__lowerInternref(hand1) || __notnull());
      hand2 = __lowerInternref(hand2) || __notnull();
      try {
        return exports.compareHands(hand1, hand2);
      } finally {
        __release(hand1);
      }
    },
    calculateHandStrength(holeCards, communityCards) {
      // assembly/poker/handEvaluator/calculateHandStrength(~lib/array/Array<assembly/types/PokerTypes/PokerCard>, ~lib/array/Array<assembly/types/PokerTypes/PokerCard>) => i32
      holeCards = __retain(__lowerArray((pointer, value) => { __setU32(pointer, __lowerInternref(value) || __notnull()); }, 23, 2, holeCards) || __notnull());
      communityCards = __lowerArray((pointer, value) => { __setU32(pointer, __lowerInternref(value) || __notnull()); }, 23, 2, communityCards) || __notnull();
      try {
        return exports.calculateHandStrength(holeCards, communityCards);
      } finally {
        __release(holeCards);
      }
    },
    processBettingAction(state, actor, action, amount, actorHp) {
      // assembly/poker/bettingEngine/processBettingAction(assembly/types/PokerTypes/BettingState, i32, i32, i32, i32) => assembly/poker/bettingEngine/BettingResult
      state = __lowerInternref(state) || __notnull();
      return __liftInternref(exports.processBettingAction(state, actor, action, amount, actorHp) >>> 0);
    },
    initializeBettingState() {
      // assembly/poker/bettingEngine/initializeBettingState() => assembly/types/PokerTypes/BettingState
      return __liftInternref(exports.initializeBettingState() >>> 0);
    },
    resetForNewRound(state) {
      // assembly/poker/bettingEngine/resetForNewRound(assembly/types/PokerTypes/BettingState) => assembly/types/PokerTypes/BettingState
      state = __lowerInternref(state) || __notnull();
      return __liftInternref(exports.resetForNewRound(state) >>> 0);
    },
    calculateCallAmount(state, isPlayer) {
      // assembly/poker/bettingEngine/calculateCallAmount(assembly/types/PokerTypes/BettingState, bool) => i32
      state = __lowerInternref(state) || __notnull();
      isPlayer = isPlayer ? 1 : 0;
      return exports.calculateCallAmount(state, isPlayer);
    },
    calculateMinRaise(state) {
      // assembly/poker/bettingEngine/calculateMinRaise(assembly/types/PokerTypes/BettingState) => i32
      state = __lowerInternref(state) || __notnull();
      return exports.calculateMinRaise(state);
    },
    isBettingPhase(phase) {
      // assembly/poker/phaseManager/isBettingPhase(i32) => bool
      return exports.isBettingPhase(phase) != 0;
    },
    isRevealPhase(phase) {
      // assembly/poker/phaseManager/isRevealPhase(i32) => bool
      return exports.isRevealPhase(phase) != 0;
    },
    createPokerDeck() {
      // assembly/types/PokerTypes/createPokerDeck() => ~lib/array/Array<assembly/types/PokerTypes/PokerCard>
      return __liftArray(pointer => __liftInternref(__getU32(pointer)), 2, exports.createPokerDeck() >>> 0);
    },
  }, exports);
  function __liftString(pointer) {
    if (!pointer) return null;
    const
      end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1,
      memoryU16 = new Uint16Array(memory.buffer);
    let
      start = pointer >>> 1,
      string = "";
    while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
    return string + String.fromCharCode(...memoryU16.subarray(start, end));
  }
  function __lowerString(value) {
    if (value == null) return 0;
    const
      length = value.length,
      pointer = exports.__new(length << 1, 2) >>> 0,
      memoryU16 = new Uint16Array(memory.buffer);
    for (let i = 0; i < length; ++i) memoryU16[(pointer >>> 1) + i] = value.charCodeAt(i);
    return pointer;
  }
  function __liftArray(liftElement, align, pointer) {
    if (!pointer) return null;
    const
      dataStart = __getU32(pointer + 4),
      length = __dataview.getUint32(pointer + 12, true),
      values = new Array(length);
    for (let i = 0; i < length; ++i) values[i] = liftElement(dataStart + (i << align >>> 0));
    return values;
  }
  function __lowerArray(lowerElement, id, align, values) {
    if (values == null) return 0;
    const
      length = values.length,
      buffer = exports.__pin(exports.__new(length << align, 1)) >>> 0,
      header = exports.__pin(exports.__new(16, id)) >>> 0;
    __setU32(header + 0, buffer);
    __dataview.setUint32(header + 4, buffer, true);
    __dataview.setUint32(header + 8, length << align, true);
    __dataview.setUint32(header + 12, length, true);
    for (let i = 0; i < length; ++i) lowerElement(buffer + (i << align >>> 0), values[i]);
    exports.__unpin(buffer);
    exports.__unpin(header);
    return header;
  }
  class Internref extends Number {}
  const registry = new FinalizationRegistry(__release);
  function __liftInternref(pointer) {
    if (!pointer) return null;
    const sentinel = new Internref(__retain(pointer));
    registry.register(sentinel, pointer);
    return sentinel;
  }
  function __lowerInternref(value) {
    if (value == null) return 0;
    if (value instanceof Internref) return value.valueOf();
    throw TypeError("internref expected");
  }
  const refcounts = new Map();
  function __retain(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount) refcounts.set(pointer, refcount + 1);
      else refcounts.set(exports.__pin(pointer), 1);
    }
    return pointer;
  }
  function __release(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount === 1) exports.__unpin(pointer), refcounts.delete(pointer);
      else if (refcount) refcounts.set(pointer, refcount - 1);
      else throw Error(`invalid refcount '${refcount}' for reference '${pointer}'`);
    }
  }
  function __notnull() {
    throw TypeError("value must not be null");
  }
  let __dataview = new DataView(memory.buffer);
  function __setU32(pointer, value) {
    try {
      __dataview.setUint32(pointer, value, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      __dataview.setUint32(pointer, value, true);
    }
  }
  function __getU32(pointer) {
    try {
      return __dataview.getUint32(pointer, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      return __dataview.getUint32(pointer, true);
    }
  }
  return adaptedExports;
}
export const {
  memory,
  __new,
  __pin,
  __unpin,
  __collect,
  __rtti_base,
  getResult,
  getResultLength,
  hashStateJson,
  computeCanonicalHash,
  getEngineVersion,
  _start,
  createGameState,
  createPlayer,
  createManaPool,
  createHeroPower,
  createCardInstance,
  createEngineAction,
  applyGameAction,
  getStateHash,
  beginCard,
  setCardStats,
  setCardMeta,
  addCardKeyword,
  setCardBattlecry,
  setCardDeathrattle,
  setCardSpellEffect,
  commitCard,
  getCardCount,
  clearCardData,
  evaluateFiveCardHand,
  findBestHand,
  compareHands,
  calculateHandStrength,
  processBettingAction,
  initializeBettingState,
  resetForNewRound,
  calculateCallAmount,
  calculateMinRaise,
  getNextPhase,
  getBettingRound,
  isBettingPhase,
  isRevealPhase,
  getCommunityCardsToReveal,
  getTotalCommunityCards,
  calculateFinalDamage,
  createPokerDeck,
} = await (async url => instantiate(
  await (async () => {
    const isNodeOrBun = typeof process != "undefined" && process.versions != null && (process.versions.node != null || process.versions.bun != null);
    if (isNodeOrBun) { return globalThis.WebAssembly.compile(await (await import("node:fs/promises")).readFile(url)); }
    else { return await globalThis.WebAssembly.compileStreaming(globalThis.fetch(url)); }
  })(), {
  }
))(new URL("engine.wasm", import.meta.url));
