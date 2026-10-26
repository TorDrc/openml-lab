import { Card, PageHeader } from '../components/ui';

const REPO_URL = import.meta.env.VITE_REPO_URL;

const DEPENDENCIES: { name: string; license: string; use: string }[] = [
  { name: 'React / React DOM', license: 'MIT', use: 'User interface' },
  { name: 'TensorFlow.js (@tensorflow/tfjs)', license: 'Apache-2.0', use: 'In-browser training of gradient-based models' },
  { name: 'Vite and @vitejs/plugin-react', license: 'MIT', use: 'Development server and production build' },
  { name: 'TypeScript', license: 'Apache-2.0', use: 'Type checking' },
  { name: 'Vitest', license: 'MIT', use: 'Automated tests' },
  { name: 'ESLint, typescript-eslint, eslint-plugin-react-hooks', license: 'MIT', use: 'Linting' },
];

export default function About() {
  return (
    <div className="stack-lg">
      <PageHeader title="About OpenML Lab" lead="A free, open-source machine-learning laboratory that runs entirely in your browser." />

      <Card title="How it works">
        <p>
          OpenML Lab is a static website. After the page loads, all parsing, splitting, training and prediction happen on your device.
          Gradient-trained models (logistic regression, neural networks, gradient-descent linear regression) use TensorFlow.js; k-nearest
          neighbours and ridge regression are plain TypeScript. The site needs no server, database, API key, account or payment.
        </p>
      </Card>

      <Card title="Privacy and security">
        <ul className="plain-list">
          <li>Uploaded CSV files are read locally in your browser and are never sent anywhere. Nothing is stored after you close the tab.</li>
          <li>There are no analytics, trackers or third-party scripts. Theme choice is the only thing saved (in your browser’s local storage).</li>
          <li>Files are validated (type, 5 MB size, 20,000 rows, 100 columns) and every value is sanitised before it is displayed.</li>
        </ul>
        <p>
          <strong>Honest caveat:</strong> processing in the browser protects your data from our servers (there are none), but it does not
          guarantee security. A maliciously crafted file or a bug in your browser could still cause problems. Avoid opening files from sources
          you do not trust, and do not load highly sensitive data on a shared or untrusted computer.
        </p>
      </Card>

      <Card title="Limitations">
        <ul className="plain-list">
          <li>Models are small and run on your device, so speed and memory depend on your hardware. Large datasets are rejected on purpose.</li>
          <li>Only numeric features are supported. There is no text, image or time-series support, and no model export or saving yet.</li>
          <li>The built-in sample datasets are synthetic teaching data, not real measurements.</li>
          <li>
            Results are reproducible for a fixed seed, but neural-network training may differ slightly between browsers and graphics
            hardware.
          </li>
          <li>Scores come from one split of a small dataset. They are estimates with real uncertainty, not guarantees.</li>
          <li>Free static hosting means no accounts, no sharing of trained models between users, and no server-side computation.</li>
        </ul>
      </Card>

      <Card title="Open source and contributing">
        <p>
          OpenML Lab is released under the MIT licence. Bug reports, new sample datasets, algorithms, translations and accessibility fixes are
          welcome. See <code>CONTRIBUTING.md</code> in the repository for setup, coding standards and the pull-request checklist, and{' '}
          <code>SECURITY.md</code> for how to report a vulnerability privately.
        </p>
        {REPO_URL ? (
          <p>
            Source code: <a href={REPO_URL}>{REPO_URL}</a>
          </p>
        ) : (
          <p className="muted">This build was not given a repository address; find the source in the repository you deployed it from.</p>
        )}
      </Card>

      <Card title="Third-party software">
        <div className="table-wrap">
          <table>
            <caption>Main dependencies and their licences (see THIRD_PARTY_LICENSES.md for details)</caption>
            <thead>
              <tr>
                <th scope="col">Package</th>
                <th scope="col">Licence</th>
                <th scope="col">Used for</th>
              </tr>
            </thead>
            <tbody>
              {DEPENDENCIES.map((d) => (
                <tr key={d.name}>
                  <th scope="row">{d.name}</th>
                  <td>{d.license}</td>
                  <td>{d.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
