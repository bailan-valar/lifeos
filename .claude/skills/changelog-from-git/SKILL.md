---
name: changelog-from-git
description: Generate and insert changelog entries from git commit history since the last changelog update. Use when the user wants to add new changelog entries based on recent git commits, create release notes from git history, or update the product changelog database from development commits.
---

# Changelog from Git

Generate user-facing changelog entries from git commits and insert them into the database.

## Workflow

1. **Read the baseline commit**
   - Read the file `.changelog-baseline` in the project root.
   - If the file exists, its content is the starting commit hash.
   - If the file does **not** exist (first run), run:  
     `git log --all --format="%H" -- scripts/insert-changelog.ts server/api/__admin/changelog/ composables/useChangelog.ts stores/changelog.ts -1`
   - If still no result, fall back to the commit that last modified the `Changelog` model in `prisma/schema.prisma`.

2. **Collect new commits**
   - Run: `git log <baseline-commit>..HEAD --pretty=format:"%h %s" --no-merges`
   - This lists all non-merge commits since the last changelog update.

3. **Analyze commits**
   - Group commits by type:
     - `feature`: new functionality, new pages, new components
     - `fix`: bug fixes, corrections
     - `improvement`: optimizations, refactors, UI/UX enhancements
     - `breaking`: breaking changes, removed features, schema changes that affect users
   - Merge related commits into single changelog items to avoid duplication.

4. **Write user-facing descriptions**
   - Translate technical commit messages into **user-centric language**.
   - Focus on **what the user can do now** and **what value they get**.
   - Avoid internal implementation details (component names, file renames, API endpoints, database fields).
   - Keep descriptions concise (1-2 sentences per item).
   - Example transformation:
     - ❌ "Add ApiToken model with expiresAt and lastUsedAt fields"
     - ✅ "Manage API tokens in Settings to integrate with third-party tools. Up to 10 tokens with optional expiration."

5. **Confirm metadata with the user**
   - Ask for:
     - `version` (e.g., "1.2.0")
     - `releaseDate` (default today)
   - Present the generated changelog items for approval.

6. **Insert into database**
   - Create a temporary Node script using `@prisma/client` to insert records.
   - Schema reference:
     ```prisma
     model Changelog {
       id          String   @id @default(cuid())
       version     String
       type        String   // feature | fix | improvement | breaking
       title       String
       description String   @db.Text
       releaseDate DateTime
       createdAt   DateTime @default(now())
       updatedAt   DateTime @updatedAt
     }
     ```
   - Before inserting, check if the version already exists to avoid duplicates.
   - Run the script with `node <script>.cjs` (use `.cjs` because the project has `"type": "module"`).

7. **Update the baseline**
   - **Only after successful insertion**, write the current `HEAD` commit hash to `.changelog-baseline`.
   - This ensures the next run starts from this point.
   - Clean up the temporary script after execution.

## Guidelines

- Always ask the user for the version number and release date before inserting.
- Always show the generated items for approval.
- If there are no new commits since the last changelog, inform the user and stop.
- If a commit is purely internal (e.g., "fix typo in comment", "update CI config"), skip it.
- Never update `.changelog-baseline` if the database insertion fails.
