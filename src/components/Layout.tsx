import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useRoute, type RoutePath } from '../utils/router';
import { useTheme } from '../utils/theme';

const NAV: { to: RoutePath; label: string }[] = [
  { to: '/', label: 'Home' },
  { to: '/lab', label: 'Lab' },
  { to: '/datasets', label: 'Datasets' },
  { to: '/train', label: 'Train' },
  { to: '/learn', label: 'Learn' },
  { to: '/about', label: 'About' },
];

export function Layout({ children }: { children: ReactNode }) {
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const first = useRef(true);

  // After a route change, move focus to the page heading so keyboard and screen-reader users land in the new content.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    document.getElementById('page-title')?.focus();
  }, [route]);

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => {
        e.preventDefault();
        document.getElementById('main')?.focus();
      }}>
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="OpenML Lab home">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="26" height="26" />
            <span>OpenML Lab</span>
          </Link>
          <nav aria-label="Main" className="nav">
            <ul>
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} aria-current={route === item.to ? 'page' : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <button type="button" className="btn btn-ghost theme-toggle" onClick={toggleTheme} aria-pressed={theme === 'dark'}>
            {theme === 'dark' ? 'Light theme' : 'Dark theme'}
          </button>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="container main">
        {children}
      </main>
      <footer className="site-footer">
        <div className="container">
          <p>
            <strong>OpenML Lab</strong> — Learn. Train. Predict. Share. Everything runs in your browser; your data never leaves your device.
          </p>
          <p className="muted">Open source (MIT). No account, no tracking, no analytics.</p>
        </div>
      </footer>
    </>
  );
}
