# Shared wedding relay

One repository, one renderer, one public registry. Managed pages are generated, not edited independently.

Run from the repository root:

```sh
node manage/render.mjs manage/registry.json .
```

Register a public invitation with a unique slug, expiry, target, image and public metadata. Never add account numbers, guest records, contacts, tokens or other private fields. Revoked or expired entries generate a neutral closed page and have public metadata removed from the current registry. Slugs must not be reused.

The original root page is not managed until it is explicitly migrated. Existing unrelated files are untouched.

A production scheduled workflow still needs to be connected and its Pages deployment verified. A GITHUB_TOKEN commit alone does not guarantee a Pages rebuild. Exact access expiry is enforced by the origin server independently of scheduler delay. Existing social preview caches and historical Git commits are not erased by replacing the current file.
