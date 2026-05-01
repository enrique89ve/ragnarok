# Ragnarok Beta Testnet

This context defines the release language for taking Ragnarok from internal development into a closed, resettable community test.

## Language

**Testnet**:
A resettable shared environment used to validate gameplay, P2P, NFT, rewards, replay, and economy flows without permanent value.
_Avoid_: Production, mainnet, permanent economy

**Closed Testnet Beta**:
The next release milestone where a limited group of testers validates the full playable flow before public access.
_Avoid_: Public beta, mainnet launch, finished testnet

**Public Testnet Beta**:
A later release milestone where the broader community can play under published limits, monitoring, and reset rules.
_Avoid_: Mainnet launch, production season

**Playable Beta Flow**:
The complete tester-facing loop of local play, P2P play, turns, combat, victory, packs, rewards, and critical bug handling.
_Avoid_: Full catalog audit, every card validated, final balance

## Relationships

- A **Closed Testnet Beta** runs inside **Testnet**.
- A **Public Testnet Beta** follows a successful **Closed Testnet Beta**.
- **Testnet** state is reset before mainnet and does not create permanent ownership or rewards.
- The **Playable Beta Flow** must be stable before **Closed Testnet Beta** opens.

## Example Dialogue

> **Dev:** "Are we trying to finish the whole testnet before inviting players?"
> **Domain expert:** "No — the immediate goal is the **Closed Testnet Beta**: full playable logic, attractive UI, core chain/reward checks, and enough observability to handle real tester bugs."

> **Dev:** "Does full logic mean validating every card in the catalog?"
> **Domain expert:** "No — it means the **Playable Beta Flow** works end-to-end. Exhaustive card validation is work for beta feedback and targeted fixes."

## Flagged Ambiguities

- "testnet" was used to mean both the resettable environment and the next release milestone. Resolved: the environment is **Testnet**; the next milestone is **Closed Testnet Beta**.
- "all logic" was used broadly. Resolved: for **Closed Testnet Beta**, it means the **Playable Beta Flow**, not exhaustive validation of every card.
