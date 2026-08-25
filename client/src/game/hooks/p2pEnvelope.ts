import type {
	AttackCommand,
	ConfirmMulliganCommand,
	EndTurnCommand,
	PlayCardCommand,
	SkipMulliganCommand,
	ToggleMulliganCardCommand,
	UseHeroPowerCommand,
} from '../core/commands';

export type WireGameCommand =
	| PlayCardCommand
	| AttackCommand
	| EndTurnCommand
	| UseHeroPowerCommand
	| ToggleMulliganCardCommand
	| ConfirmMulliganCommand
	| SkipMulliganCommand;

export interface GameCommandEnvelope {
	type: 'game_command';
	matchId: string;
	seq: number;
	commandId: string;
	prevStateHash: string;
	command: WireGameCommand;
}
