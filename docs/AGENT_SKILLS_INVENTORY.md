# MoneyFOSS — Agent Skills Inventory

**Fecha:** 2026-10-06 · **Regla:** las skills son herramientas, no autoridades (precedencia §4 de la misión; `AGENTS.md` > skills, siempre).

## Installed skills (by the harness, verified on disk + in-session)

| Skill | Canonical Source | Version/Commit | License | Installation | Scope | Active | Purpose | Risks |
|---|---|---|---|---|---|---|---|---|
| ponytail (+`ponytail-review/audit/debt/gain/help`) | `DietrichGebert/ponytail` (main, MIT — API 2026-10-06) | opencode pkg `@dietrichgebert/ponytail@latest` | MIT (COMPATIBLE) | global, harness-managed (`...\.cache\opencode\packages\`) | global | ACTIVE | laziest working solution, YAGNI, over-engineering review | none; bounded by AGENTS §3 (never on finance validation) |
| caveman (+7 variants) | `JuliusBrussee/caveman` (main; API top-level Apache-2.0; skill MIT + proxy BSL-1.1 prohibido, ver T-015) | harness-bundled | MIT skill / **proxy BSL-1.1 PROHIBITED** | global (`...\.agents\skills\caveman\`) | global | ACTIVE WITH RESTRICTIONS | terse prose (lite embedded in AGENTS) | proxy excluded; never on invariants/errors/commits/figures |
| graphify | harness-bundled skill (`...\.config\opencode\skills\graphify\`) | harness-bundled | NOT APPLICABLE (tool config; upstream no confirmado por separado) | global | global | ACTIVE | knowledge graphs, codebase mapping, god nodes | graphify-out/ artifacts only on demand (no repo pollution) |
| investigate-first, lean-build, migration, safe-refactor, surgical-patch, verify-and-stop, cavecrew, customize-opencode | harness-bundled (`...\.agents\skills\`) | harness-bundled | NOT APPLICABLE (harness tooling) | global | global | ACTIVE | diagnose-first, lean builds, migrations, safe refactors, verify-and-stop | none; task-scoped by trigger |

## Evaluated, deliberately NOT installed

| Skill | Canonical Source | Version | License | Decision |
|---|---|---|---|---|
| Superpowers | `obra/superpowers` (main, MIT — API 2026-10-06) | unpinned main | MIT (COMPATIBLE) | NOT INSTALLED — overlaps AGENTS/TodoWrite workflow; per-conversation bootstrap overhead; recognition unverifiable in-session |
| UI UX Pro Max | `nextlevelbuilder/ui-ux-pro-max-skill` (main, MIT) | v2.15.0 seen 2026-08 | MIT (COMPATIBLE) | NOT INSTALLED — Belladonna system frozen; needs Python 3 + CLI surface for advisor-only value |
| Addy Osmani | `addyosmani/agent-skills` (main, MIT) | 0.6.3 seen Jul 2026 | MIT (COMPATIBLE) | NOT INSTALLED — 25-skill bulk duplicates Superpowers/tests; `hooks/` dir unaudited; selective reference only |
| Awesome Claude Skills | **collision**: `ComposioHQ/awesome-claude-skills` vs `travisvn/awesome-claude-skills` vs others | — | UNCLEAR (per-item) | NOT INSTALLED — SOURCE UNCONFIRMED |
| Understand Anything | `Egonex-AI/Understand-Anything` (main, MIT) | — | MIT (COMPATIBLE) | NOT INSTALLED — duplicates graphify; `curl\|bash` installer pattern; token-heavy pipeline |
| Archify | `tt-a1i/archify` (main, MIT) | stable v3.0.1 seen | MIT (COMPATIBLE) | NOT INSTALLED — duplicates graphify; diagram artifacts risk repo pollution |
| Impeccable | `pbakaus/impeccable` (main, **Apache-2.0**) | — | COMPATIBLE WITH CONDITIONS (Apache-2.0 tooling use only; cf. T-009) | NOT INSTALLED — design-skill + browser iteration; overlaps frozen UI system |
| Pocock | `mattpocock/skills` (main, MIT) | — | MIT (COMPATIBLE) | NOT INSTALLED — strict tsc already enforced; setup flow (issue tracker) is noise here |

## Rejected components

| Component | Reason |
|---|---|
| Caveman proxy (BSL-1.1) | prohibited by AGENTS §4 / T-015; never imported, never activated |

## Installation records

- **Files/directories installed by this audit:** none (docs only: this file + `AGENT_SKILLS_AUDIT.md`).
- **Global vs local:** all active skills are global (harness-managed); zero project-local installs in `F:\Gigs\MoneyFOSS`.
- **Dependencies / external binaries / MCPs / hooks added:** none.
- **Network requirements of active skills:** none at runtime (markdown instruction files loaded by the harness).
- **Conflicts:** none (no new authority installed; overlap analysis in the audit doc).
- **Removal procedure:** nothing to remove. To later install any evaluated target, see per-target install commands in `AGENT_SKILLS_AUDIT.md` §23-equivalent + pin a tag before use.
