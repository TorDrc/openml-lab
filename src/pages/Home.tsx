import { Link } from '../utils/router';

const FEATURES: { title: string; body: string }[] = [
  {
    title: 'Runs in your browser',
    body: 'Training and prediction happen on your own device with TensorFlow.js and plain TypeScript. There is no server to wait for and no API key.',
  },
  {
    title: 'Your data stays with you',
    body: 'CSV files are read locally and never uploaded. There are no accounts and no analytics.',
  },
  {
    title: 'Honest evaluation',
    body: 'Every dataset is split into training, validation and test sets with a seed, and preprocessing is fitted on training rows only to prevent data leakage.',
  },
  {
    title: 'Made for learning',
    body: 'See loss curves, decision boundaries and plain-language explanations, including warnings about overfitting and small test sets.',
  },
];

export default function Home() {
  return (
    <div className="stack-lg">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Free · Open source · No sign-up</p>
        <h1 id="page-title" tabIndex={-1}>
          OpenML Lab
        </h1>
        <p className="tagline">Learn. Train. Predict. Share.</p>
        <p className="lead">
          An online machine-learning laboratory. Train classification and regression models on sample or uploaded data, watch them learn,
          and test predictions — all inside this page.
        </p>
        <div className="actions">
          <Link to="/lab" className="btn btn-primary">
            Open the lab
          </Link>
          <Link to="/learn" className="btn">
            Learn the basics
          </Link>
          <Link to="/datasets" className="btn">
            Bring your own CSV
          </Link>
        </div>
        <p className="muted">
          Fastest start: open the lab and press <strong>Run sample classification project</strong>.
        </p>
      </section>

      <section aria-labelledby="features-title">
        <h2 id="features-title">What you can do here</h2>
        <ul className="grid feature-grid">
          {FEATURES.map((f) => (
            <li key={f.title} className="card">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="algos-title" className="card">
        <h2 id="algos-title">Algorithms available</h2>
        <ul className="plain-list">
          <li>
            <strong>Classification:</strong> logistic regression, a small neural network (MLP) and k-nearest neighbours.
          </li>
          <li>
            <strong>Regression:</strong> ridge regression, gradient-descent linear regression and a small neural network (MLP).
          </li>
        </ul>
      </section>

      <section aria-labelledby="limits-title" className="card">
        <h2 id="limits-title">Know the limits</h2>
        <p>
          This is a teaching and experimentation tool, not a production ML platform. Models are small, datasets are limited to 5 MB and
          20,000 rows, speed depends on your device, and the built-in sample datasets are synthetic. High scores on a small dataset do not
          mean a model will work on new real-world data. <Link to="/about">Read the full list of limitations.</Link>
        </p>
      </section>
    </div>
  );
}
