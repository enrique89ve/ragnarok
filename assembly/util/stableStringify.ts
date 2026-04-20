/**
 * Deterministic JSON serialization with sorted keys.
 * Ensures identical output on every platform for state hashing.
 *
 * AssemblyScript doesn't have JSON.stringify, so we implement
 * a canonical serializer that matches the TypeScript side.
 */

/** Fields to exclude from hashing (UI-only, not game-mechanical) */
const EXCLUDED_FIELDS: string[] = [
	'gameLog',
	'animations',
	'targetingState',
	'spellPetPhaseStartTime',
];

export function isExcludedField(key: string): bool {
	for (let i = 0; i < EXCLUDED_FIELDS.length; i++) {
		if (EXCLUDED_FIELDS[i] == key) return true;
	}
	return false;
}

/** Escape a string for JSON output */
export function escapeJsonString(s: string): string {
	let result = '"';
	for (let i = 0; i < s.length; i++) {
		const ch = s.charCodeAt(i);
		if (ch == 0x22) result += '\\"';       // "
		else if (ch == 0x5C) result += '\\\\'; // backslash
		else if (ch == 0x0A) result += '\\n';  // newline
		else if (ch == 0x0D) result += '\\r';  // carriage return
		else if (ch == 0x09) result += '\\t';  // tab
		else if (ch < 0x20) {
			result += '\\u' + ch.toString(16).padStart(4, '0');
		} else {
			result += String.fromCharCode(ch);
		}
	}
	result += '"';
	return result;
}

/** Sort string array lexicographically (simple bubble sort for small arrays) */
export function sortStrings(arr: string[]): string[] {
	const result = arr.slice(0);
	for (let i = 0; i < result.length; i++) {
		for (let j = i + 1; j < result.length; j++) {
			if (result[j] < result[i]) {
				const tmp = result[i];
				result[i] = result[j];
				result[j] = tmp;
			}
		}
	}
	return result;
}
