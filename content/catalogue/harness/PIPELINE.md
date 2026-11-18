# Batch pipeline (who does what, and on which model)

| Stage | Done by | Model |
|---|---|---|
| 1 Intake: pick next 10–20 WW ids, classify family, dedup register | `intake.py` script | none |
| 2 New engine variant needed? design + Java | main session (me) | current |
| 3 Spec + content for the batch | `ww-content-author` | Sonnet |
| 4 Validate JSON | `validate_games.py` | none |
| 5 Build + voice + install (TV idle check, data kept) | Mac runner `queue/*.sh` | none |
| 6 Screenshot tour (waits until TV idle; aborts if app loses focus) | Mac runner | none |
| 7 Review ×3 lenses | `ww-reviewer` ×3 (Opus only for a brand-new variant's first review) | Sonnet |
| 8 Fix decided items | `ww-fixer` (content) / me (engine) | Sonnet / current |
| 9 Re-review until all ≥ 9 | `ww-reviewer` | Sonnet |
| 10 Status → status.json, project doc | `status.py` | none |

Lookups (counts, find records) → `ww-lookup` (Haiku). Never paste whole catalogue into a prompt — point agents at file paths.

## Mac runner rule (learned 17 Nov)
The runner runs one job at a time, so a job must never wait for the TV. Jobs run `tools/build-only.sh`, then
`nohup tools/install-when-ready.sh [tour.sh] &` (it waits in the background up to 6 h, installs with data kept, then tours).
