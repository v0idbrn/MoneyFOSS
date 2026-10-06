# MoneyFOSS — Agent Skills Installation Audit

**Fecha:** 2026-10-06 · **Objetivo:** toolbox auditado sin conflictos, cero cambios de producto.

## 1. Objective

Incorporar capacidades (planificación, TDD, debugging, autonomía, codebase-mapping, UI, TS, calidad, compresión) como toolbox verificado, sin clonar once repos, sin adivinar URLs, sin modificar MoneyFOSS.

## 2. Exact sources

| # | Target | Canonical source | Branch | Evidence |
|---|---|---|---|---|
| 1 | Superpowers | `https://github.com/obra/superpowers` (Jesse Vincent) | main | repo docs `docs/README.opencode.md` (plugin spec + hooks, V1/V2) |
| 2 | Ponytail | `https://github.com/DietrichGebert/ponytail` | main | AGENTS.md + API (MIT) + installed pkg |
| 3 | UI UX Pro Max | `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill` (forks confirm upstream) | main | repo README + releases (v2.15.0) + API |
| 4 | Graphify | harness-bundled skill | — | SKILL.md on disk (705 lines, verified §§1–30) |
| 5 | Caveman | `https://github.com/JuliusBrussee/caveman` | main | T-015 + API + SKILL.md on disk (90 lines) |
| 6 | Addy Osmani | `https://github.com/addyosmani/agent-skills` (pinned on author profile) | main | README (25 skills, `.opencode/`, `docs/opencode-setup.md`) + API |
| 7 | Awesome Claude Skills | UNCONFIRMED (`ComposioHQ/awesome-claude-skills` vs `travisvn/awesome-claude-skills` vs mirrors) | — | name collision, no single canonical repo |
| 8 | Understand Anything | `https://github.com/Egonex-AI/Understand-Anything` (orig. Lum1104) | main | README + install.sh (OpenCode path `$HOME/.opencode/…`) + API |
| 9 | Archify | `https://github.com/tt-a1i/archify` | main | README + `npx skills add` + stable v3.0.1 + API |
| 10 | Impeccable | `https://github.com/pbakaus/impeccable` | main | README (`npx impeccable install`, 23 commands, hooks) + API |
| 11 | Pocock | `https://github.com/mattpocock/skills` (pinned on author profile) | main | README (`npx skills@latest add`, per-skill picker) + API |

## 3. Versions/commits

Pinned versions intentionally NOT recorded for non-installed targets (nothing installed → nothing to pin; install commands in §23-equivalent of inventory doc require a tag at install time). Active skills: harness-managed (`@dietrichgebert/ponytail@latest` path observed). API `pushed_at` all within 2026-10-03…06 (active upstreams).

## 4. Licenses

| Repo | API license | Classification |
|---|---|---|
| obra/superpowers | MIT | COMPATIBLE |
| DietrichGebert/ponytail | MIT | COMPATIBLE |
| nextlevelbuilder/ui-ux-pro-max-skill | MIT | COMPATIBLE |
| addyosmani/agent-skills | MIT | COMPATIBLE |
| Egonex-AI/Understand-Anything | MIT | COMPATIBLE |
| tt-a1i/archify | MIT | COMPATIBLE |
| mattpocock/skills | MIT | COMPATIBLE |
| pbakaus/impeccable | **Apache-2.0** | COMPATIBLE WITH CONDITIONS (dev-tooling use only; cf. T-009 one-way note) |
| JuliusBrussee/caveman | **Apache-2.0 top-level**; skill MIT + proxy BSL-1.1 (T-015) | COMPATIBLE WITH CONDITIONS (skill-only; proxy INCOMPATIBLE-prohibited) |
| Awesome (unconfirmed) | per-item | UNCLEAR → not installed |
| graphify (harness-bundled) | upstream `safishamsi/graphify` confirmed via SKILL.md match + sponsor line (2026-10-06) | Apache-2.0 → COMPATIBLE |

No bundled-subcomponent audit performed (nothing installed/bundled; T-009 product-license impact: none).

