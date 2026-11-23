#!/usr/bin/env python3
"""Apply the draft finale-only Eitr economy to a local checkout of Ragnarok.

Usage:
    python apply_ragnarok_finale_eitr.py /path/to/ragnarok

Runs strict preflight checks and refuses to overwrite unanticipated code.
Designed against enrique89ve/ragnarok main @ 4f72e76 (2026-11-20).
Changes are staged in the working tree, not committed.
"""
from pathlib import Path
import sys

NEW_POLICY = '''/**
 * Campaign finale Eitr reward policy v1. Identical in testnet and mainnet.
 * Values are awarded at most once per account/mission/season, and ONLY after
 * an independent campaign replay verifier attests the winning run.
 *
 * No mission or milestone directly mints an NFT. RUNE remains the main pack
 * acquisition currency; Eitr is a limited secondary forge resource.
 */
export const CAMPAIGN_FINALE_EITR_POLICY_VERSION = 'campaign-finale-eitr-v1' as const;

export const CAMPAIGN_FINALE_EITR_REWARDS = {
  'norse-9': 40,
  'greek-10': 40,
  'egyptian-10': 40,
  'celtic-10': 40,
  'eastern-10': 60,
  'twilight-9': 100,
} as const satisfies Readonly<Record<string, number>>;

export const CAMPAIGN_FINALE_EITR_ACCOUNT_CAP = Object.values(
  CAMPAIGN_FINALE_EITR_REWARDS,
).reduce((sum, reward) => sum + reward, 0); // 320 per season

// An explicit 50,000-account seasonal budget, equal in testnet and mainnet.
// Change only through an approved, versioned policy/activation ceremony.
export const CAMPAIGN_FINALE_EITR_POOL_CAP = CAMPAIGN_FINALE_EITR_ACCOUNT_CAP * 50_000;

export function getCampaignFinaleEitrReward(missionId: string): number {
  return Object.prototype.hasOwnProperty.call(CAMPAIGN_FINALE_EITR_REWARDS, missionId)
    ? CAMPAIGN_FINALE_EITR_REWARDS[missionId as keyof typeof CAMPAIGN_FINALE_EITR_REWARDS]
    : 0;
}
'''

NEW_TEST = '''import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_FINALE_EITR_ACCOUNT_CAP,
  CAMPAIGN_FINALE_EITR_POOL_CAP,
  CAMPAIGN_FINALE_EITR_REWARDS,
  getCampaignFinaleEitrReward,
} from './campaignFinaleEitr';
import { createCampaignFinaleEitrSourceKey, createEitrLedgerEntryId } from './eitrEconomy';

describe('campaign finale Eitr v1', () => {
  it('pays only six canonical chapter finale mission IDs', () => {
    expect(CAMPAIGN_FINALE_EITR_REWARDS).toEqual({
      'norse-9': 40,
      'greek-10': 40,
      'egyptian-10': 40,
      'celtic-10': 40,
      'eastern-10': 60,
      'twilight-9': 100,
    });
    expect(getCampaignFinaleEitrReward('norse-8')).toBe(0);
    expect(getCampaignFinaleEitrReward('twilight-8')).toBe(0);
    expect(getCampaignFinaleEitrReward('norse-9')).toBe(40);
    expect(CAMPAIGN_FINALE_EITR_ACCOUNT_CAP).toBe(320);
    expect(CAMPAIGN_FINALE_EITR_POOL_CAP).toBe(16_000_000);
  });

  it('uses account, season, campaign and mission to prevent duplicate credits', () => {
    const args = { seasonId: 'season-A', account: 'alice', campaignId: 'war-of-pantheons', missionId: 'norse-9' };
    const sourceKey = createCampaignFinaleEitrSourceKey(args);
    const entryId = createEitrLedgerEntryId({ seasonId: args.seasonId, direction: 'credit', sourceType: 'campaign_finale', sourceKey });
    expect(sourceKey).toBe('campaign_finale:season-A:alice:war-of-pantheons:norse-9');
    expect(entryId).toContain('season-A:credit:campaign_finale:');
    expect(createCampaignFinaleEitrSourceKey({ ...args, seasonId: 'season-B' })).not.toBe(sourceKey);
  });
});
'''

