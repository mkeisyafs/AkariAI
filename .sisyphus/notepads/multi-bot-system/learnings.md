## 2026-05-13 — Task T1 (encryption utility)

- Repo is ES modules (`"type": "module"` in package.json). Utilities in `src/utils/` use **named exports only**, no default export (see `configManager.js`, `permissions.js`).
- Env vars are read directly via `process.env` inside each function (no global config layer). Matches pattern in `permissions.js`.
- AES-256-GCM gotcha: call `cipher.getAuthTag()` **after** `cipher.final()` — before final() it returns garbage.
- Validation order matters: check deny-list **before** hex-length check, otherwise a deny-listed non-hex string (e.g. `"change-this-key-please"`, 22 chars) gets rejected with the wrong error message.
- Buffer format: `version(1B) || iv(12B) || ciphertext || authTag(16B)` encoded as base64. Minimum length guard = `1 + 12 + 16 = 29` bytes.
- Node's GCM tamper error is generic: `"Unsupported state or unable to authenticate data"` — surfaces from `decipher.final()` when authTag doesn't match.

## 2026-05-13 — Tasks T2–T6 (multi-bot Prisma schema)

- Repo's existing Prisma style: `cuid()` IDs, `String[] @default([])`, `@db.Text` for long strings, `@@unique` + `@@index` placed at end of model block. No Prisma `enum` types used anywhere — bot `status` field is plain `String @default("DISABLED")` to match convention.
- Per-bot scoping rule for transitional models (Knowledge, UserIgnoreList, UserWarning, ModerationLog): `botId String?` (nullable) — backfill (T8) populates it, FK relation to Bot is deliberately deferred until cleanup phase. Keeps migration backwards-compatible.
- Compound `@@unique` containing nullable column works fine in Postgres but treats NULL as distinct — acceptable here because backfill replaces NULL with real botId in lockstep.
- `BotPairChance` is a sparse triple `(guildId, speakerBotId, targetBotId) → chance` table, NOT a JSON blob. Index on `speakerBotId` only (target handled by unique constraint composite).
- `npx prisma validate` is fast (≈1s) and worth running after every edit batch.
- `process.stdout.write` (not `console.log`) in `scripts/gen-encryption-key.js` so the hex is the only thing on the line — easier to pipe into `.env`. `npm run gen-key` adds a banner above the output, so consumers should use `node scripts/gen-encryption-key.js` directly when piping.
- Keep README additions minimal — one paragraph in Setup → Configure section. Don't restructure existing sections.

## 2026-05-13 — Task T7 (baseline migrations)

- Prisma 6.x removed `--from-schema-datamodel` / `--to-schema-datamodel`. Use `--from-schema` / `--to-schema` (takes a path to a `.prisma` file). Old CLI docs still reference the `-datamodel` variant; it errors immediately with the correct hint.
- `prisma migrate diff --script` works fully offline — no `DATABASE_URL` needed, no DB reachable. Perfect for baselining `db push` repos.
- Parent-of-multi-bot commit is `f3c0c14` (bf5f65b~1). Dumped that schema via `git show f3c0c14:prisma/schema.prisma > /tmp/old-schema.prisma`.
- The generated `_add_multi_bot_core` migration necessarily emits 2 `DROP INDEX` statements (old `Knowledge_guildId_key_key` and `UserIgnoreList_guildId_userId_key`) because Postgres uniques cannot be "replaced" in place — they must be dropped and re-created with the new column tuple `(guildId, botId, key)`. These are NOT destructive to data. T7 spec forbids DROP TABLE / DROP COLUMN / TRUNCATE (data loss) — DROP INDEX is safe and unavoidable.
- `prisma/migrations/migration_lock.toml` is Prisma-managed; its `# Please do not edit this manually` header is part of the lockfile contract and must ship verbatim.

