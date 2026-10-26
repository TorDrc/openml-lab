# Contributing to OpenML Lab

Thanks for helping make machine learning easier to learn. This project stays small, free to host and honest about what models can and cannot do, so a few ground rules matter more than usual.

## Ground rules

1. **Zero cost, zero server.** Everything must run in the browser and deploy as static files. No paid APIs, no API keys, no required accounts, no backend.
2. **Privacy first.** Never upload user data anywhere. No analytics, trackers, third-party scripts, fonts or CDNs (the Content-Security-Policy would block them anyway).
3. **No fake functionality.** No placeholder buttons, invented metrics or testimonials. If a feature is unfinished, say so in the UI and in the README.
4. **No misleading performance claims.** Report training / validation / test results separately, keep baselines visible, and word explanations as "on this test set" rather than "the model is X% accurate".
5. **No data leakage.** Anything computed from data (means, scalers, imputation values, class balance) must be fitted on the training split only.
6. **Be kind.** Be respectful and constructive in issues and reviews.

## Getting set up

```bash
git clone https://github.com/<your-fork>/openml-lab.git
cd openml-lab
npm install
npm run dev
```

Before opening a pull request, run all of these and make sure they pass:

```bash
npm run lint
npm test
npm run build
```

## Workflow

1. Open an issue first for anything larger than a small fix, so we can agree on scope.
2. Create a branch from `main`, make small focused commits, and add or update tests.
3. Open a pull request. CI runs lint, tests, a production build and the asset-path check; it does **not** deploy pull requests.
4. A merge to `main` deploys to GitHub Pages automatically.

## Code guidelines

- TypeScript `strict` mode; no `any` (ESLint enforces this).
- Keep pure logic (parsing, splitting, metrics, algorithms) in `src/ml` and `src/utils`, free of React, so it is easy to unit test.
- Anything random must use the seeded generator in `src/utils/rng.ts`, never `Math.random()`.
- Render user-provided strings only as React text children, passed through `sanitizeText` / `sanitizeColumnName` where they come from files. Never use `innerHTML` or `dangerouslySetInnerHTML`.
- Keep TensorFlow.js behind the dynamic import in `src/ml/tfModels.ts` so it never lands in the first page load. Dispose tensors and models you create.
- UI changes must work at 375 px width, in light and dark themes, and with the keyboard alone.

## Adding a dataset

1. Add a generator to `src/data/datasets.ts`. It must be deterministic (seeded) and synthetic, or come with a licence that allows redistribution and be credited in `THIRD_PARTY_LICENSES.md`.
2. Give it a clear name, description and a one-line hint about what to try.
3. `tests/algorithms.test.ts` already round-trips every listed dataset through the CSV parser, so the new entry is covered automatically.

## Adding an algorithm

1. Implement it in `src/ml` (pure TypeScript) or in `src/ml/tfModels.ts` (TensorFlow.js).
2. Register it in `ALGORITHMS` and `ALGORITHM_DEFAULTS` in `src/ml/trainer.ts`, listing which parameters the UI should expose.
3. Add plain-language wording in `src/ml/explain.ts` if it needs special advice.
4. Add tests that train it on a sample dataset and check a reasonable score against a baseline.

## Dependencies and licences

Prefer no new dependency. If one is truly needed it must be free, open source and licence-compatible with MIT (MIT, BSD, ISC, Apache-2.0). Add it to `THIRD_PARTY_LICENSES.md` and explain why in the pull request.

## Licensing of contributions

By contributing you agree that your contribution is licensed under the project's [MIT licence](LICENSE).

## Reporting security problems

Please do not open a public issue for vulnerabilities. See [SECURITY.md](SECURITY.md).
