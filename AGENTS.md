# AGENTS

Short operational guide for agents working in this repository.

## Repository Map

- `src/bin.ts` — CLI shebang entry point
- `src/cli/index.ts` — Commander CLI: arg parsing, model validation, run limn
- `src/cli/settings.ts` — Settings subcommand (set/get/list/unset)
- `src/core/config.ts` — Config read/write, env var + keychain resolution
- `src/core/secretStore.ts` — keytar wrapper (macOS Keychain / libsecret)
- `src/core/openrouter.ts` — OpenRouter API client (openai SDK)
- `src/profiles/index.ts` — 8x ModelProfile definitions with full system prompts
- `src/transform/index.ts` — Build system prompt, call LLM, parse response
- `src/index.ts` — Library entry: `limn(prompt, model)` + re-exports
- `scripts/build-guide.ts` — Generates `docs/PROMPTING_GUIDE.md` from profiles
- `tests/` — Unit tests

## Backpressure (Mandatory)

Run these before handoff/PR, in order:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If profiles or prompting data changed, also run:

```bash
npm run build:guide
```

## Command Truth Source

Use `package.json` scripts as canonical. Do not invent alternate command names.

## Quality Gates

- TypeScript strict mode is enabled.
- ESLint rejects `any` and unused vars (except `_`-prefixed args).
- Unit coverage threshold: `lines >= 50`, `branches >= 40`.
- CI enforces lint → typecheck → test → build.

## Editing Rules

- Keep changes minimal and scoped.
- ESM requires `.js` extensions in relative imports (`import { x } from './config.js'`), handled by tsconfig NodeNext.
- Avoid touching unrelated files.
- Update `buildGuideMarkdown()` and re-run `npm run build:guide` when profile data changes.

## Adding a New T2I Model

1. Add a `ModelProfile` entry to `src/profiles/index.ts`
2. Add the model ID to `VALID_MODELS` in `src/types.ts`
3. Add tests in `tests/profiles.test.ts` and `tests/transform.test.ts`
4. Run `npm run build:guide` to regenerate `docs/PROMPTING_GUIDE.md`

## Testing Guidance

- `npm test` — runs jest with coverage, requires `NODE_OPTIONS=--experimental-vm-modules`
- Prefer targeted tests first, then full suite as needed.
- Use `setCallOpenRouter()` injection in `src/core/openrouter.ts` to mock the LLM call.

## Commits and Releases

Use Conventional Commits (`fix:`, `feat:`, `docs:`, etc.). This repo uses a release-please driven workflow, so commit messages directly affect changelogs and version bumps.

## Credentials

- `OPENROUTER_API_KEY` — highest precedence (env var)
- `LIMN_DISABLE_KEYTAR` — set to `true` to skip keychain

## Constraints

- Node ≥ 20.
- TypeScript strict.
- `tsc --noEmit` is the typecheck step.
- keytar is dynamically imported (`await import('keytar')`) to survive environments without it.
- No `.env` files — reads directly from `process.env`.