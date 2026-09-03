export type GameOverAbandonmentKind = 'left' | 'technical';
export type GameOverResultTone = 'victory' | 'defeat' | 'draw';

export function getAbandonmentSubtitle(
	result: GameOverResultTone,
	kind?: GameOverAbandonmentKind,
): string {
	if (kind === 'technical') {
		if (result === 'victory') {
			return 'The opponent did not return before the reconnect window expired. This is a technical close, not a ranked win. No RUNE or ELO was credited.';
		}
		return 'The reconnect window expired. This is a technical close, not a gameplay defeat. No RUNE or ELO was credited.';
	}
	return 'You left the battle. This run is closed locally as an abandoned defeat.';
}
