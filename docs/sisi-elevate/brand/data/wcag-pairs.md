### Site pairs (tokens from src/styles/global.css :root, values composited over the stated background)

| pair | fg | bg | ratio | AA 4.5 | 3:1 | used for |
|---|---|---|---|---|---|---|
| --text cream on --bg | `#eddbc2` | `#27060f` | 13.86 | pass | pass | body text (global.css:29,52) |
| --text on --panel | `#eddbc2` | `#34101a` | 12.56 | pass | pass | cards |
| --text-dim (.82) on --bg | `#c9b5a2` | `#27060f` | 9.47 | pass | pass | descriptors, .page-subtitle, .menu-item-desc 13px |
| --text-dim on --panel | `#ccb6a4` | `#34101a` | 8.76 | pass | pass |  |
| --text-faint (.70) on --bg | `#b29b8c` | `#27060f` | 7.11 | pass | pass | hero-scroll 11px, form hints 12px, .opt 11px |
| --text-faint on --panel | `#b59e90` | `#34101a` | 6.70 | pass | pass |  |
| --text-mute (.62) on --bg | `#a28a7e` | `#27060f` | 5.78 | pass | pass | footer-bottom 12px, event date 14px, menu vol 11px, pcol 11px |
| --text-mute on --panel | `#a78e82` | `#34101a` | 5.52 | pass | pass |  |
| --text-mute on --panel-2 | `#aa8f84` | `#3d1320` | 5.32 | pass | pass |  |
| --line (.24) on --bg (non-text) | `#57393a` | `#27060f` | 1.83 | FAIL | FAIL | dividers, borders (needs 3:1 only if they carry meaning) |
| btn-cta: #1a120b on --cream | `#1a120b` | `#eddbc2` | 13.66 | pass | pass | primary button 12px/700 uppercase |
| btn-cta hover: #1a120b on --cream-press | `#1a120b` | `#d6bf9b` | 10.38 | pass | pass |  |
| btn-outline: --text-dim on rgba(39,7,15,.55) over --bg | `#c9b5a2` | `#27060f` | 9.47 | pass | pass | ghost button 12px/700 |
| --gold #fbd295 on --bg | `#fbd295` | `#27060f` | 13.18 | pass | pass | menu labels, stat values, icons, link hover |
| --gold on --panel | `#fbd295` | `#34101a` | 11.95 | pass | pass |  |
| form error #e7889b on --bg | `#e7889b` | `#27060f` | 7.50 | pass | pass | .private-field-error 12px |
| form error border #c25c74 on --bg (non-text) | `#c25c74` | `#27060f` | 4.54 | pass | pass | invalid input border |
| form error #a8475f on --bg (non-text) | `#a8475f` | `#27060f` | 3.33 | FAIL | pass | status-error border |
| cream on #2a0a12 select | `#eddbc2` | `#2a0a12` | 13.48 | pass | pass | dropdown panels |
| meta theme-color: #27060f vs #000 (browser chrome) | `#27060f` | `#000000` | 1.12 | FAIL | FAIL | context only |

### Candidate pairs

| pair | fg | bg | ratio | AA 4.5 | 3:1 | |
|---|---|---|---|---|---|---|
| brass sample #d69f3b on --bg | `#d69f3b` | `#27060f` | 7.94 | pass | pass |  |
| brass sample #a78c59 (video cluster) on --bg | `#a78c59` | `#27060f` | 5.84 | pass | pass |  |
| LED red #e03a03 on --bg | `#e03a03` | `#27060f` | 4.27 | FAIL | pass |  |
| stage red #b51b01 on --bg | `#b51b01` | `#27060f` | 2.79 | FAIL | FAIL |  |
| stage red #b51b01 on cream | `#b51b01` | `#eddbc2` | 4.97 | pass | pass |  |
| cream on stage red #b51b01 | `#eddbc2` | `#b51b01` | 4.97 | pass | pass |  |
| cream on LED red #e03a03 | `#eddbc2` | `#e03a03` | 3.25 | FAIL | pass |  |
| white on LED red #e03a03 | `#ffffff` | `#e03a03` | 4.40 | FAIL | pass |  |
| --bg #27060f on --gold | `#27060f` | `#fbd295` | 13.18 | pass | pass |  |
| --bg on --cream | `#27060f` | `#eddbc2` | 13.86 | pass | pass |  |
| near-black #0b090b (photo shadow) with cream | `#eddbc2` | `#0b090b` | 14.66 | pass | pass |  |
| cream on aubergine-black #14050e (video shadow) | `#eddbc2` | `#14050e` | 14.66 | pass | pass |  |
| cream on hero fallback shadow #100303 | `#eddbc2` | `#100303` | 14.97 | pass | pass |  |
| rose #c25c74 on --bg (proposed accent text?) | `#c25c74` | `#27060f` | 4.54 | pass | pass |  |
| rose #e7889b on --bg | `#e7889b` | `#27060f` | 7.50 | pass | pass |  |
| cream at .50 on --bg | `#8a7068` | `#27060f` | 4.13 | FAIL | pass |  |
| cream at .55 on --bg | `#947b71` | `#27060f` | 4.77 | pass | pass |  |
| gold at .70 on --bg | `#bb956d` | `#27060f` | 6.82 | pass | pass |  |
| cream on #34101a panel | `#eddbc2` | `#34101a` | 12.56 | pass | pass |  |
| #1a120b on brass #d69f3b | `#1a120b` | `#d69f3b` | 7.82 | pass | pass |  |
| cream on brass #a78c59 | `#eddbc2` | `#a78c59` | 2.37 | FAIL | FAIL |  |
