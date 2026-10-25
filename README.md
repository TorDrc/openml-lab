# openml-lab

OpenML Lab is a free, browser-based machine learning playground. The application trains lightweight models directly in the user’s browser using TensorFlow.js, supports local CSV uploads, and is designed for GitHub Pages hosting with no paid services or API keys.

## Project goal

Create a public, accessible machine-learning website where anyone can:

- learn classification and regression basics,
- train simple models locally in the browser,
- upload and inspect CSV files,
- compare results using validation and training metrics,
- explore educational content without creating an account.

## Features

- Landing page and product-style dashboard
- Classification demo with feature inputs and confidence output
- Regression demo with numeric prediction and evaluation metrics
- Training playground with algorithm selection and loss visualization
- CSV upload preview and column selection
- Downloadable datasets
- Light and dark themes
- Responsive layout for mobile and desktop
- GitHub Actions workflow for linting, tests, and Pages deployment

## Local development

1. Install dependencies:
   npm install
2. Start the dev server:
   npm run dev
3. Open the local Vite URL in a browser.

## Production build

npm run build

## Tests

npm test

## Linting

npm run lint

## GitHub Pages deployment

This repository is configured for GitHub Pages project hosting. The Vite base should remain `/openml-lab/` and the GitHub Pages source should be set to "GitHub Actions".

Required repository settings:

- Pages: Source = GitHub Actions
- Actions: workflow permissions enabled for GitHub Pages deployment
- Repository visibility: public
- Default branch: `main`
- Ensure the repository is pushed to GitHub before deployment

Expected project URL after deployment:

https://TorDrc.github.io/openml-lab/

## Security and privacy

- Uploaded datasets are processed locally in the browser.
- No private data is sent to external APIs.
- User-provided text is sanitized before display.
- Browser-side processing is not a guarantee against malicious files or browser exploits.

## Browser limits

- Full model training is limited by browser CPU and memory.
- Large files or model sizes may be slow on lower-powered devices.
- Free GitHub Pages hosting supports static assets only.

## Verification checklist

- [ ] Repository is public
- [ ] GitHub Pages source is set to GitHub Actions
- [ ] Actions workflow has permission to deploy Pages
- [ ] `npm install` completes successfully
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] The published Pages site loads without broken assets
- [ ] CSV upload and training interactions behave correctly on mobile and desktop

## Limitations

- Training is intentionally lightweight and browser-based.
- This is not a replacement for a full cloud ML platform.
- Large-scale or GPU-accelerated workloads should run in dedicated ML infrastructure.

## Repository structure

- `src/` application source
- `src/components/` shared UI components
- `src/pages/` landing, dashboard, docs, and about pages
- `src/ml/` TensorFlow.js training and evaluation code
- `src/data/` datasets and configuration
- `src/utils/` CSV and utility helpers
- `public/` static assets and downloadable CSV data
- `tests/` automated validation checks
- `.github/workflows/` deployment automation

## Contributing

See `CONTRIBUTING.md`.

## Security policy

See `SECURITY.md`.

## License

This project is licensed under the MIT License. See `LICENSE`.
