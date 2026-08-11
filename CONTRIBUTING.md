# Contributing

Sewing Studio welcomes focused improvements that keep the product approachable, local-first, and useful at a sewing table.

## Setup

Production-style Docker setup:

```bash
docker compose up --build
```

Native setup with pinned tools:

```bash
mise trust
mise run setup-dev
mise run dev
```

The package-manager equivalent is `corepack enable`, `pnpm install --frozen-lockfile`, then `pnpm dev --port 3000`.

## Repository map

- `app/`: views and visual components
- `lib/`: versioned domain model, calculations, persistence, and export code
- `contracts/`: portable JSON schema
- `tests/`: deterministic model and transformation checks
- `docs/`: contributor-facing architecture and privacy constraints
- `examples/`: synthetic public-safe examples

## Development gate

Run before requesting review:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify:dev
pnpm audit:prod
```

When Docker is available, also run `docker build .` and `docker compose up --build`, then verify `http://127.0.0.1:3000`.

## Changes and commits

Use concise imperative subjects such as `Validate backup parent references`. Keep commits narrow enough to review. Do not add generated attribution trailers. Explain intent and constraints in code comments; do not narrate obvious syntax.

## Privacy and fixtures

All tests, screenshots, examples, and default data must be fictional and synthetic. Never commit:

- real body measurements or fitting photographs
- downloaded workspace backups or local browser databases
- private notes, journals, employer information, tickets, or repositories
- API keys, tokens, environment contents, absolute personal paths, or logs

Review staged changes and history before publication. A deletion commit does not remove private data from history.

## Accessibility

Use semantic HTML, explicit labels, keyboard-operable controls, useful status/error text, visible focus, sufficient contrast, and reduced-motion support. Check narrow and wide layouts. New destructive actions require confirmation; offer recovery where practical.

## Schema changes

Record and backup schemas are versioned independently. A breaking change requires:

1. A schema-version increment.
2. A deterministic migration from every supported prior version.
3. Import validation before state mutation.
4. Export/import/export round-trip tests.
5. Updated contract and data-model documentation.

Never persist generated pattern geometry when it can be reproduced from canonical measurements and configuration.
