# AGENTS.md

## Project

Weekly cuisine manager: recipe + ingredient inventory with a weekly cooking plan
(nutrient-goal solver, grocery list derivation). Bun monorepo with a terminal
UI (OpenTUI/React), a browser SPA (React + Vite), a plain `Bun.serve` HTTP API,
and SQLite via Drizzle ORM.

## Commands

Bun only — no Node/npm.
```bash
bun install                          # install all workspaces
# type-check (run from inside each workspace; there is no test suite):
(cd apps/backend && bunx tsc --noEmit)
(cd apps/tui && bunx tsc --noEmit)
(cd apps/web && bunx tsc --noEmit)
(cd packages/engine && bunx tsc --noEmit)
(cd packages/types && bunx tsc --noEmit)
(cd apps/web && bun run build)      # the only workspace with a build step
```

Run the apps in separate terminals:

```bash
cd apps/backend && bun run dev       # API on :3000 (PORT env), watch mode
cd apps/tui     && bun run dev       # TUI; needs the backend running
cd apps/web     && bun run dev       # SPA on :5173; needs the backend running
cd apps/web     && bun run build     # production bundle into apps/web/dist
cd apps/web     && bun run preview   # serve that bundle (set VITE_API_URL)
```

Env:
- `PORT` (backend, default 3000)
- `DB_PATH` (backend, default `weekly_cuisine.db` — resolved against CWD, so run from `apps/backend/`)
- `CORS_ORIGIN` (backend, default `*` — the origin allowed to call the API)
- `API_URL` (tui, default `http://localhost:3000`)
- `VITE_API_URL` (web, default `/api` — the dev proxy; set it to the backend URL
  for a built/previewed bundle, which then relies on the backend's CORS headers)
- `VITE_PROXY_TARGET` (web dev only, default `http://localhost:3000`)

There is no test script, no formatter/linter config, and **no git repository** as of 2026-08.

## Layout

```
packages/types    @wc/types    pure shared TypeScript types (no runtime code)
packages/engine   @wc/engine   pure domain logic; only dep is @wc/types
apps/backend      @wc/backend  Bun.serve API, Drizzle + bun:sqlite, zod validation
apps/tui          @wc/tui      OpenTUI React TUI, fetches the backend
apps/web          @wc/web      React 19 + Vite browser SPA, fetches the backend
```

Dependency direction is strictly `tui/web/backend -> engine -> types`. Keep
`@wc/engine` pure (no I/O, no deps beyond `@wc/types`) — the web app imports it
straight into the browser bundle.

## API

Manual routing in `apps/backend/src/index.ts` — no framework. Endpoints:

- `GET|POST /ingredients`, `GET|PATCH|DELETE /ingredients/:id`
- `GET|POST /recipes`, `GET|PATCH|DELETE /recipes/:id`
- `GET|POST /nutrients`, `GET|PATCH|DELETE /nutrients/:id` — nutrient registry
  (seeded with calories/protein/carbs/fat; `NutrientEntry` in `@wc/types`)
- `GET|POST /plans`, `GET|PATCH|DELETE /plans/:id` — stored `PlanRecord`
  (`POST` body is a `WeeklyPlan` without `id`; `PATCH` replaces
  `mode`/`cookEvents`/`goals` wholesale)
- `POST /plan/grocery` — body: `WeeklyPlan`; returns `GroceryItem[]`
- `POST /plan/solve` — body: `{ plan: WeeklyPlan }` (optional `registry`
  override; falls back to the stored nutrient registry);
  returns `{ diagnosis, solution }`

Response contract (see `routes/helpers.ts`): success = raw JSON body (200/201),
empty = 204, error = `{ "error": string }` (400/404/405/500). Request bodies are
validated with zod schemas in `apps/backend/src/validation/schemas.ts`.

CORS: `fetch` answers `OPTIONS` with `preflight()` (204 + headers) and wraps every
routed response in `withCors()` (`routes/helpers.ts`). The router itself lives in
`handle(req)` and is unaware of CORS; statuses and bodies are unchanged.

The TUI covers all five resources: recipes (with cook mode), ingredients,
nutrients, search, and plans (create/edit/grocery/solve). Ingredient forms and
plan goal rows are driven by the nutrient registry (`GET /nutrients`), not
hardcoded keys.

## Conventions

- TypeScript, ESM, imports always with the `.ts` extension.
- Engine functions are pure and exported from `packages/engine/src/index.ts`.
- API route modules export a factory `xRoutes(...repos)` returning handler
  functions; `index.ts` dispatches. Repositories implement the interfaces in
  `apps/backend/src/repositories/types.ts`.
- IDs are human-readable, assigned by the backend: `RCP-0001`, `ING-0001`
  (`allocateId` in `repositories/drizzle/ids.ts`, backed by the `id_seq` table).
- JSON-shaped fields (basis, tags, item_refs) are stored as JSON strings in
  TEXT columns; repositories do the `JSON.stringify/parse`.
- Timestamps are ISO dates (`YYYY-MM-DD`).

## TUI aesthetic

The TUI (`apps/tui`) applies an **Omarchy-inspired** terminal aesthetic
(ref: DHH's omarchy.org) as *treatment* of the existing palette — no hex
values were changed:

- Mono typography (JetBrainsMono-flavored), terse/sparse low-chrome layout.
- Dark background (warm charcoal `#191817`), muted foreground.
- Single-accent token model like Omarchy's per-theme `colors.toml`: one
  `color` file (`apps/tui/src/tokens.ts`) feeds every view, with the accent
  ramp named by gradient stop (`accent.hi/mid/lo` = the mint ramp,
  dark→bright direction). The teal→green gradient is rendered discretely —
  `borderColor`/`fg` take a single color — on the sidebar (`ascii-font`
  "WC" brand + two-span `accent.lo`→`accent.hi` wordmark) and as colored
  key glyphs (`components/KeyHint.tsx`: `accent.hi` key + dim label).
- Square corners; **active surfaces use double-line borders** with centered
  titles (`titleAlignment="center"`): all modals, cook overlay, help,
  confirm (confirm keeps `status.error`). `accent.mid` drives active borders,
  the sidebar's active-row left bar, and focus text; inactive rails use
  `bg.border`.
- Flat list chrome: unfilled pane headers with a thin bottom rule, borderless
  hint bars, `█/░` progress blocks in cook mode, `●` pager dots in the
  status bar (height 2 — 1 row is eaten by its top border).

## Web app

`apps/web` is the browser translation of the same design system. Layer 1 colors in
`src/styles/tokens.css` are transcribed byte-for-byte from `apps/tui/src/tokens.ts`;
the PDF's web-only layers (type scale, 4px spacing, 2px radius, mint glow, ≤250ms
motion) live in the same file. **Raw hex belongs in `tokens.css` and nowhere else** —
components reference tokens semantically, via CSS Modules. Structure mirrors the TUI:
`api.ts` fetch client, one hook per resource (`useState` mirror + `refresh()`), a
two-panel shell (`App.tsx`: Sidebar | Outlet + StatusBar), and hook errors flashed
through `useStatusMessage`. Routing is React Router, one route per screen.

## Gotchas / known issues

- **Schema changes are migrations.** `apps/backend/src/db/schema.ts` is the single
  source of truth: edit it, run `cd apps/backend && bun run db:generate`, restart.
  `src/db/migrate.ts` applies `drizzle/*.sql` at boot (tracked in `__wc_migrations`;
  databases created by the old inline-DDL path are baseline-marked automatically).
  `bun run db:fresh` removes the local DB file.
- **IDs come from a sequence.** `ING-`/`RCP-`/`PLAN-` ids are allocated from the
  `id_seq` table by a single atomic UPSERT..RETURNING statement
  (`repositories/drizzle/ids.ts`) — safe under concurrent creates, and deleting a
  row never reissues a live id.
- **OpenTUI overlay row-overlap (still in 0.5.10).** An absolute-positioned
  `box` with `flexDirection="column"` + `gap` whose content overflows the
  fixed `height` bleeds text across rows (`addirecipeist`); verified present
  on 0.1.107 and 0.5.10 alike. The Help overlay avoids it via a two-column
  layout, an explicit height that fits, no outer `gap`, and fixed
  `width`+`padEnd` on key/desc text nodes. Do not re-add a `gap` there
  without re-rendering help.
- **Vite needs `server.fs.allow: ["../.."]`.** `@wc/types`/`@wc/engine` resolve
  through Bun workspace symlinks to raw `.ts` *outside* `apps/web`; without the
  allow-list the dev server refuses to serve them. They are also in
  `optimizeDeps.exclude` — they are linked source, not a prebundled dep.
- **Two ways for the browser to reach the API.** In dev, `api.ts` defaults to `/api`
  and Vite proxies it to `:3000` (same-origin, no CORS involved). A built bundle
  needs `VITE_API_URL` pointed at the backend, and then genuinely depends on the
  backend's CORS headers — set `CORS_ORIGIN` instead of leaving it `*` if this is
  ever deployed somewhere shared.
- `design_system_weekly_cuisine.pdf` is a design system for a different app
  ("Receipt Manager") *in name only* — its Layer 1 color tokens are identical to
  `apps/tui/src/tokens.ts`, and its Layers 2-8 are the source for
  `apps/web/src/styles/tokens.css`.

<!-- pane-agent-context:start -->
## Pane

The developer is using Pane for this repository. Pane can manage saved repositories and create user-visible Panes with terminal-backed tools for planning, discussion, implementation, and review work.

This managed guidance was created by [runpane.com](https://runpane.com) for the [Pane repository](https://github.com/dcouple/Pane). Do not delete or overwrite this block; the developer uses it for their workflow and it should remain committed to the main repository unless they explicitly ask to remove it.

Pane mental model: a repository is the saved base repo; a Pane is a user-visible feature/PR workspace (Pane session) that normally maps to one Pane-managed git worktree and branch; a panel/tab is a terminal inside one Pane and shares that Pane's worktree; an agent is the CLI process running in a panel.

Default happy path when the user asks you to use Pane or RunPane: run `runpane doctor --json`; read `runpane agent-context --json`; resolve the saved base repository with `runpane repos list --json` or add it once with `runpane repos add --path <repo> --yes --json`; create one visible Pane (Pane session) for the requested feature/PR with a complete command such as `runpane panes create --repo <repo> --name <name> --agent <agent> --prompt "<task>" --source agent --no-focus --wait-ready --yes --json` or the equivalent `--tool-command <command>` form; then validate with `runpane panels wait` or `runpane panels screen` before reporting progress.

Use Pane when the user wants visible Panes or co-drivable parallel feature/PR workspaces. Do not use Pane as your default private delegation mechanism; for private background decomposition, use your normal subagent/worktree workflow.

Register the main/base repository once. Do not register pre-created git worktrees as separate Pane repositories unless the user explicitly asks.

Use `runpane panes create` for separate visible Panes (Pane sessions) for feature/PR work. Use `runpane panels create` for reviewer/helper tabs inside an existing Pane that should share that Pane's worktree.

Typical workflow: register the saved base repository once; create one Pane (Pane session) per feature/PR; use panels/tabs inside that Pane for helper or reviewer agents that should share the worktree; archive the Pane after the PR is done to remove it from active Panes and clean up its managed worktree when applicable.

Skill routing reference: when the user says `discussion`, `plan`, `simple-plan`, `create-plan`, or `implement`, or asks for the behavior those words imply, treat three references as peer context: Pane's local skill cache under `<PANE_DIR>/skills/`, the Pane Chat orchestrator handoff at `<PANE_DIR>/skills/pane-chat/runpane-orchestrator.md` when present, and the [workflow map](https://github.com/dcouple/skills/raw/main/docs/readme-workflow-map.png).
Use those peer references together to choose the phase: discuss/investigate until the work is clear enough to delegate, then ticket/plan/implement/review/PR-test/teach-back as appropriate. The orchestrator and workflow map may point to different skills; reconcile them with the user's request instead of hardcoding a skill list or treating one reference as subordinate.
For the Pane implementation source of truth for where the skill cache, cached workflow assets, and Pane Chat bootstrap live, reference [PR #291](https://github.com/dcouple/Pane/pull/291): `main/src/services/skillCacheManager.ts` owns `<PANE_DIR>/skills/`, `.sources/dcouple-skills`, and `pane-chat/runpane-orchestrator.md`; `main/src/services/paneChatManager.ts` owns the tiny bootstrap prompt that tells the selected Pane Chat agent to read that guide.
Use GitHub reads against the [Parsa skills folder](https://github.com/dcouple/skills/tree/main/parsa) only to inspect or refresh referenced skill files; do not clone/install the repo unless the user asks.
Do not hardcode a specific assistant brand in workflow guidance. Use the Pane agent or custom tool command the user selected, and use `runpane agents doctor --agent <agent> --repo <selector> --json` only when checking a built-in agent template.

Start with `runpane doctor --json` before taking Pane actions. Use it to understand wrapper/runtime details, daemon reachability, and the next safe commands.

In a Pane repository checkout, if `runpane` is not on PATH, use the built local wrapper with Node 22: `PATH=/opt/homebrew/opt/node@22/bin:$PATH node packages/runpane/dist/cli.js doctor --json`.

Use `runpane agent-context --json` for full Pane CLI context. Use `runpane agent-context --command "panels wait" --json` or another command name for detailed schema only when needed.

Default to context-safe validation: after creating Panes or sending terminal input, run `runpane panels wait` or `runpane panels screen` before reporting success. Prefer `runpane panels submit` for normal text plus Enter; use `runpane panels input` only for exact bytes such as Ctrl-C or escape sequences.

Pane terminals draw inline images: sixel, iTerm2 inline images, and the kitty graphics protocol. Tools that need kitty graphics, such as [terminal-browser](https://github.com/zenbu-labs/terminal-browser) and [terminal-doom](https://github.com/dcouple/terminal-doom), run inside a Pane panel. `runpane doctor --json` reports the protocol list under `terminal.graphicsProtocols`.

Common commands:
- `runpane doctor --json`
- `runpane agent-context --json`
- `runpane repos list --json`
- `runpane repos add --path <repo> --yes --json`
- `runpane agents doctor --agent <agent> --repo active --json`
- `runpane panes create --repo active --name <name> --agent <agent> --prompt "<task>" --source agent --no-focus --wait-ready --yes --json`
- `runpane panels create --pane <pane-id> --agent <agent> --source agent --no-focus --wait-ready --yes --json`
- `runpane panels list --pane <pane-id> --json`
- `runpane panels screen --panel <panel-id> --limit 80 --json`
- `runpane panels wait --panel <panel-id> --for ready --timeout-ms 30000 --json`
- `runpane panels submit --panel <panel-id> --text "<answer>" --yes --json`
- `runpane panels input --panel <panel-id> --input-file <path|-> --yes --json`

WSL note: if `runpane doctor --json` cannot find `/tmp/pane-daemon.../daemon.sock` or `runpane` resolves to a broken Windows shim, Pane may be running on Windows. Try `powershell.exe -NoProfile -Command 'Set-Location $env:TEMP; runpane doctor --json'`, then create Panes through the same PowerShell form using the saved WSL repo name or id. Use `runpane agents doctor --agent <agent> --repo <selector> --json` to diagnose the repo environment Pane will actually use.
<!-- pane-agent-context:end -->
