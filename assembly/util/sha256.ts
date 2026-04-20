/**
 * SHA-256 implementation for AssemblyScript.
 * Used for deterministic state hashing inside the WASM engine.
 */

const K: u32[] = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(x: u32, n: u32): u32 {
	return (x >>> n) | (x << (32 - n));
}

function ch(x: u32, y: u32, z: u32): u32 {
	return (x & y) ^ (~x & z);
}

function maj(x: u32, y: u32, z: u32): u32 {
	return (x & y) ^ (x & z) ^ (y & z);
}

function sigma0(x: u32): u32 {
	return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
}

function sigma1(x: u32): u32 {
	return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
}

function gamma0(x: u32): u32 {
	return rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
}

function gamma1(x: u32): u32 {
	return rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);
}

/** Compute SHA-256 of a UTF-8 encoded string, return hex string */
export function sha256(input: string): string {
	const bytes = stringToUtf8(input);
	const hash = sha256Bytes(bytes);
	return bytesToHex(hash);
}

/** Convert string to UTF-8 byte array */
function stringToUtf8(s: string): Uint8Array {
	const arr: u8[] = [];
	for (let i = 0; i < s.length; i++) {
		const code = s.charCodeAt(i);
		if (code < 0x80) {
			arr.push(u8(code));
		} else if (code < 0x800) {
			arr.push(u8(0xC0 | (code >> 6)));
			arr.push(u8(0x80 | (code & 0x3F)));
		} else {
			arr.push(u8(0xE0 | (code >> 12)));
			arr.push(u8(0x80 | ((code >> 6) & 0x3F)));
			arr.push(u8(0x80 | (code & 0x3F)));
		}
	}
	const result = new Uint8Array(arr.length);
	for (let i = 0; i < arr.length; i++) {
		result[i] = arr[i];
	}
	return result;
}

/** SHA-256 on raw bytes */
function sha256Bytes(message: Uint8Array): Uint8Array {
	const msgLen = message.length;
	const bitLen: u64 = u64(msgLen) * 8;

	// Padding: append 1 bit, then zeros, then 64-bit length
	let padLen = 64 - ((msgLen + 9) % 64);
	if (padLen == 64) padLen = 0;
	const totalLen = msgLen + 1 + padLen + 8;
	const padded = new Uint8Array(totalLen);

	for (let i = 0; i < msgLen; i++) {
		padded[i] = message[i];
	}
	padded[msgLen] = 0x80;
	// Zeros are already in place

	// Append length as big-endian 64-bit
	padded[totalLen - 8] = u8(bitLen >> 56);
	padded[totalLen - 7] = u8(bitLen >> 48);
	padded[totalLen - 6] = u8(bitLen >> 40);
	padded[totalLen - 5] = u8(bitLen >> 32);
	padded[totalLen - 4] = u8(bitLen >> 24);
	padded[totalLen - 3] = u8(bitLen >> 16);
	padded[totalLen - 2] = u8(bitLen >> 8);
	padded[totalLen - 1] = u8(bitLen);

	// Initial hash values
	let h0: u32 = 0x6a09e667;
	let h1: u32 = 0xbb67ae85;
	let h2: u32 = 0x3c6ef372;
	let h3: u32 = 0xa54ff53a;
	let h4: u32 = 0x510e527f;
	let h5: u32 = 0x9b05688c;
	let h6: u32 = 0x1f83d9ab;
	let h7: u32 = 0x5be0cd19;

	const w = new Array<u32>(64);

	// Process each 512-bit block
	for (let offset = 0; offset < totalLen; offset += 64) {
		// Prepare message schedule
		for (let i = 0; i < 16; i++) {
			const idx = offset + i * 4;
			w[i] = (u32(padded[idx]) << 24)
				| (u32(padded[idx + 1]) << 16)
				| (u32(padded[idx + 2]) << 8)
				| u32(padded[idx + 3]);
		}
		for (let i = 16; i < 64; i++) {
			w[i] = gamma1(w[i - 2]) + w[i - 7] + gamma0(w[i - 15]) + w[i - 16];
		}

		let a = h0, b = h1, c = h2, d = h3;
		let e = h4, f = h5, g = h6, h = h7;

		for (let i = 0; i < 64; i++) {
			const t1 = h + sigma1(e) + ch(e, f, g) + K[i] + w[i];
			const t2 = sigma0(a) + maj(a, b, c);
			h = g; g = f; f = e; e = d + t1;
			d = c; c = b; b = a; a = t1 + t2;
		}

		h0 += a; h1 += b; h2 += c; h3 += d;
		h4 += e; h5 += f; h6 += g; h7 += h;
	}

	// Produce 32-byte digest
	const digest = new Uint8Array(32);
	writeU32BE(digest, 0, h0);
	writeU32BE(digest, 4, h1);
	writeU32BE(digest, 8, h2);
	writeU32BE(digest, 12, h3);
	writeU32BE(digest, 16, h4);
	writeU32BE(digest, 20, h5);
	writeU32BE(digest, 24, h6);
	writeU32BE(digest, 28, h7);
	return digest;
}

function writeU32BE(buf: Uint8Array, offset: i32, val: u32): void {
	buf[offset] = u8(val >> 24);
	buf[offset + 1] = u8(val >> 16);
	buf[offset + 2] = u8(val >> 8);
	buf[offset + 3] = u8(val);
}

function bytesToHex(bytes: Uint8Array): string {
	const HEX = '0123456789abcdef';
	let result = '';
	for (let i = 0; i < bytes.length; i++) {
		const b = bytes[i];
		result += HEX.charAt(b >> 4);
		result += HEX.charAt(b & 0x0F);
	}
	return result;
}
