# Privacy and publication audit

## Application behavior

Sewing Studio has no accounts, authentication, analytics, tracking pixels, application backend, hosted database, or synchronization feature. Workspace state stays in browser IndexedDB until the user exports it. A direct-folder copy requires an explicit directory picker and browser permission.

The included sample uses the fictional name **Mara Ellis**, synthetic measurements, fictional project notes, and a CSS-generated textile motif. No personal fitting photographs or private workspace exports are included.

## Repository audit checklist

Before public release, inspect current files, staged changes, all refs, commit messages, deleted files, binaries, fixtures, screenshots, ignored local databases, environment files, build output, and generated logs for:

- measurements, fitting photos, project notes, journals, and names
- employer/client information, private tickets, internal repositories, or architecture
- keys, tokens, credentials, database files, and browser exports
- absolute home-directory paths and old deployment identifiers
- deleted private data retained in history

Use synthetic data for screenshots and tests. `.gitignore` and `.dockerignore` exclude common export, database, environment, log, and local-work directories, but ignore rules are not a substitute for review.

## Publication history boundary

Pre-release work lived in a private development repository whose history included obsolete hosting configuration and personal-reference material. Deleting those files in a later commit would not remove them from that history.

**Publication rule:** the public repository must begin from a clean, reviewed source snapshot. Do not merge, graft, or force-push the earlier private history into the public repository. Future public development can proceed normally from the clean initial commit.

## License review

Application source in the sanitized tree is owned for this project and contains no copied component library. Runtime dependency licenses were enumerated: MIT, Apache-2.0, BSD/ISC/0BSD, CC-BY-4.0 data, and dynamically used LGPL libvips. These are compatible with distributing the application under MIT when upstream notices remain in dependency packages.
