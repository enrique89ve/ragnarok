/*
 * PROTOTYPE - interactive terminal shell for rankedSettlement/settlementModel.ts.
 * Run with: pnpm run prototype:p2p-settlement
 */
/* eslint-disable no-console */

import {
	createInitialSettlementPrototypeState,
	getScenarioNames,
	reduceSettlementPrototype,
	type SettlementAction,
	type SettlementPrototypeState,
} from './settlementModel';

const bold = (value: string) => `\x1b[1m${value}\x1b[0m`;
const dim = (value: string) => `\x1b[2m${value}\x1b[0m`;
const green = (value: string) => `\x1b[32m${value}\x1b[0m`;
const red = (value: string) => `\x1b[31m${value}\x1b[0m`;
const yellow = (value: string) => `\x1b[33m${value}\x1b[0m`;

let state = createInitialSettlementPrototypeState();

const KEY_ACTIONS: Readonly<Record<string, SettlementAction>> = {
	'1': { type: 'scenario', scenario: 'qa_local_rewards' },
	'2': { type: 'scenario', scenario: 'happy' },
	'3': { type: 'scenario', scenario: 'result_only' },
	'4': { type: 'scenario', scenario: 'transcript_mismatch' },
	'5': { type: 'scenario', scenario: 'hidden_prompt' },
	'6': { type: 'scenario', scenario: 'disconnect' },
	w: { type: 'declare_local_win' },
	l: { type: 'qa_full_catalog' },
	f: { type: 'full_nft_ranked' },
	a: { type: 'dual_anchor' },
	x: { type: 'race_transcript' },
	d: { type: 'deterministic_transcript' },
	v: { type: 'open_review' },
	s: { type: 'winner_signs' },
	c: { type: 'loser_signs' },
	u: { type: 'submit_to_arbiter' },
	y: { type: 'arbiter_verifies' },
	o: { type: 'opponent_disconnects' },
	t: { type: 'timeout_claim' },
	n: { type: 'reset' },
};

function render(next: SettlementPrototypeState): string {
	const settlementColor = next.settlement.status === 'credited'
		? green
		: next.settlement.status === 'ready_to_submit'
			? yellow
			: red;

	return [
		bold('PROTOTYPE - P2P Ranked Settlement / Winner Arbiter'),
		dim('Question: how can QA show local RUNE/XP while chain settlement stays guarded?'),
		'',
		`${bold('match')} ${next.matchId}`,
		`${bold('phase')} ${next.phase}    ${bold('type')} ${next.matchType}    ${bold('universe')} ${next.universe}    ${bold('winner')} ${next.winner ?? 'none'}`,
		`${bold('deckEvidence')} ${next.deckEvidence}`,
		`${bold('anchor')} ${next.anchor.status}  pubkeys=${flag(next.anchor.pubkeysPinned)} deckHashes=${flag(next.anchor.deckHashesPinned)} engine=${flag(next.anchor.engineHashPinned)}`,
		`${bold('transcript')} ${next.transcript.mode}  deterministic=${flag(next.transcript.deterministicOrder)}`,
		`${dim('localRoot')}  ${next.transcript.localRoot ?? 'none'}`,
		`${dim('remoteRoot')} ${next.transcript.remoteRoot ?? 'none'}`,
		`${bold('review')} visible=${flag(next.review.visible)} winnerAccepted=${flag(next.review.winnerAccepted)} loserAccepted=${flag(next.review.loserAccepted)}`,
		`${bold('signatures')} winner=${flag(next.signatures.winner)} loser=${flag(next.signatures.loser)}`,
		`${bold('disconnect')} opponentOffline=${flag(next.disconnect.opponentOffline)} timeoutClaimReady=${flag(next.disconnect.timeoutClaimReady)}`,
		`${bold('arbiter')} ${next.arbiter.status}${next.arbiter.reason ? ` (${next.arbiter.reason})` : ''}`,
		`${bold('reward UI')} ${rewardScope(next.rewardFeedback.scope)} ${next.rewardFeedback.label}`,
		`${bold('shown locally')} RUNE=${next.rewardFeedback.runeShown} matchXP=${next.rewardFeedback.matchXpShown} CardXP=${next.rewardFeedback.cardXpShown}`,
		`${dim('persistence')} ${next.rewardFeedback.persistence}`,
		`${bold('settlement')} ${settlementColor(next.settlement.status)} - ${next.settlement.reason}`,
		`${bold('chain RUNE')} winner=${next.settlement.winnerRune} loser=${next.settlement.loserRune}${next.settlement.sourceKey ? ` source=${next.settlement.sourceKey}` : ''}`,
		'',
		bold('event log'),
		...next.eventLog.map(entry => `  - ${entry}`),
		'',
		bold('keys'),
		[
			key('1', 'QA local reward flow'),
			key('2', 'full NFT happy path'),
			key('3', 'result-only rejected'),
			key('4', 'transcript mismatch'),
			key('5', 'hidden prompt blocked'),
			key('6', 'disconnect no-settlement'),
		].join('  '),
		[
			key('w', 'win'),
			key('l', 'QA full catalog'),
			key('f', 'full NFT ranked'),
			key('a', 'dual anchor'),
			key('x', 'race roots'),
			key('d', 'deterministic roots'),
			key('v', 'visible review'),
		].join('  '),
		[
			key('s', 'winner sign'),
			key('c', 'counter sign'),
			key('u', 'submit'),
			key('y', 'arbiter verifies'),
			key('o', 'opponent disconnect'),
			key('t', 'timeout claim'),
			key('n', 'reset'),
			key('q', 'quit'),
		].join('  '),
	].join('\n');
}

function flag(value: boolean): string {
	return value ? green('yes') : red('no');
}

function rewardScope(scope: SettlementPrototypeState['rewardFeedback']['scope']): string {
	if (scope === 'chain') return green(scope);
	if (scope === 'qa_local') return yellow(scope);
	return red(scope);
}

function key(k: string, label: string): string {
	return `${bold(`[${k}]`)} ${dim(label)}`;
}

function dispatch(action: SettlementAction): void {
	state = reduceSettlementPrototype(state, action);
	draw();
}

function draw(): void {
	console.clear();
	console.log(render(state));
}

function actionForKey(keyName: string): SettlementAction | null {
	if (keyName === 'q') process.exit(0);
	return KEY_ACTIONS[keyName] ?? null;
}

function runDemo(): void {
	for (const scenario of getScenarioNames()) {
		state = reduceSettlementPrototype(createInitialSettlementPrototypeState(), {
			type: 'scenario',
			scenario,
		});
		console.log(render(state));
		console.log('\n' + '-'.repeat(80) + '\n');
	}
}

if (process.argv.includes('--demo')) {
	runDemo();
	process.exit(0);
}

if (!process.stdin.isTTY) {
	console.log(render(state));
	console.log('\nRun in a TTY for keyboard controls: pnpm run prototype:p2p-settlement');
	process.exit(0);
}

draw();
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
	const action = actionForKey(chunk.toLowerCase());
	if (action) dispatch(action);
});
