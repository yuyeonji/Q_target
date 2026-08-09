# Stateful Demo Gap Closure Implementation Plan

**Goal:** Turn audited visual-only controls into stateful browser-memory demo interactions.

1. Add failing source assertions for compact display, attachment list, saved priority,
   selected target, and chart-derived content; run the test red.
2. Extend Home state and component props for dashboard metrics, target context, plan
   notes, and compact display; implement the minimal state propagation; run green.
3. Give master tabs distinct rows, append demo attachments, and bind new-case priority.
4. Verify all flows in browser, run build/tests, commit, deploy privately, and update GitHub.