NEW_ADR = '''# ADR 0014 — Eitr awards for verified campaign finales

**Status:** Proposed / implementation behind verifier gate  
**Date:** 2026-11-21  
**Supersedes:** Only the "burn is Eitr's sole source" and "no campaign Eitr" portions of ADR 0001. All forge costs, non-transferability, NFT supply and XP rules remain unchanged.

## Decision

RUNE remains the regular earned gameplay resource and primary route to packs; campaigns, wins and achievements must not award NFT instances directly. Eitr remains the crafting resource, with one controlled new source: independently verified victories on the final mission of each of the six campaign chapters.

| Chapter finale | Eitr |
|---|---:|
| norse-9 | 40 |
| greek-10 | 40 |
| egyptian-10 | 40 |
| celtic-10 | 40 |
| eastern-10 | 60 |
| twilight-9 | 100 |
| **Total/account/season** | **320** |

**No bonuses by difficulty.** A finale may credit its Eitr reward once per `(seasonId, account, campaignId, missionId)`; it is never reissued just because a player replays the same mission in the same season. A new season can reward a new independently verified clear, even if lifetime campaign progress already exists. Eitr is still wiped on season rollover; unfinished or unspent Eitr is not portable. The maximum campaign-finale source emission is 16,000,000 Eitr per season (320 x 50,000 eligible accounts). Burn credits are outside this source budget.

## Security gate — NOT yet live

Current `campaign_result` validates the registry hash, authorization, nonce and prerequisites, but it does **not** independently replay and validate the battle transcript. Consequently Eitr **must not** be credited solely on the accepted `campaign_result` envelope, even if `campaignProgress.status` says `verified`.

The new `CampaignRegistryProvider.verifyEconomicFinale(submission)` is **fail-closed**: production has no implementation yet; the absence of a verifier prevents Eitr issuance. Any future implementation must independently validate the transcript, final victory, mission identity, participant/deck constraints and approved activation block/season. It must not accept client-supplied reward amounts. Its result must be deterministic and replayable.

Do not enable the verifier by merely returning `true` in production. The test doubles intentionally return `true` to exercise the ledger mechanics, not to attest a real game.

## Accounting

Use `EitrLedgerEntry.sourceType = 'campaign_finale'` and key:

`campaign_finale:{seasonId}:{account}:{campaignId}:{missionId}`

Before writing, check account and global `campaign_finale` credit totals for that season. Grant the complete configured finale amount or none, without partial credit. Eitr continues to have one common wallet balance: credits from `burn`, `forge_refund` and `campaign_finale` minus `forge_commit` debits. Forged NFTs still start at level 1 / XP 0, use the existing rarity-constrained RNG, and consume standard NFT supply.

## Important open blockers

1. Implement and prove an authoritative, deterministic transcript replay verifier for campaign victories. Until then, there are no live Eitr payouts from campaign results.
2. Provide atomic persistence/recovery around campaign progression, ledger credit, burn, forge and pack fulfillment. The existing Map/JSON adapter cannot guarantee operation-level rollback.
3. Execute full suite, static checks, differential replay and crash-injection tests in the repository CI. This patch alone does not certify mainnet readiness.
4. Authorize policy activation by explicit deployment/cutover procedure; do not retroactively distribute Eitr for old results.
5. Review and reconcile the pre-existing RUNE testnet/mainnet parameter mismatch separately; this new Eitr policy deliberately has the same values for both networks.
'''


def replace_once(text: str, old: str, new: str, name: str) -> str:
    n = text.count(old)
    if n != 1:
        raise RuntimeError(f"{name}: expected one occurrence, found {n} of {old[:110]!r}")
    return text.replace(old, new, 1)