## 5. Installation mechanisms (documented, NOT executed except pre-existing)

Superpowers: opencode.json `plugin` git spec + restart (Bun auto-install; bootstrap hook). UI UX Pro Max: `uipro init` / `npx skills add` / dir copy; needs Python 3. Addy: `npx skills add` (bulk or `--skill`) / marketplace. Understand: `curl|bash install.sh` (flagged pattern — manual placement recommended instead). Archify/Pocock: `npx skills add` (picker for Pocock). Impeccable: `npx impeccable install` (+ hooks + browser iteration). None executed: deliberate (see §12–16).

## 6. OpenCode compatibility

Native/opencode-documented: Superpowers (official opencode README), Addy (`.opencode/` + setup doc), Archify (topics `opencode`), Understand (OpenCode listed + `$HOME/.opencode` path), UI UX Pro Max (`.opencode` variant + OpenCode listed), Impeccable (opencode listed as provider). Claude-first: Pocock (`npx skills` file drop works anywhere). N/A: Awesome (unconfirmed).

## 7. Dependency audit

Runtime deps of the audited install paths: Bun (Superpowers auto-install), Node ≥18 (Understand viewer, Archify renderer), Python 3 (UI UX Pro Max search scripts), npm/npx CLIs (all `npx skills` paths), git (git-backed specs). No MCP servers, no external binaries, no daemons required by any target. Nothing installed → nothing added to any lockfile.

## 8. Supply-chain findings

- `curl -fsSL …/install.sh | bash` (Understand Anything): remote-code-execution pattern. Not executed. Recommendation if ever needed: read `install.sh` first, then manual placement.
- Superpowers: re-install from git on every restart + auto-update = moving supply chain. Recommendation if ever needed: pin `#vX.Y.Z`.
- `npx <pkg> install` CLIs (Impeccable, UI UX Pro Max, skills-sh): run installer code with user privileges; not executed.
- Python search scripts (UI UX Pro Max): local-only per docs; contents NOT line-audited (nothing installed, residual risk recorded, not accepted).
- Addy `hooks/` directory: presence noted, contents NOT audited (nothing installed).
- No telemetry/analytics/curl/wget/eval/binaries/credential-access found in documented install paths. No git hooks. Agent-executable commands = EXPECTED AGENT CAPABILITY, not findings.

## 9. Security findings

No blocker findings (nothing installed, nothing executes). Residuals recorded in §8. Caveman proxy (BSL-1.1) excluded before any license question arises. Product secrets: none touched; no credential access by any install path.

## 10. Capability matrix

| Capability | Superpowers | Ponytail | Graphify | Understand | Archify | Impeccable | Pocock | UI UX | Addy |
|---|---|---|---|---|---|---|---|---|---|
| workflow/TDD/debug | ● full | ○ meta | — | — | — | — | ○ | — | ● lifecycle |
| autonomy/orchestration | ○ subagents | ● lazy-build | — | ○ pipeline | — | — | — | — | — |
| codebase mapping | — | — | ● graphs | ● graphs+dash | ○ diagrams | — | ○ arch-scan | — | — |
| UI review/design | — | — | — | — | — | ● design | — | ● styles | — |
| refactor/quality | ○ review | ● review | — | — | — | ○ critique | ● discipline | — | ● review |
| TypeScript | — | — | — | — | — | — | ● skills | — | — |
| perf/a11y/security | — | — | — | — | — | ○ checks | — | ○ guides | ● skills |
| prompt compression | — | — | — | — | — | — | — | — | — (= Caveman, off-matrix, ACTIVE restricted) |

● primary · ○ partial — overlaps resolved in §11.

## 11. Overlap/conflict analysis

