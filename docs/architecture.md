# Architecture

## Product boundaries

Sewing Studio has three layers:

1. **Shared foundations** — measurement profiles, slopers, techniques, and reusable notes.
2. **Garment projects** — independent snapshots, pattern versions, fit evidence, construction state, materials, and references.
3. **Portable ownership** — browser autosave plus canonical JSON and readable Markdown exports.

The hierarchy keeps a fitted bodice sloper authoritative while allowing a boat-neck top, dress, or future jacket to evolve without mutating that foundation.

## Runtime

Next.js supplies React application conventions and a deterministic static build. There are no server components that require a deployed runtime and no application API routes. `next build` writes the complete website to `out/`.

`SewingWorkbench` owns the workspace mutation boundary. Project forms receive narrow project-only update functions, which prevents a garment view from overwriting another project or shared foundation records. Shared studio views update profiles and slopers explicitly.

## Persistence flow

```text
user edit
  → React workspace state
  → debounced IndexedDB save
  → optional approved-folder copy

explicit backup
  → versioned JSON envelope
  → browser download or approved folder

restore
  → size and JSON parse checks
  → structural migration
  → complete validation and preview
  → explicit replacement confirmation
  → one IndexedDB write
```

No personal record is logged. Import is atomic at the application layer: a candidate is fully parsed, migrated, and validated before the live workspace is replaced.

## Pattern calculations

Measurements are stored canonically in millimetres with a remembered display unit. Pattern geometry is derived from canonical values plus project/sloper configuration. The canvas applies drafting invariants for center fold/back, bust and waist lines, dart intake and apex offsets, armhole/neck curves, seam allowance, notches, grainlines, and zipper placement.

Generated paths and rendered pixels are not backed up. Recalculation from source data prevents stale geometry from becoming a second source of truth.

## Static and container delivery

The production container has two stages:

- pinned Node/pnpm build stage installs the lockfile and creates `out/`
- unprivileged Nginx stage serves only static output on port 8080

Compose maps it consistently to loopback port 3000. The browser’s origin—not the container filesystem—owns IndexedDB.

## Offline behavior

A small service worker caches the application shell and same-origin static responses after first load. It is a convenience for interrupted connectivity, not a backup mechanism. The worker script is always revalidated so releases can update its cache manifest.
