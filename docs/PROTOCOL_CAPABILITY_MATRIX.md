# Protocol capability matrix

Reference for `PROTOCOL_PHASE_POLICIES` and `checkProtocolCapability` in
[`shared/protocolPhase.ts`](../shared/protocolPhase.ts).

Runtime mapping is `local`, `qa-season-0`, `alfa-testnet` and
`generic-testnet` → F1; `closed-beta` → F2; `mainnet` → F3. The guard returns
`{status:'rejected', code:'capability_disabled', capability, phaseId}`.

Enforcement is layered: UI routes render disabled surfaces, HiveSync blocks
before username/Keychain, protocol-core blocks operation application, and
server mutation middleware rejects with `capability_disabled`. Reading starter
or QA state remains allowed. A local marketplace mutation is therefore a
deterministic rejection, not a hidden network attempt.

| Capability | F1 `local-gameplay-v1` | F2 `hive-testnet-v1` | F3 `mainnet-v1` |
|---|---:|---:|---:|
| `localSettlement` | yes | no | no |
| `hiveBroadcast` | no | yes | yes |
| `walletLogin` | yes | yes | yes |
| `walletInvocation` | no | yes | yes |
| `marketplace` | no | no | yes |
| `packs` | no | no | yes |
| `nftLoxWrites` | no | no | yes |
| `campaignPublish` | no | yes | yes |
| `dailyQuestClaim` | yes | yes | yes |
| `p2pProgression` | yes | yes | yes |
| `officialRanking` | no | no | yes |

## Capability definitions

- `localSettlement`: permits the local IndexedDB/replay settlement authority.
- `hiveBroadcast`: permits external Hive transaction/custom-json broadcast.
- `walletLogin`: permits identity/login discovery without signing or invocation.
- `walletInvocation`: permits an explicit Keychain/wallet operation.
- `marketplace`: permits marketplace mutation handlers and UI actions.
- `packs`: permits pack purchase/open mutation handlers and UI actions.
- `nftLoxWrites`: permits NFTLox ownership or protocol writes.
- `campaignPublish`: permits publishing campaign results to external authority.
- `dailyQuestClaim`: permits the phase's daily-claim path (local ledger in F1).
- `p2pProgression`: permits progression settlement for P2P matches in the phase.
- `officialRanking`: permits official/canonical ranking updates and reads.

## Enforcement layers

| Layer | Real seam | F1 behavior | Example |
|---|---|---|---|
| UI | `client/src/game/runtime/phaseCapabilityGate.ts`, `client/src/App.tsx` | Routes render disabled surfaces without mounting mutation pages | `/marketplace` is labeled for its actual enabled profile |
| HiveSync | `client/src/data/HiveSync.ts` | Checks `hiveBroadcast` before username/Keychain and then concrete capability | `{success:false,error:'capability_disabled: ...'}` |
| protocol-core | `shared/protocol-core/phaseGate.ts`, `apply.ts` | Finality is checked first, then concrete capability before a handler | local market/pack apply is rejected deterministically |
| server | `server/middleware/protocolCapabilityGate.ts`, `server/routes.ts` | Mutation middleware rejects before state reads | HTTP `409` JSON `{code:'capability_disabled',capability:'marketplace',phaseId:'local-gameplay-v1'}` |

Starter/QA reads remain available; a read path is not evidence that its
mutation capability is enabled. The UI copy is currently generic where a
profile-specific label is not available; dynamic copy validation/correction is
an explicit Period 6 task.

| Profile | Settlement | Economy | Wallet |
|---|---|---|---|
| F1 | `local-replay` | `local-simulation` | `login-only` |
| F2 | `hive-replay` | `hive-testnet` | `explicit-only` |
| F3 | `hive-canonical` | `canonical` | `explicit-only` |

F1 `walletLogin=true` and `walletInvocation=false` is intentional: identity
may be established, but gameplay, claims, P2P queue join and
`session_authorize` do not open Keychain. Starter claim and shared-network
queue bodies are unsigned in F1 and Hive-signed in F2/F3. See the
[phase explanation](./TESTNET_PHASES.md) and [migration runbook](./PHASE_MIGRATION_RUNBOOK.md).
