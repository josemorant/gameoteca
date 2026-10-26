# Contributing

Gameoteca is maintained by Jose Morant: [website](https://josemorant.com), [LinkedIn](https://linkedin.com/in/josemorant), [GitHub](https://github.com/josemorant).

## Development

Use Node.js 22.13 or newer (Node.js 22 is used in CI). Run `npm ci`, `npm test`, then `npm run desktop` or `npm start`. Use a disposable `DATA_DIR` when testing collection changes. Never commit a real collection, downloaded covers, private certificates, API keys or generated executables.

Write documentation, identifiers and code comments in English. Keep all five UI translations complete. Preserve existing database records and stable condition IDs. Original project files carry an MIT copyright notice for Jose Morant; preserve third-party copyright notices and credit contributors accurately.

## Branch workflow

- `main`: stable, release-ready code. Set it as the repository default branch.
- `develop`: integration branch for the next release.
- `feature/<short-name>` and `fix/<short-name>`: branch from `develop`, submit a pull request to `develop`, and delete after merging.
- `release/<version>`: optional stabilization branch from `develop`; merge into `main` and back into `develop`.
- `hotfix/<short-name>`: urgent fixes from `main`; merge into `main` and back into `develop`.

Keep commits focused. Pull requests should describe the problem, resulting behavior and validation. Require passing CI before merging. For a solo-maintained repository, reviews can remain optional; protect `main` against deletion and force pushes in GitHub settings.

## Release checklist

1. Update the package version, lockfile and `docs/RELEASE.md` on the release branch.
2. Run `npm test`, `npm run dist:win`, `npm run verify:package` and `node scripts/check-packed-runtime.cjs` on Windows.
3. Merge the validated release into `main` and synchronize `develop`.
4. Create the matching `v<version>` tag on `main`. Publish only the latest installer and portable executable from the fixed `release/` folder as GitHub Release assets, not Git-tracked files.

The release script replaces old output folders and explicitly disables automatic publishing, including in CI. Publish GitHub Release assets separately after validation. Never delete user data during release cleanup. Desktop installers are currently unsigned. Real Android/iOS camera and certificate installation checks remain part of manual validation.
