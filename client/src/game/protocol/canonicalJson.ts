/**
 * canonicalJson.ts — Deterministic JSON serializer for action payloads.
 *
 * Hand-rolled per DECISIONS.md §D2. The action surface (move / playCard /
 * attack / bet / pass) is narrow enough that a tightly-scoped serializer
 * beats importing a 250-LOC library for the same job: this file plus its
 * test is auditable in one read, and there is no upstream supply-chain
 * surface to monitor.
 *
 * Accepted values (recursively, for arrays and plain objects):
 *   - finite integer `number`
 *   - `string`
 *   - `boolean`
 *   - `null`
 *   - `Array<accepted>`
 *   - plain `{ [key: string]: accepted }` (own enumerable keys only)
 *
 * Rejected (throws `Error` with a precise message):
 *   - `undefined`, `NaN`, `Infinity`, `-Infinity`
 *   - non-integer `number` (no floats in our action surface — see §D2 rationale)
 *   - `bigint`, `symbol`, `function`
 *   - `Date`, `RegExp`, `Map`, `Set`, typed arrays, class instances, any
 *     object whose prototype is not `Object.prototype` or `null`
 *
 * Output:
 *   - JSON with no whitespace and keys sorted at every level.
 *   - Sort order: `String.prototype.localeCompare(other, undefined)` with no
 *     locale options — this is the binary (code-point) comparison guaranteed
 *     by the ECMAScript spec when `locales` is undefined. Documented
 *     precisely here so any future change is a wire-break worth a comment.
 *   - String escaping: `JSON.stringify` on the scalar. We do not perform
 *     Unicode normalization; mixed-script callers MUST pre-normalize to NFC.
 *
 * Confidence: HIGH. Surface is small, tests pin a sha256 over a
 * representative payload to catch cross-engine drift.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') return false;
	if (Array.isArray(value)) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

function serializeNumber(n: number): string {
	if (!Number.isFinite(n)) {
		throw new Error(`[canonicalJson] non-finite number rejected: ${String(n)}`);
	}
	if (!Number.isInteger(n)) {
		throw new Error(`[canonicalJson] non-integer number rejected: ${n}`);
	}
	// Integers serialize identically across engines; no `-0`, no `1e10`
	// vs `10000000000` ambiguity at this domain. JSON.stringify on an
	// integer produces the same decimal form on every conforming runtime.
	return JSON.stringify(n);
}

function serializeString(s: string): string {
	// `JSON.stringify` handles the RFC 8259 escape set (\", \\, control
	// chars). The result is one canonical encoding per input byte-sequence.
	return JSON.stringify(s);
}

function serializeArray(arr: readonly unknown[]): string {
	const parts: string[] = [];
	for (const item of arr) parts.push(serializeValue(item));
	return `[${parts.join(',')}]`;
}

function serializeObject(obj: Record<string, unknown>): string {
	const keys = Object.keys(obj);
	// Binary sort — `localeCompare` with `undefined` locales yields the
	// code-point comparison the ECMAScript spec mandates for that path.
	// Equivalent to a < b string comparison on BMP code points and
	// well-defined on supplementary planes too.
	keys.sort((a, b) => a.localeCompare(b, undefined));
	const parts: string[] = [];
	for (const key of keys) {
		const value = obj[key];
		if (value === undefined) {
			throw new Error(`[canonicalJson] undefined value at key "${key}" rejected`);
		}
		parts.push(`${serializeString(key)}:${serializeValue(value)}`);
	}
	return `{${parts.join(',')}}`;
}

function describeType(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	if (typeof value !== 'object') return typeof value;
	if (value instanceof Date) return 'Date';
	if (value instanceof Map) return 'Map';
	if (value instanceof Set) return 'Set';
	if (value instanceof RegExp) return 'RegExp';
	if (ArrayBuffer.isView(value)) return 'TypedArray';
	// Fall through: plain-object detection failed but `typeof === 'object'`.
	const ctor = (value as { constructor?: { name?: string } }).constructor;
	return ctor?.name ?? 'object';
}

function serializeValue(value: unknown): string {
	if (value === null) return 'null';
	const t = typeof value;
	if (t === 'boolean') return value ? 'true' : 'false';
	if (t === 'number') return serializeNumber(value as number);
	if (t === 'string') return serializeString(value as string);
	if (t === 'undefined') {
		throw new Error('[canonicalJson] undefined rejected — must be omitted or null');
	}
	if (t === 'bigint' || t === 'symbol' || t === 'function') {
		throw new Error(`[canonicalJson] ${t} rejected — unsupported in action payloads`);
	}
	if (Array.isArray(value)) return serializeArray(value);
	if (isPlainObject(value)) return serializeObject(value);
	throw new Error(
		`[canonicalJson] unsupported value rejected — ${describeType(value)}`,
	);
}

/**
 * Canonicalize a value to a deterministic, byte-stable JSON string.
 *
 * Throws on any disallowed type (see module header). The thrown error
 * names the offending field/type so the caller can repair the action
 * payload before it ever reaches the wire.
 */
export function canonicalize(value: unknown): string {
	return serializeValue(value);
}
