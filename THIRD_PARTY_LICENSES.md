# Third-party software and licences

OpenML Lab itself is released under the [MIT licence](LICENSE).

> **Please verify before publishing.** The licences below are those I know for these packages, but the project was prepared in an environment without access to the npm registry, so they could **not** be checked against the installed packages. After `npm install`, run
> `npx license-checker --production --summary` (and without `--production` for build tools) and correct this file if anything differs. Transitive dependencies (for example inside TensorFlow.js) are not listed individually here.

## Bundled into the website (production dependencies)

| Package | Licence | Used for |
| --- | --- | --- |
| react, react-dom | MIT | User interface |
| @tensorflow/tfjs (and its @tensorflow/* sub-packages) | Apache-2.0 | In-browser training of gradient-based models |

TensorFlow.js is licensed under Apache-2.0, which is compatible with distributing this project under MIT. Apache-2.0 requires that recipients receive a copy of the licence and that notices are retained when the library is redistributed; the licence text is in the `@tensorflow/tfjs` package in `node_modules` and at <https://www.apache.org/licenses/LICENSE-2.0>. If you redistribute the built site, confirm that the notices are retained (see "Unfinished work" in the README).

## Development and build tools (not shipped to users)

| Package | Licence |
| --- | --- |
| vite, @vitejs/plugin-react | MIT |
| typescript | Apache-2.0 |
| vitest | MIT |
| eslint, @eslint/js | MIT |
| typescript-eslint | MIT |
| eslint-plugin-react-hooks | MIT |
| globals | MIT |
| @types/node, @types/react, @types/react-dom | MIT |

## Datasets, models and other assets

- **Datasets:** all sample datasets are synthetic and generated at runtime from a seeded random-number generator in `src/data/datasets.ts`. No real-world or third-party data is included.
- **Pretrained models:** none. Every model is trained in the user's browser.
- **Fonts:** none are downloaded; the site uses the visitor's system fonts.
- **Icons and images:** `public/favicon.svg` is an original graphic created for this project.