- Workflow: Superpowers-full vs Addy-lifecycle vs Pocock-discipline vs Ponytail-meta. Kept: Ponytail (governance-embedded, zero overhead). Rest NOT INSTALLED (would fight AGENTS.md + each other).
- Mapping: Graphify (kept, installed) vs Understand vs Archify (both NOT INSTALLED — duplicate capability + artifacts/installer cost).
- UI: UI UX Pro Max vs Impeccable-design (both NOT INSTALLED — Belladonna frozen; advisor value < surface).
- Quality: covered by tests/typecheck/review habits; nothing added.
- Compression: Caveman alone in its lane (restricted). No conflicts: nothing new installed.

## 12. Active skills

ponytail (+review/audit/debt/gain/help), caveman (+variants, skill only), graphify, investigate-first, lean-build, migration, safe-refactor, surgical-patch, verify-and-stop, cavecrew, customize-opencode. Evidence: session skill list + SKILL.md files on disk (caveman, graphify, ponytail read-verified).

## 13. Restricted skills

Caveman: skill-only, lite prose, never on invariants/security/errors/commits/figures/financial amounts (AGENTS §4). Ponytail: never on finance validation, security, trust-boundary input handling (AGENTS §3).

## 14. Disabled skills

None (nothing installed to disable).

## 15. Rejected skills

Caveman proxy (BSL-1.1): prohibited component, never imported/activated. Everything else uninstalled-but-evaluated is NOT INSTALLED (deliberate), not rejected — except Awesome (source unconfirmed).

## 16. Uninstalled skills

Superpowers, UI UX Pro Max, Addy (bulk), Understand Anything, Archify, Impeccable, Pocock, Awesome (unconfirmed). Rationales in §11 + inventory. Revisit triggers: visual codebase maps needed (Archify/Understand), UI redesign authorized (UI UX Pro Max), workflow overhaul with user approval (Superpowers pinned).

## 17. Caveman licensing treatment

Repo top-level Apache-2.0 (API); skill component MIT + proxy BSL-1.1 (T-015). Used: skill methodology only, as embedded in AGENTS.md. Proxy: excluded entirely. No BSL-1.1 artifact present in repo, harness skills, or docs.

## 18. Pocock usage policy

Not installed. Its TS discipline is already enforced by stricter means (strict + erasableSyntaxOnly + tests). If ever installed: selective skills only, no type gymnastics, runtime validation stays (policy §9 of mission = MoneyFOSS priorities order).

## 19. UI UX Pro Max usage policy

Not installed. If a UI audit is ever requested: invoke against frozen Belladonna tokens as advisor; forbid redesign, gamification, glassmorphism, crypto aesthetics (§10 of mission).

## 20. Addy Osmani usage policy

Not installed. Relevant parts on demand via reading (perf/a11y checklists translated to RN, never web-only SEO/Core-Web-Vitals). No bulk install.

## 21. Ponytail autonomy policy

Bounded per AGENTS §3 + mission §13: explicit scope, test gates, git checkpoints, no financial-semantic decisions by subagents (accounting/balance/currency/conversion/backup/encryption/security stay human/project).

## 22. Removal/recovery instructions

Nothing installed → nothing to remove. Harness skills are managed by the OpenCode installation (out of repo scope). To adopt any evaluated target later: follow its §5 mechanism with a pinned tag, then re-run §6–§9 checks before use.

## 23. Verification evidence

- Session skill list contains all §12 skills (recognition proof).
- SKILL.md files read-verified: caveman (90 lines), graphify (705 lines §§1–30), ponytail (120 lines §§1–15).
- GitHub API license/branch records, 2026-10-06, for all 9 confirmed repos (§4).
- No clones, no installs, no restart needed (nothing changed in the harness).
- Harmless material used: none required (no behavior installed to test).
- Product safety: `git status` clean except the two audit docs (see §24 gate).

## 24. Final recommendation

Operate the LONG-TERM profile: DEFAULT = ponytail-full + caveman-lite + specialist skills by trigger; ON-DEMAND = graphify, ponytail-review/audit, caveman-review, surgical-patch/safe-refactor/migration, plus documented external references; RESTRICTED = caveman/ponytail per §13; DISABLED = caveman-proxy. Install nothing until a revisit trigger fires. Operational profile details = §27 of mission, adopted as written.
