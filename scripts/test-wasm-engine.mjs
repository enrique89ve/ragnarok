/**
 * test-wasm-engine.mjs — End-to-end WASM engine test
 *
 * Tests the compiled engine.wasm module via the generated engine.js bindings.
 * Run: node scripts/test-wasm-engine.mjs
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wasmPath = join(__dirname, '..', 'client', 'public', 'engine.wasm');

let passed = 0;
let failed = 0;

function assert(condition, message) {
	if (condition) {
		passed++;
		console.log(`  ✓ ${message}`);
	} else {
		failed++;
		console.error(`  ✗ ${message}`);
	}
}

function assertEqual(actual, expected, message) {
	if (actual === expected) {
		passed++;
		console.log(`  ✓ ${message}`);
	} else {
		failed++;
		console.error(`  ✗ ${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
}

async function instantiateWasm() {
	const bytes = await readFile(wasmPath);
	const module = await WebAssembly.compile(bytes);

	let memory;
	let dataview;

	const adaptedImports = {
		env: {
			abort(messagePtr, fileNamePtr, lineNumber, columnNumber) {
				throw new Error(`WASM abort at line ${lineNumber}:${columnNumber}`);
			},
		},
	};

	const { exports } = await WebAssembly.instantiate(module, adaptedImports);
	memory = exports.memory;
	dataview = new DataView(memory.buffer);

	function refreshDataView() {
		dataview = new DataView(memory.buffer);
		return dataview;
	}

	function liftString(pointer) {
		if (!pointer) return '';
		const end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1;
		const memoryU16 = new Uint16Array(memory.buffer);
		let start = pointer >>> 1;
		let result = '';
		while (end - start > 1024) result += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
		return result + String.fromCharCode(...memoryU16.subarray(start, end));
	}

	function lowerString(value) {
		if (value == null) return 0;
		const length = value.length;
		const pointer = exports.__new(length << 1, 2) >>> 0;
		const memoryU16 = new Uint16Array(memory.buffer);
		for (let i = 0; i < length; ++i) memoryU16[(pointer >>> 1) + i] = value.charCodeAt(i);
		return pointer;
	}

	return {
		exports,
		liftString,
		lowerString,
		hashStateJson(json) {
			const ptr = lowerString(json);
			return liftString(exports.hashStateJson(ptr) >>> 0);
		},
		getEngineVersion() {
			return liftString(exports.getEngineVersion() >>> 0);
		},
		beginCard(id, name, cardType, manaCost) {
			const namePtr = lowerString(name);
			exports.beginCard(id, namePtr, cardType, manaCost);
		},
		setCardStats(attack, health, heroClass, overload, spellDamage) {
			exports.setCardStats(attack, health, heroClass, overload, spellDamage);
		},
		setCardMeta(rarity, race, heroId, armorSlot) {
			exports.setCardMeta(lowerString(rarity), lowerString(race), lowerString(heroId), lowerString(armorSlot));
		},
		addCardKeyword(keyword) {
			exports.addCardKeyword(lowerString(keyword));
		},
		setCardBattlecry(pattern, value, value2, targetType, condition, cardId, count) {
			exports.setCardBattlecry(lowerString(pattern), value, value2, lowerString(targetType), lowerString(condition), cardId, count);
		},
		commitCard() {
			exports.commitCard();
		},
		getCardCount() {
			return exports.getCardCount();
		},
		clearCardData() {
			exports.clearCardData();
		},
		calculateFinalDamage(baseAttack, hpBet, handRank, extraDamage) {
			return exports.calculateFinalDamage(baseAttack, hpBet, handRank, extraDamage || 0);
		},
		getNextPhase(currentPhase) {
			return exports.getNextPhase(currentPhase);
		},
		isBettingPhase(phase) {
			return exports.isBettingPhase(phase) !== 0;
		},
		isRevealPhase(phase) {
			return exports.isRevealPhase(phase) !== 0;
		},
		getCommunityCardsToReveal(phase) {
			return exports.getCommunityCardsToReveal(phase);
		},
	};
}

async function main() {
	console.log('\n=== WASM Engine Test Suite ===\n');

	let wasm;
	try {
		wasm = await instantiateWasm();
		console.log('WASM module loaded successfully\n');
	} catch (err) {
		console.error('FATAL: Failed to load WASM module:', err.message);
		process.exit(1);
	}

	// ── Test 1: Engine Version ──
	console.log('1. Engine Version');
	const version = wasm.getEngineVersion();
	assertEqual(version, '1.0.0', 'Engine version is 1.0.0');

	// ── Test 2: SHA-256 Hashing ──
	console.log('\n2. SHA-256 Hashing');
	const hash1 = wasm.hashStateJson('hello');
	assert(hash1.length === 64, 'Hash is 64 hex chars');
	assert(/^[0-9a-f]{64}$/.test(hash1), 'Hash is valid hex');

	const hash2 = wasm.hashStateJson('hello');
	assertEqual(hash1, hash2, 'Same input produces same hash (deterministic)');

	const hash3 = wasm.hashStateJson('world');
	assert(hash1 !== hash3, 'Different input produces different hash');

	const emptyHash = wasm.hashStateJson('');
	assert(emptyHash.length === 64, 'Empty string hash is 64 chars');

	// Known SHA-256 for "hello": 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
	assertEqual(hash1, '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', 'SHA-256 of "hello" matches known value');

	// ── Test 3: Card Data Loading ──
	console.log('\n3. Card Data Loading');
	wasm.clearCardData();
	assertEqual(wasm.getCardCount(), 0, 'Card count starts at 0 after clear');

	wasm.beginCard(1001, 'Test Minion', 0, 3);
	wasm.setCardStats(4, 5, 0, 0, 0);
	wasm.setCardMeta('common', 'beast', '', '');
	wasm.addCardKeyword('taunt');
	wasm.addCardKeyword('divine_shield');
	wasm.commitCard();
	assertEqual(wasm.getCardCount(), 1, 'Card count is 1 after adding one card');

	wasm.beginCard(1002, 'Test Spell', 1, 5);
	wasm.setCardStats(0, 0, 3, 0, 2);
	wasm.setCardMeta('rare', '', '', '');
	wasm.setCardBattlecry('damage', 3, 0, 'enemy_minion', '', 0, 1);
	wasm.commitCard();
	assertEqual(wasm.getCardCount(), 2, 'Card count is 2 after adding second card');

	wasm.beginCard(1003, 'Test Weapon', 2, 2);
	wasm.setCardStats(3, 0, 9, 0, 0);
	wasm.setCardMeta('epic', '', '', '');
	wasm.commitCard();
	assertEqual(wasm.getCardCount(), 3, 'Card count is 3 after adding third card');

	// Bulk load test
	for (let i = 2000; i < 2100; i++) {
		wasm.beginCard(i, `Card_${i}`, 0, i % 10);
		wasm.setCardStats(i % 8, (i % 6) + 1, 0, 0, 0);
		wasm.setCardMeta('common', '', '', '');
		wasm.commitCard();
	}
	assertEqual(wasm.getCardCount(), 103, 'Bulk load: 103 cards total (3 + 100)');

	// ── Test 4: Poker Damage Calculation ──
	console.log('\n4. Poker Damage Calculation');
	// calculateFinalDamage(baseAttack, hpBet, handRank, extraDamage)
	// Ranks are 1-based: HIGH_CARD=1..RAGNAROK=10, rank 0 defaults to 100%
	// HAND_MULTIPLIERS_X100[1..10]: [100, 105, 110, 115, 120, 130, 140, 160, 180, 200]
	// formula: (baseAttack + hpBet) * multiplier / 100 + extraDamage
	const dmg0 = wasm.calculateFinalDamage(5, 10, 0, 0); // rank 0 = out of range, defaults to 100%
	assert(dmg0 === 15, `Default (rank 0): 5+10 * 100% = 15 (got ${dmg0})`);

	const dmg1 = wasm.calculateFinalDamage(5, 10, 1, 0); // rank 1 = HIGH_CARD, 100%
	assert(dmg1 === 15, `High Card: 5+10 * 100% = 15 (got ${dmg1})`);

	const dmg5 = wasm.calculateFinalDamage(10, 10, 5, 0); // rank 5 = FATES_PATH (Straight), 120%
	assert(dmg5 === 24, `Straight: 10+10 * 120% = 24 (got ${dmg5})`);

	const dmg10 = wasm.calculateFinalDamage(10, 10, 10, 5); // rank 10 = RAGNAROK (Royal Flush), 200% + 5 extra
	assert(dmg10 === 45, `Royal Flush: 10+10 * 200% + 5 = 45 (got ${dmg10})`);

	const dmgZero = wasm.calculateFinalDamage(0, 0, 6, 0); // rank 6 = ODINS_EYE (Flush), 130%
	assert(dmgZero >= 0, `Zero base: damage >= 0 (got ${dmgZero})`);

	// ── Test 5: Phase Manager ──
	console.log('\n5. Phase Manager');
	// Phases: FIRST_STRIKE=0, MULLIGAN=1, SPELL_PET=2, PRE_FLOP=3, FAITH=4, FORESIGHT=5, DESTINY=6, RESOLUTION=7
	const phase1 = wasm.getNextPhase(0); // FIRST_STRIKE → MULLIGAN
	assertEqual(phase1, 1, 'FIRST_STRIKE → MULLIGAN');

	const phase2 = wasm.getNextPhase(1); // MULLIGAN → SPELL_PET
	assertEqual(phase2, 2, 'MULLIGAN → SPELL_PET');

	const phase3 = wasm.getNextPhase(3); // PRE_FLOP → FAITH
	assertEqual(phase3, 4, 'PRE_FLOP → FAITH');

	assert(wasm.isBettingPhase(3), 'PRE_FLOP is a betting phase');
	assert(wasm.isBettingPhase(4), 'FAITH is a betting phase');
	assert(!wasm.isBettingPhase(1), 'MULLIGAN is not a betting phase');
	assert(wasm.isRevealPhase(4), 'FAITH is a reveal phase');

	const communityCards = wasm.getCommunityCardsToReveal(4); // FAITH reveals 3
	assertEqual(communityCards, 3, 'FAITH reveals 3 community cards');

	// ── Test 6: State Hash Determinism ──
	console.log('\n6. State Hash Determinism');
	const stateJson1 = '{"currentTurn":"player","gamePhase":"playing","turnNumber":1}';
	const stateJson2 = '{"currentTurn":"player","gamePhase":"playing","turnNumber":1}';
	const stateJson3 = '{"currentTurn":"opponent","gamePhase":"playing","turnNumber":1}';

	const sh1 = wasm.hashStateJson(stateJson1);
	const sh2 = wasm.hashStateJson(stateJson2);
	const sh3 = wasm.hashStateJson(stateJson3);

	assertEqual(sh1, sh2, 'Identical state JSON produces identical hash');
	assert(sh1 !== sh3, 'Different state produces different hash');

	// ── Test 7: Large State Hashing ──
	console.log('\n7. Large State Hashing');
	const largeState = JSON.stringify({
		currentTurn: 'player',
		gamePhase: 'playing',
		turnNumber: 15,
		player: {
			id: 'player-1',
			health: 25,
			heroArmor: 5,
			mana: { current: 7, max: 10 },
			hand: Array.from({ length: 7 }, (_, i) => ({ instanceId: `card-${i}`, cardId: 1000 + i })),
			battlefield: Array.from({ length: 5 }, (_, i) => ({ instanceId: `minion-${i}`, cardId: 2000 + i, currentAttack: 3, currentHealth: 4 })),
			deck: Array.from({ length: 20 }, (_, i) => i + 3000),
			graveyard: Array.from({ length: 10 }, (_, i) => ({ instanceId: `dead-${i}`, cardId: 4000 + i })),
		},
		opponent: {
			id: 'player-2',
			health: 18,
			heroArmor: 0,
			mana: { current: 3, max: 8 },
			hand: Array.from({ length: 4 }, (_, i) => ({ instanceId: `opp-card-${i}`, cardId: 5000 + i })),
			battlefield: Array.from({ length: 3 }, (_, i) => ({ instanceId: `opp-minion-${i}`, cardId: 6000 + i, currentAttack: 2, currentHealth: 3 })),
			deck: Array.from({ length: 15 }, (_, i) => i + 7000),
			graveyard: [],
		},
	});

	const largeHash = wasm.hashStateJson(largeState);
	assert(largeHash.length === 64, 'Large state hash is 64 chars');
	assert(/^[0-9a-f]{64}$/.test(largeHash), 'Large state hash is valid hex');

	const largeHash2 = wasm.hashStateJson(largeState);
	assertEqual(largeHash, largeHash2, 'Large state hash is deterministic');

	// ── Test 8: Edge Cases ──
	console.log('\n8. Edge Cases');
	const unicodeHash = wasm.hashStateJson('{"name":"Ødegaard","rune":"ᚱᚢᚾᛖ"}');
	assert(unicodeHash.length === 64, 'Unicode string hashes correctly');

	const specialHash = wasm.hashStateJson('{"text":"line1\\nline2\\ttab"}');
	assert(specialHash.length === 64, 'Escaped characters hash correctly');

	wasm.clearCardData();
	assertEqual(wasm.getCardCount(), 0, 'clearCardData resets to 0');

	// ── Summary ──
	console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
	if (failed > 0) {
		process.exit(1);
	}
}

main().catch(err => {
	console.error('Test suite error:', err);
	process.exit(1);
});
