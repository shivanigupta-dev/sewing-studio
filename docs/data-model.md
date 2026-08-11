# Versioned data model

## Canonical workspace

`WorkspaceState` is schema version 3. It contains the unit preference, active project ID, sample marker, shared resources, and project collection. Every meaningful child record uses a stable ID plus `{ schemaVersion, createdAt, updatedAt }` metadata.

| Entity | Parent/owner | Purpose | Validation highlights |
|---|---|---|---|
| `measurementProfile` | workspace | reusable body measurements | unique ID, normalized units, valid timestamps |
| `sloper` | workspace/profile | reusable pattern foundation | known profile, explicit kind and lifecycle |
| `technique` | workspace | reusable sewing knowledge | stable ID and written guidance |
| `sharedNote` | workspace | cross-project note | stable ID and body |
| `sewingProject` | workspace | one garment | known profile/sloper IDs, status and type |
| `patternVersion` | project/sloper | named paper-pattern state | project parent, version status, source date |
| `muslinIteration` | project | toile evidence | project parent, status, observations and changes |
| `fitSession` | project/version | dated fit evidence | project parent and optional known version |
| `constructionStep` | project or sloper | actionable progress | explicit parent type/ID and valid dependencies |
| `fabric` / `notion` | project | material inventory | project parent and descriptive fields |
| `patternNote` | project/version | durable pattern decision | project parent and optional known version |
| `attachmentReference` | project | external reference metadata | HTTP(S) URL is checked before linking |

## Source, derived, and human data

- **User source data:** measurement values, project configuration, statuses, material facts, and reference metadata.
- **Human-written data:** project notes, observations, fitting evidence, pattern decisions, and construction notes.
- **Derived calculations:** ease, dart width interpolation, unit formatting, task progress, and drafting dimensions.
- **Generated geometry:** canvas curves, marking positions, labels, and preview pixels. Never persisted.
- **Cached preview data:** none in v0.1.0.
- **Attachments:** URL references only; binary files are not copied into the workspace.

## Measurement units

Lengths are normalized to integer millimetres. Metric display uses practical centimetre precision. Imperial display rounds to conventional eighth-inch increments, with quarter-inch results shown when exact. Tutorial text uses structured measurement tokens so the global unit toggle can convert instructional values consistently.

## Backup contract

The JSON envelope is schema version 1 and wraps the workspace:

```json
{
  "format": "sewing-planner-backup",
  "schemaVersion": 1,
  "appVersion": "0.1.0",
  "exportedAt": "2026-07-24T18:00:00.000Z",
  "data": {}
}
```

The machine-readable contract is in `contracts/sewing-studio-backup.schema.json`. Import accepts explicitly supported structural predecessors, migrates them in memory, then validates all record metadata, parent ownership, references, and task dependencies. Stable IDs survive round trips.

## Migration rule

Adding optional fields may normalize defaults without changing the workspace schema. Renaming/removing fields, changing meaning, or changing parent relationships requires a schema increment and tested migration. Never mutate an imported object in place before the candidate passes validation.
