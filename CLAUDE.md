# Git Commit Message Convention

## Format

```
<type>: <subject>

<body> (optional)
```

## Types

| Type | Meaning |
|------|---------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `style` | Formatting, missing semicolons, etc; no code change |
| `chore` | Build process, dependencies, tooling |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `revert` | Revert a previous commit |

## Rules

1. **Subject** is required, starts with lowercase after the colon
2. **No period** at the end of the subject line
3. **Imperative mood**: "add" not "added", "fix" not "fixed"
4. **Body** is optional; use it to explain *why* a change was made
5. Keep subject under 72 characters when possible

## Examples

```
feat: add todo block type to block editor

feat: implement nested note tree with drag-and-drop reordering

fix: prevent rxdb proxy errors on null folderId values

refactor: extract block focus logic into useBlockFocus composable

chore: migrate rxdb schema from v4 to v7
```
