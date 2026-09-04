import type {
	AttackCommand,
	ConfirmMulliganCommand,
	EndTurnCommand,
	GrantPokerHandRewardsCommand,
	FrontlineAttackCommand,
	NorseHeroPowerCommand,
	PlayCardCommand,
	SelectDiscoveryOptionCommand,
	SkipMulliganCommand,
	ToggleMulliganCardCommand,
	UseHeroPowerCommand,
	WeaponUpgradeCommand,
} from '../core/commands';

export type WireGameCommand =
	| PlayCardCommand
	| AttackCommand
	| EndTurnCommand
	| GrantPokerHandRewardsCommand
	| UseHeroPowerCommand
	| ToggleMulliganCardCommand
	| ConfirmMulliganCommand
	| SkipMulliganCommand
	| SelectDiscoveryOptionCommand
	| FrontlineAttackCommand
	| NorseHeroPowerCommand
	| WeaponUpgradeCommand;

export interface GameCommandEnvelope {
	type: 'game_command';
	matchId: string;
	seq: number;
	commandId: string;
	prevStateHash: string;
	command: WireGameCommand;
	/** Ed25519 session-key proof over every routing and command field. */
	signerPubkey?: string;
	signature?: string;
}