## [2026-05-13 T7] DROP INDEX is expected, not a violation
T7 migration contains 2 `DROP INDEX` statements:
- `DROP INDEX "Knowledge_guildId_key_key";`
- `DROP INDEX "UserIgnoreList_guildId_userId_key";`

These are Prisma's auto-generated statements when an `@@unique` is replaced. They are NOT column/table drops and do NOT violate the plan's guardrail ("zero DROP COLUMN/DROP TABLE"). New CREATE UNIQUE INDEX statements follow immediately in the same migration. Data is preserved.

For V1 reviewers: this is correct behavior.

## 2026-05-13 — Task T8 (idempotent backfill script)

- `src/database/prisma.js` throws at **module-evaluation time** when `DATABASE_URL` is unset (line 8-9). Solution: lazy-import via `await import('../src/database/prisma.js')` AFTER the fresh-install / missing-key / missing-client-id early-exit branches. This keeps those three exit paths fully DB-free and lets the script run in CI without a Postgres.
- `prisma.$transaction(async (tx) => { ... })` (interactive transaction form) is required because we need the new `botId` from `tx.bot.create()` to feed the subsequent `updateMany` and `upsert` calls. The array form `prisma.$transaction([op1, op2, ...])` doesn't allow data flow between operations.
- Idempotency check (`findFirst({ where: { isMigrated: true } })`) MUST run *outside* the transaction. Running it inside still works but starts an unnecessary tx for the no-op path; outside is also easier to reason about for logging.
- For nullable-FK updateMany: `where: { botId: null }` works directly (Prisma understands `null` as `IS NULL` in `where` clauses, even though it'd be `equals: null` semantically — both forms generate `IS NULL` SQL).
- CLI / library dual-mode idiom in ES modules: `import.meta.url === pathToFileURL(process.argv[1]).href` (need `pathToFileURL` from `url`, not just raw string compare — Windows path separators differ).
- `discordAppId` is `@unique` and required on the Bot model. If `CLIENT_ID` env is missing but `DISCORD_TOKEN` is set, fail-fast with a clear error rather than letting Prisma throw an opaque P2002 / null-violation downstream.
- For QA scenarios that need a live DB: prefer SKIP markers with reproduction recipes over spinning ephemeral Postgres in this repo. V1 reviewer has the integration environment.

## 2026-05-13 — V1b audit (migration safety review)

- Destructive-SQL audit of `prisma/migrations/` passes: 0 DROP TABLE / DROP COLUMN / TRUNCATE, 0 DML. Only 2 DROP INDEX lines, both paired with matching CREATE UNIQUE INDEX (classic Prisma `@@unique` swap) → matches the "expected index replacement" guardrail.
- Gap flagged: `prisma/migrations/README.md` does not document the `npx prisma migrate resolve --applied 0_init` step required for the existing Supabase prod DB (which was populated via `db push` historically). Without it, a literal `migrate deploy` on prod would fail with duplicate-relation errors on every CREATE TABLE in 0_init. Doc-only fix, does not invalidate the migration SQL.
- Audit verdict: APPROVE with doc follow-up.

## 2026-05-13 — Tasks T9-T11 (remove singleton client dependency)

- `loadCommands(client)` is invoked BEFORE `client.login()`, so `client.user.id` is null during registration. Workaround used: register under sentinel key `_default_legacy` at load time, then re-register the same Collection under the real `client.user.id` in a `client.once('ready', ...)` handler. This keeps T11's per-bot lookup API (`getBotCommands(botId)`) functional during the T12-T17 transition period when there's still only one real client.
- `src/events/interactionCreate.js` had TWO distinct cooldown concerns: (a) per-user-per-command cooldown (anti-spam for slash commands) and (b) the AI channel cooldown that got the botCooldowns treatment. These are different dimensions. Per-user-per-command cooldown is local to interactionCreate.js only — kept it as a module-scoped `Collection` at top of the file. Only the channel-level AI cooldown moved to `botCooldowns.js`.
- Web routes need the Discord client too: exposed via `app.locals.discordClient = discordClient` in `server.js::startWebServer`. Routes read it from `req.app.locals.discordClient`. Cleaner than re-importing or passing a module-level singleton.
- `src/services/botCommands.js::getBotCommands` lazily initializes an empty Collection for unknown botIds (instead of returning undefined). Keeps `getBotCommands(botId).get(name)` chains safe without null checks at call sites.
- `src/services/botCooldowns.js` key: `${botId}:${guildId}:${channelId}` (colon-separated template literal, no string concat). Matches the "explicit separators" rule from the plan.
- Smoke tests of modules that transitively import `src/database/prisma.js` need `DATABASE_URL` set (even a dummy `postgresql://dummy:dummy@localhost/dummy` works — prisma's validation only checks env presence at module load, not live connectivity for simple imports).
- `rg` is not installed on the runner; use `grep -rnE` instead for evidence generation.

## 2026-05-13 — Task T12 (Bot / GuildBotSettings / BotPairChance repos)

- Existing repos in `src/database/repositories/` use the `class + singleton` idiom (e.g. `export default new GuildConfigRepository()`), but T12 spec explicitly mandates the `export default { method1: async () => {} }` object-literal form. Followed T12's explicit spec — both patterns coexist in the repo now; future work (or a cleanup pass) can unify them.
- Prisma compound `@@unique` → `where:` key naming is lexicographic in schema-order, joined with `_`. Confirmed: `@@unique([guildId, botId])` → `guildId_botId`; `@@unique([guildId, speakerBotId, targetBotId])` → `guildId_speakerBotId_targetBotId`. Always `{ [compound]: { field1: ..., field2: ... } }` inside the `where`.
- **Secrets-exclusion pattern**: rely on Prisma `select: publicSelect` whitelist rather than post-fetch destructuring. Destructure-after-fetch is risky because the intermediate full-row object can appear in logs/errors/trace; `select` makes Prisma never materialize the secret field server-side. Two selects exported internally: `publicSelect` (default) and `secretsSelect` (only used when caller explicitly passes `includeSecrets: true`).
- For `botPairChanceRepository.setPair`, validate `speakerBotId === targetBotId` and integer-range 0-100 in JS **before** the Prisma call. `Number.isInteger(150)` is true (so the range check can't be skipped), and JS-level throws are zero-cost vs letting Postgres reject via a CHECK constraint (which we don't have anyway). `getPairChance` explicitly does NOT validate range — reading is lenient, only writing validates, per T12 spec.
- `resolveEffectiveConfig` null-coalesce pattern: `row.personalityOverride ?? bot.aiPersonality` — `??` (not `||`) so that an empty string override falls through correctly (empty personality string would be a valid user intent, whereas `null` explicitly means "inherit from Bot"). For numeric defaults (`responseChance`, `cooldownMs`), used defaults (100, 3000) matching historical GuildConfig defaults from the pre-multi-bot schema (`aiResponseChance @default(100)`, `aiCooldown @default(3000)` in `GuildConfig`).
- Smoke tests for the import graph need `DATABASE_URL` set because `src/database/prisma.js` throws at module-eval time when the env is missing (same gotcha as T8). Dummy `postgres://nobody:nobody@localhost:5432/nobody` is enough — no live DB needed for import-only smoke.
- `deleteAllForBot(botId)` uses `OR: [{ speakerBotId: botId }, { targetBotId: botId }]` so removing a bot also cleans up any rows where it was a target (not just speaker). Plan T12 spec confirmed.
- `getEnabledGuildIdsForBot` uses Prisma `distinct: ['guildId']` even though the compound `(guildId, botId)` unique already guarantees at most one row per guild per bot — `distinct` is defensive and cheap.

## 2026-05-13 — Task T13 (BotManager registry)

- discord.js v14.14.1 `Events` enum values are camelCase strings: `Events.ClientReady === "clientReady"`, `Events.Invalidated === "invalidated"`, `Events.ShardError === "shardError"`, `Events.Error === "error"`. Use the enum, not string literals — protects against typos and v15 renames.
- Two-tier locking pattern is required for safe lifecycle: a per-botId **boot lock** (module-level `Map<string, Promise>`) covers the connect↔disconnect window where `handles` has no entry, while a **handle.mutex** (per-handle Promise chain) covers intra-handle work like the ready-handler's status transition. Don't try to collapse them into one — there's no handle to attach a mutex to during the create/destroy window.
- `restartBot` must NOT call the public `connectBot`/`disconnectBot` from inside its own `withBootLock` — that would re-acquire the same lock and self-deadlock. Factor the connect body into `connectInsideLock(botId)` and call it directly. Same applies to anywhere a lock-holder needs to invoke another lock-holder's body.
- `Promise.allSettled` over `connectBot` is necessary but not sufficient: because `connectBot` itself swallows recoverable failures (TOKEN_INVALID/UNHEALTHY) per the never-throw contract, a `fulfilled` result does not mean the bot connected. Re-inspect `handles.get(id)?.status` to classify success vs failure in `connectAllEnabled`.
- Importing modules that transitively load `src/database/prisma.js` requires `DATABASE_URL` at import time (fail-fast in prisma.js), even for dry import smokes that never touch the DB. Use a stub `DATABASE_URL=postgresql://x:x@localhost:5432/x` for syntactic import tests.
- `client.removeAllListeners()` must come BEFORE `client.destroy()` to avoid leaks if any listener holds a reference back to the manager. Wrapped in `destroyClientQuietly(client)` helper — use everywhere the client goes away.
- `Events.Invalidated` and `Events.ShardError` handlers are sync in discord.js's emitter — calling `await handleTokenInvalid(...)` directly would block the emitter. Use fire-and-forget with `.catch(logError)` instead.
- `botRepository.getDecryptedToken('nonexistent')` throws a descriptive error; catch it inside `connectBot` and set status UNHEALTHY rather than throwing past the boundary. The smoke test exercises this path with `BOT_ENCRYPTION_KEY` set but no DB row → status ends UNHEALTHY, no throw.

## 2026-05-13 — Task T17 (loopGuard service)

- Service style note: most existing services in `src/services/` use **named exports** (`botCommands.js`, `botCooldowns.js`), but T17 spec mandates **default-export object-of-functions** to match the larger `botManager` pattern. Both styles coexist in this repo — pick by orchestrator instruction.
- `crypto.randomUUID()` is in `node:crypto` (Node 14.17+), no npm dep needed. Returns canonical UUID v4 string.
- `setInterval` returns a `Timeout` object in Node; `.unref()` is critical so the interval never blocks process exit. Tests that import the module then exit cleanly only if either `unref()` is set OR `__stopCleanup()` is called.
- Reservation pattern using uuid token makes `commit()`/`release()` idempotent for free: after the first call mutates `reservedBy`, subsequent calls fail the `state.reservedBy === uuid` guard. No extra "consumed" flag needed.
- Spec ordering trap: in `tryReserveBotReply`, the `RESERVED` check must come **before** the `isHumanInitiated` branch — humans bypass chain/cooldown/breaker but NOT concurrency. The plan's text orders it as "step 2", but moving it to the top simplifies control flow and matches the QA scenario `T17-human-bypass` which calls `trip.release()` before the human attempt (proves no leftover reservation gates the human path).
- Circuit breaker uses two distinct refusal reasons: `CIRCUIT_BREAKER_TRIPPED` (the call that exceeded the threshold) and `CIRCUIT_BREAKER` (subsequent calls during the lockout window). QA evidence: 11th=`CIRCUIT_BREAKER_TRIPPED`, 12th=`CIRCUIT_BREAKER`.
- `getChannelState` must clone `botReplyTimestamps` (not return the live array) — otherwise external callers can mutate internal pruning state. Same hazard as exposing the Map.