def prepare(root: Path) -> dict[Path, str]:
    changed: dict[Path, str] = {}

    def edit(path: str, edits: list[tuple[str, str]]):
        f = root / path
        if not f.is_file():
            raise RuntimeError(f"Missing {path}")
        raw = f.read_bytes().decode('utf-8')
        newline = '\r\n' if '\r\n' in raw else '\n'
        out = raw.replace('\r\n', '\n')
        for old, new in edits:
            out = replace_once(out, old, new, path)
        if newline == '\r\n':
            out = out.replace('\n', '\r\n')
        changed[f] = out

    edit('shared/protocol-core/eitrEconomy.ts', [
        ("\t| 'forge_refund';", "\t| 'forge_refund'\n\t| 'campaign_finale';"),
        ('''export function createForgeCommitEitrSourceKey(input: {''',
         '''/** Once per mission/account/season, unrelated to a specific publishing trxId. */
export function createCampaignFinaleEitrSourceKey(input: {
  seasonId: string;
  account: string;
  campaignId: string;
  missionId: string;
}): string {
  return `campaign_finale:${input.seasonId}:${input.account}:${input.campaignId}:${input.missionId}`;
}

export function createForgeCommitEitrSourceKey(input: {''')
    ])

    edit('shared/protocol-core/types.ts', [
        ('''\tcreateBurnEitrSourceKey,\n''', '''\tcreateBurnEitrSourceKey,\n\tcreateCampaignFinaleEitrSourceKey,\n'''),
        ('''\tgetMission(missionId: string): CampaignRegistryMission | null;\n}''',
         '''\tgetMission(missionId: string): CampaignRegistryMission | null;
	/** Fail-closed economic attestation; must replay a victorious transcript. */
	verifyEconomicFinale?: (submission: Readonly<CampaignSubmissionRecord>) => Promise<boolean>;
}'''),
    ])

    edit('shared/protocol-core/apply.ts', [
        ('''import { classifyCard } from '../schemas/cardCategory';''',
         '''import {
  CAMPAIGN_FINALE_EITR_ACCOUNT_CAP,
  CAMPAIGN_FINALE_EITR_POOL_CAP,
  getCampaignFinaleEitrReward,
} from './campaignFinaleEitr';
import { classifyCard } from '../schemas/cardCategory';'''),
        ('''\tcreateBurnEitrSourceKey,\n''', '''\tcreateBurnEitrSourceKey,\n\tcreateCampaignFinaleEitrSourceKey,\n'''),
        ('''\tif (await deps.state.getCampaignSubmission(submissionKey)) {
		return { status: 'ignored' };
	}
''',
         '''\tconst existingSubmission = await deps.state.getCampaignSubmission(submissionKey);
	if (existingSubmission) {
		// Crash recovery: a consumed submission may have committed progress
		// before an independently verified finale Eitr credit was persisted.
		// Never treat a duplicate envelope itself as evidence of victory.
		if (existingSubmission.status === 'consumed'
			&& await deps.state.getCampaignProgress(op.broadcaster, parsed.campaignId, parsed.missionId)) {
			const eitrResult = await applyCampaignFinaleEitrCredit(op, existingSubmission, deps);
			if (eitrResult) return eitrResult;
		}
		return { status: 'ignored' };
	}
'''),
        ('''\tif (!existingProgress) {
		const runeResult = await applyCampaignFirstClearRuneCredit(op, progress, deps);
		if (runeResult) return runeResult;
	}

	return { status: 'applied' };
}''',
         '''\tif (!existingProgress) {
		const runeResult = await applyCampaignFirstClearRuneCredit(op, progress, deps);
		if (runeResult) return runeResult;
	}

	// Eitr is a separate, limited finale-only stream. It is NEVER issued
	// without an independent proof of victory (not just a result hash).
	const eitrResult = await applyCampaignFinaleEitrCredit(op, submission, deps);
	if (eitrResult) return eitrResult;

	return { status: 'applied' };
}'''),
        ('''async function mintRewardCards(
''',
         '''/**
 * Fail-closed, season-scoped secondary campaign reward. The accepted
 * submission record is NOT sufficient evidence; the injected economic
 * verifier must independently replay the actual victory transcript.
 */
async function applyCampaignFinaleEitrCredit(
  op: ProtocolOp,
  submission: CampaignSubmissionRecord,
  deps: ProtocolCoreDeps,
): Promise<OpResult | null> {
  const reward = getCampaignFinaleEitrReward(submission.missionId);
  if (reward <= 0) return null;
  if (submission.account !== op.broadcaster) return reject('campaign finale reward owner mismatch');

  const verify = deps.campaigns.verifyEconomicFinale;
  if (!verify || !await verify(submission)) return null;

  const seasonId = activeRuneSeasonId(deps);
  const sourceKey = createCampaignFinaleEitrSourceKey({
    seasonId, account: op.broadcaster,
    campaignId: submission.campaignId, missionId: submission.missionId,
  });
  const entryId = createEitrLedgerEntryId({
    seasonId, direction: 'credit', sourceType: 'campaign_finale', sourceKey,
  });
  const existingEntry = await deps.state.getEitrLedgerEntry(entryId);
  if (existingEntry) return existingEntry.account === op.broadcaster
    ? null : reject('campaign finale Eitr source has another owner');

  const accountIssued = await deps.state.getEitrLedgerTotal({
    seasonId, account: op.broadcaster, direction: 'credit', sourceType: 'campaign_finale',
  });
  const poolIssued = await deps.state.getEitrLedgerTotal({
    seasonId, direction: 'credit', sourceType: 'campaign_finale',
  });
  // No partial Eitr finale awards: either the complete source allocation fits
  // or no entry is written. Burn-derived Eitr has a separate source/budget.
  if (accountIssued + reward > CAMPAIGN_FINALE_EITR_ACCOUNT_CAP
    || poolIssued + reward > CAMPAIGN_FINALE_EITR_POOL_CAP) return null;

  const balanceBefore = await getEitrBalanceFor(deps, op.broadcaster);
  await deps.state.putEitrLedgerEntry({
    entryId, seasonId, account: op.broadcaster,
    direction: 'credit', sourceType: 'campaign_finale', sourceKey,
    amount: reward, balanceBefore, balanceAfter: balanceBefore + reward,
    trxId: op.trxId, blockNum: op.blockNum, timestamp: op.timestamp,
  });
  return null;
}

async function mintRewardCards(
'''),
    ])

    edit('server/services/chainState.ts', [
        ("sourceType: z.enum(['burn', 'forge_commit', 'forge_refund']),",
         "sourceType: z.enum(['burn', 'forge_commit', 'forge_refund', 'campaign_finale']),"),
        ('''\tburnCreditTotal: number;
\tforgeCommitDebitTotal: number;''',
         '''\tburnCreditTotal: number;
\tcampaignFinaleCreditTotal: number;
\tforgeCommitDebitTotal: number;'''),
        ('''\t\tburnCreditTotal: 0,
\t\tforgeCommitDebitTotal: 0,''',
         '''\t\tburnCreditTotal: 0,
\t\tcampaignFinaleCreditTotal: 0,
\t\tforgeCommitDebitTotal: 0,'''),
        ('''\t\t\tif (entry.sourceType === 'burn') stats.burnCreditTotal += entry.amount;
\t\t\tif (entry.sourceType === 'forge_refund')''',
         '''\t\t\tif (entry.sourceType === 'burn') stats.burnCreditTotal += entry.amount;
\t\t\tif (entry.sourceType === 'campaign_finale') stats.campaignFinaleCreditTotal += entry.amount;
\t\t\tif (entry.sourceType === 'forge_refund')'''),
    ])

    edit('shared/protocol-core/campaignResult.test.ts', [
        ('''\treadonly runeLedger: Map<string, RuneLedgerEntry>;
}''',
         '''\treadonly runeLedger: Map<string, RuneLedgerEntry>;
\treadonly eitrLedger: Map<string, EitrLedgerEntry>;
}'''),
        ('''\tconst runeLedger = new Map<string, RuneLedgerEntry>();
''',
         '''\tconst runeLedger = new Map<string, RuneLedgerEntry>();
\tconst eitrLedger = new Map<string, EitrLedgerEntry>();
'''),
        ('''\t\truneLedger,

\t\tasync getGenesis''',
         '''\t\truneLedger,
\t\teitrLedger,

\t\tasync getGenesis'''),
        ('''\t\tasync getEitrLedgerEntry(): Promise<EitrLedgerEntry | null> { return null; },
\t\tasync putEitrLedgerEntry(): Promise<void> { /* noop */ },
\t\tasync getEitrLedgerEntries(): Promise<EitrLedgerEntry[]> { return []; },
\t\tasync getEitrLedgerTotal(): Promise<number> { return 0; },''',
         '''\t\tasync getEitrLedgerEntry(id): Promise<EitrLedgerEntry | null> { return eitrLedger.get(id) ?? null; },
\t\tasync putEitrLedgerEntry(entry): Promise<void> { eitrLedger.set(entry.entryId, entry); },
\t\tasync getEitrLedgerEntries(query): Promise<EitrLedgerEntry[]> {
\t\t\treturn [...eitrLedger.values()].filter(entry =>
\t\t\t\tentry.seasonId === query.seasonId
\t\t\t\t&& (query.direction === undefined || entry.direction === query.direction)
\t\t\t\t&& (query.account === undefined || entry.account === query.account)
\t\t\t\t&& (query.sourceType === undefined || entry.sourceType === query.sourceType)
\t\t\t\t&& (query.sourceKeyPrefix === undefined || entry.sourceKey.startsWith(query.sourceKeyPrefix)));
\t\t},
\t\tasync getEitrLedgerTotal(query): Promise<number> {
\t\t\tconst entries = await this.getEitrLedgerEntries(query);
\t\t\treturn entries.reduce((sum, entry) => sum + entry.amount, 0);
\t\t},'''),
    ])


    # Remove legacy reward-claim NFT minting. NFT acquisition must flow through
    # RUNE packs or the separate Eitr forge; achievements only pay RUNE.
    apply_path = root / 'shared/protocol-core/apply.ts'
    apply_text = changed[apply_path]
    apply_newline = '\r\n' if '\r\n' in apply_text else '\n'
    apply_text = apply_text.replace('\r\n', '\n')
    apply_text = replace_once(
        apply_text,
        "\tawait mintRewardCards(op, rewardId, reward, deps);\n",
        "\t// No direct NFT issuance from achievements: RUNE-only rewards.\n",
        'shared/protocol-core/apply.ts',
    )
    start_marker = "async function mintRewardCards(\n"
    end_marker = "async function applyRewardRuneBonus(\n"
    if apply_text.count(start_marker) != 1 or apply_text.count(end_marker) != 1:
        raise RuntimeError('Could not locate legacy reward card mint helper')
    start = apply_text.index(start_marker)
    end = apply_text.index(end_marker)
    if start >= end:
        raise RuntimeError('Unexpected reward helper function order')
    changed[apply_path] = (apply_text[:start] + apply_text[end:]).replace('\n', apply_newline)

    # Remove metadata that falsely advertises direct NFT reward cards.
    import re
    reward_path = root / 'shared/protocol-core/rewardCatalog.ts'
    raw_reward = reward_path.read_text(encoding='utf-8')
    reward_new, n = re.subn(r"cards: \[[^\n]*\],", "cards: [],", raw_reward)
    if n != 10:
        raise RuntimeError(f'rewardCatalog expected 10 direct NFT reward definitions, found {n}')
    changed[reward_path] = reward_new

    edit('shared/protocol-core/runeEconomy.test.ts', [
        ("\t\t\tcards: [{ cardId: 20001, rarity: 'rare' }],",
         "\t\t\tcards: [],"),
    ])
    edit('shared/protocol-core/replayTraces.test.ts', [
        ("it('reward claim mints from reward pool and grants RUNE', async () => {",
         "it('reward claim pays RUNE only and cannot mint NFTs directly', async () => {"),
        ("\t\t// Card minted from reward supply\n"
         "\t\tconst rewardCard = state.cards.get('reward-first_victory-alice-0');\n"
         "\t\texpect(rewardCard).toBeDefined();\n"
         "\t\texpect(rewardCard!.mintSource).toBe('reward');",
         "\t\t// Achievements no longer distribute NFTs outside the RUNE pack economy.\n"
         "\t\texpect(state.cards.has('reward-first_victory-alice-0')).toBe(false);"),
    ])

    # Add integration tests immediately before the final describe() closing brace.
    testfile = root / 'shared/protocol-core/campaignResult.test.ts'
    t = changed[testfile]
    marker = '\n});\n'
    if not t.endswith(marker):
        raise RuntimeError('Unexpected end of campaignResult.test.ts')
    integration_tests = '''
  it('does not pay finale Eitr when the independent verifier is missing', async () => {
    const state = createStateAdapter();
    const deps = createDeps(state);
    const result = await applyCampaignResult(deps, { missionId: 'norse-9', nonce: 1 });
    expect(result.status).toBe('applied');
    expect(state.eitrLedger.size).toBe(0);
  });

  it('rejects unverifiable victories for Eitr while preserving campaign progress', async () => {
    const state = createStateAdapter();
    const base = createDeps(state);
    const deps: ProtocolCoreDeps = {
      ...base,
      campaigns: { ...base.campaigns, verifyEconomicFinale: async () => false },
    };
    const result = await applyCampaignResult(deps, { missionId: 'norse-9', nonce: 1 });
    expect(result.status).toBe('applied');
    expect(state.eitrLedger.size).toBe(0);
    expect(state.campaignProgress.has('alice:war-of-pantheons:norse-9')).toBe(true);
  });

  it('credits exactly one Eitr finale reward per season after independent verification', async () => {
    const state = createStateAdapter();
    const base = createDeps(state);
    const deps: ProtocolCoreDeps = {
      ...base,
      campaigns: { ...base.campaigns, verifyEconomicFinale: async () => true },
    };
    const first = await applyCampaignResult(deps, { missionId: 'norse-9', nonce: 1 });
    expect(first.status).toBe('applied');
    expect(await state.getEitrLedgerTotal({ seasonId: TESTNET_SEASON_ID, account: 'alice', sourceType: 'campaign_finale' })).toBe(40);
    const again = await applyCampaignResult(deps, { missionId: 'norse-9', nonce: 2 });
    expect(again.status).toBe('applied');
    expect(await state.getEitrLedgerTotal({ seasonId: TESTNET_SEASON_ID, account: 'alice', sourceType: 'campaign_finale' })).toBe(40);
    expect(state.eitrLedger.size).toBe(1);
  });

  it('limits all six verified finale Eitr rewards to 320 per season per account', async () => {
    const state = createStateAdapter();
    const base = createDeps(state);
    const deps: ProtocolCoreDeps = {
      ...base,
      campaigns: { ...base.campaigns, verifyEconomicFinale: async () => true },
    };
    const finales = ['norse-9', 'greek-10', 'egyptian-10', 'celtic-10', 'eastern-10', 'twilight-9'];
    for (let i = 0; i < finales.length; i++) {
      expect((await applyCampaignResult(deps, { missionId: finales[i], nonce: i + 1 })).status).toBe('applied');
    }
    expect(await state.getEitrLedgerTotal({ seasonId: TESTNET_SEASON_ID, account: 'alice', sourceType: 'campaign_finale' })).toBe(320);
    expect(state.eitrLedger.size).toBe(6);
  });

  it('rewards a new verified clear in a new season without rewriting past entries', async () => {
    const state = createStateAdapter();
    const base = createDeps(state);
    const seasonTwoRuntime = { ...TESTNET_RUNTIME, seasonStart: '2027-01-01T00:00:00Z' };
    const deps: ProtocolCoreDeps = {
      ...base,
      campaigns: { ...base.campaigns, verifyEconomicFinale: async () => true },
    };
    await applyCampaignResult(deps, { missionId: 'norse-9', nonce: 1 });
    const seasonTwoDeps: ProtocolCoreDeps = { ...deps, runtime: seasonTwoRuntime };
    await applyCampaignResult(seasonTwoDeps, { missionId: 'norse-9', nonce: 2 });
    expect(await state.getEitrLedgerTotal({ seasonId: TESTNET_SEASON_ID, account: 'alice', sourceType: 'campaign_finale' })).toBe(40);
    expect(await state.getEitrLedgerTotal({ seasonId: deriveRuneSeasonId(seasonTwoRuntime), account: 'alice', sourceType: 'campaign_finale' })).toBe(40);
  });
'''
    changed[testfile] = t[:-len(marker)] + integration_tests + marker

    edit('docs/CAMPAIGN_PROTOCOL_V1.md', [
        ('''## Rewards

''',
         '''## Rewards

**Finale Eitr v1 (proposed, fail-closed):** In addition to standard first-clear
RUNE, the six final missions have a season-scoped Eitr reward (40 each for
Norse, Greek, Egyptian and Celtic; 60 Eastern; 100 Twilight). These amounts
are defined in `shared/protocol-core/campaignFinaleEitr.ts` and may only be
credited after an **independent, deterministic victory-transcript verifier**
attests the result. Current `campaign_result` hashes are NOT sufficient; in
production the verifier hook is unimplemented and therefore issues zero Eitr.
No gameplay result directly distributes an NFT. See ADR 0014.

'''),
    ])

    # New files only; refuse to overwrite edits by others.
    for name, content in {
        'shared/protocol-core/campaignFinaleEitr.ts': NEW_POLICY,
        'shared/protocol-core/campaignFinaleEitr.test.ts': NEW_TEST,
        'docs/adr/0014-campaign-finale-eitr-v1.md': NEW_ADR,
    }.items():
        f = root / name
        if f.exists():
            raise RuntimeError(f"Refusing to overwrite existing new file: {name}")
        changed[f] = content
    return changed


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    root = Path(sys.argv[1]).expanduser().resolve()
    if not (root / '.git').exists():
        print('ERROR: supply the root of a local git checkout of Ragnarok', file=sys.stderr)
        return 2
    try:
        changed = prepare(root)
    except (OSError, RuntimeError) as e:
        print(f'Preflight failed, no files written: {e}', file=sys.stderr)
        return 1
    for p, content in changed.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(content.encode('utf-8'))
        print('Updated:', p.relative_to(root))
    print('\nReview changes with git diff, then run:')
    print('  pnpm test -- shared/protocol-core/campaignFinaleEitr.test.ts shared/protocol-core/campaignResult.test.ts')
    print('  pnpm run check')
    print('\nEconomic Eitr credit remains FAIL-CLOSED until an authoritative campaign verifier is implemented.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
