# Prisma Migrations

This project historically used `prisma db push` (no migration history). Before landing the multi-bot refactor, we baselined the schema:

- `0_init/` — captures the pre-multi-bot schema (state at commit `f3c0c14`).
- `20260513124900_add_multi_bot_core/` — delta that introduces `Bot`, `GuildBotSettings`, `BotPairChance`, adds nullable `botId` columns to `Knowledge`/`UserIgnoreList`/`UserWarning`/`ModerationLog`, and swaps the per-guild unique constraints on `Knowledge` and `UserIgnoreList` to per-(guild,bot) scope.

Both files were generated via `prisma migrate diff --script` against the pre- and post-refactor schemas. No data migration SQL lives here — backfill is performed by a Node script in Task T8.

Apply with `npx prisma migrate deploy` on environments that track migrations.
