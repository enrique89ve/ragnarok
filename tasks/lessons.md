# Lessons Learned

Patterns and rules captured from mistakes and corrections to prevent recurrence.


## Poker Combat

### Timer expiry should be conservative (fold/check, not call)
- **Pattern**: Auto-calling on timeout punishes players who step away. Bad UX.
- **Rule**: Timer expiry = auto-fold (if bet pending) or auto-check (if no bet). Never auto-call.

### RESOLUTION phase can get stuck
- **Pattern**: If `isReady` flags aren't set, `resolveCombat()` never fires and no backup timer triggers.
- **Rule**: Always have an independent escape timer for RESOLUTION phase (12s) that doesn't depend on showdown state.

