# Releasing igloo-cli

This project uses a tag-driven GitHub Actions workflow to build, test, and create a GitHub Release. npm publishing and any PGP signing are done locally.

## One-time setup

1) Ensure your local Git is configured to sign tags with your PGP key (recommended):

```sh
gpg --list-secret-keys --keyid-format=long
git config --global user.signingkey <KEYID>
git config --global tag.gpgSign true
```

> Tip: You must have added the matching public key to your GitHub account for the “Verified” badge.

## Cut a release

1) Bump `version` in `package.json` (e.g., `1.0.1`).
2) Commit the change: `git commit -am "Release v1.0.1"`.
3) Create a signed, annotated tag and push it:

```sh
git tag -s v1.0.1 -m "igloo-cli v1.0.1"
git push origin v1.0.1
```

This triggers `.github/workflows/release.yml` which will:

- Install deps, typecheck, run tests, and build `dist/`.
- Create a GitHub Release for the tag (with release notes) and attach `dist/**`.

## Publish to npm locally

From a clean tree checked out at the release tag:

```sh
git checkout v1.0.1
npm ci
npm run build

# Optional: review the tarball contents first
npm pack

# Optional: PGP-sign the tarball for distribution integrity
gpg --armor --detach-sign igloo-cli-1.0.1.tgz   # creates .asc

# Publish (uses publishConfig.access = public)
npm publish

# Optional: upload the .asc signature to the GitHub Release
# gh release upload v1.0.1 igloo-cli-1.0.1.tgz.asc
```

## Notes on signing

- PGP in CI: Importing your private key into Actions is possible but discouraged. If you later want CI to sign tags, store an armored private key and passphrase in secrets and use an action like `crazy-max/ghaction-import-gpg` to sign.
- npm provenance: Since publishing is local, provenance attestations (OIDC) are not generated. If you want provenance in the future, move publishing back into GitHub Actions.
