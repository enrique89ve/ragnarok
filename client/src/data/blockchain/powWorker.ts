async function sha256(input: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const buffer = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(buffer))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

function hasLeadingZeroBits(hexHash: string, bits: number): boolean {
	const fullNibbles = Math.floor(bits / 4);
	for (let i = 0; i < fullNibbles; i++) {
		if (hexHash[i] !== '0') return false;
	}
	const remainder = bits % 4;
	if (remainder > 0) {
		const nibble = parseInt(hexHash[fullNibbles], 16);
		if ((nibble >> (4 - remainder)) !== 0) return false;
	}
	return true;
}

interface WorkerMessage {
	payloadHash: string;
	startIndex: number;
	endIndex: number;
	difficulty: number;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
	const { payloadHash, startIndex, endIndex, difficulty } = e.data;
	const nonces: number[] = [];

	for (let i = startIndex; i < endIndex; i++) {
		const challenge = await sha256(`${payloadHash}:${i}`);
		let nonce = 0;
		while (true) {
			const hash = await sha256(`${challenge}:${nonce}`);
			if (hasLeadingZeroBits(hash, difficulty)) break;
			nonce++;
		}
		nonces.push(nonce);
	}

	self.postMessage({ startIndex, nonces });
};
