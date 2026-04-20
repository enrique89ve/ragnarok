interface TxRecord {
	recipient: string;
	amountHbd: number;
	timestamp: number;
	txId: string;
}

const BURST_WINDOW_MS = 10 * 60_000;
const BURST_THRESHOLD = 5;
const RAPID_WINDOW_MS = 5 * 60_000;
const SPIKE_MULTIPLIER = 3;
const ANOMALY_WINDOW_MS = 60 * 60_000;
const AUTO_FREEZE_THRESHOLD = 3;
const RETENTION_MS = 30 * 24 * 60 * 60_000;

export class TreasuryAnomalyDetector {
	private history: TxRecord[] = [];
	private anomalyTimestamps: number[] = [];

	recordTransaction(recipient: string, amountHbd: number, txId: string, isNewRecipient: boolean): string[] {
		const now = Date.now();
		this.history.push({ recipient, amountHbd, timestamp: now, txId });
		this.pruneOld(now);

		const flags: string[] = [];

		const recentCount = this.history.filter(r => now - r.timestamp < BURST_WINDOW_MS).length;
		if (recentCount > BURST_THRESHOLD) flags.push('burst');

		if (isNewRecipient) flags.push('new_recipient');

		const amounts = this.history.filter(r => now - r.timestamp < RETENTION_MS).map(r => r.amountHbd);
		if (amounts.length > 5) {
			const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
			if (amountHbd > avg * SPIKE_MULTIPLIER) flags.push('amount_spike');
		}

		const sameRecipientRecent = this.history.filter(
			r => r.recipient === recipient && r.txId !== txId && now - r.timestamp < RAPID_WINDOW_MS
		);
		if (sameRecipientRecent.length > 0) flags.push('rapid_succession');

		if (flags.length > 0) this.anomalyTimestamps.push(now);
		return flags;
	}

	shouldAutoFreeze(): boolean {
		const now = Date.now();
		const recentAnomalies = this.anomalyTimestamps.filter(t => now - t < ANOMALY_WINDOW_MS);
		return recentAnomalies.length >= AUTO_FREEZE_THRESHOLD;
	}

	private pruneOld(now: number): void {
		this.history = this.history.filter(r => now - r.timestamp < RETENTION_MS);
		this.anomalyTimestamps = this.anomalyTimestamps.filter(t => now - t < ANOMALY_WINDOW_MS * 2);
	}
}
