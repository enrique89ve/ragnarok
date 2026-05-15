# DB Adapter Boundary Prototype

Question: can Ragnarok keep a mandatory client local store while swapping the
server hot projection from JSON to Postgres/service and later IPFS checkpoints
without fragmenting authority or data shape?

Current working answer:

- The client local store remains mandatory in every runtime stage.
- JSON, Postgres, or a DB service are server hot projections behind the same
  replay/state adapter contract.
- IPFS is a checkpoint/snapshot layer, not the hot write path.
- Drift should be detected by replay-derived state hashes and fixed by rebuild,
  not by trusting the server projection.

Delete this directory after the adapter boundary decision is absorbed into an
ADR or implementation ticket.
