# OpenML Lab

OpenML Lab is a free, browser-based machine-learning playground for learning, training, and evaluating models directly in the browser.

## Purpose

This project helps people explore ML concepts without paying for API access or creating accounts. It trains lightweight models locally using TensorFlow.js and hosts a static site on GitHub Pages.

## Features

- Classification demo with feature inputs and confidence scores
- Regression demo with numeric predictions and evaluation metrics
- Dataset laboratory with CSV upload and preview
- Training workspace with progress and loss charts
- Responsive light/dark UI for mobile and desktop
- Educational documentation for classification, regression, overfitting, validation, and prediction
- GitHub Pages deployment configuration

## Stack

- React + TypeScript
- Vite
- TensorFlow.js
- GitHub Pages
- GitHub Actions

## Local development

1. Install dependencies:
   npm install
2. Start the Vite dev server:
   npm run dev
3. Open the local browser URL printed in the terminal.

## Test and build

- Run tests: npm test
- Run linting: npm run lint
- Build production assets: npm run build

## Deployment

This repository is configured for GitHub Pages project hosting with the following expected project URL:

https://TorDrc.github.io/openml-lab/

Repository settings required:

- Repository visibility: public
- Default branch: main
- Pages source: GitHub Actions
- Actions permissions: allow GitHub Pages deployment
- Vite base path: /openml-lab/

## Security and privacy

- Uploaded data is processed locally in the browser.
- No private datasets are sent to external services.
- Browser-side processing is not a guarantee against malicious files or browser vulnerabilities.

## Browser limits

- Model training is limited by browser CPU and memory.
- Large datasets may run slowly on low-powered devices.
- Free static hosting is appropriate for small demo workloads and educational use.

## Checklist

- [ ] Install dependencies successfully
- [ ] Run tests successfully
- [ ] Build the app successfully
- [ ] Enable GitHub Pages in repository settings
- [ ] Verify public site loads after deployment

## Contributing

See CONTRIBUTING.md.

## Security policy

See SECURITY.md.

## License

MIT License. See LICENSE.
