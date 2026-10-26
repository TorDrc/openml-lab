import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

/**
 * A tiny hash router. GitHub Pages serves static files only, so path-based
 * routes (/lab) would 404 on refresh. Hash routes (#/lab) always work and need
 * no extra dependency.
 */
export const ROUTES = ['/', '/lab', '/datasets', '/train', '/learn', '/about'] as const;
export type RoutePath = (typeof ROUTES)[number];

export function parseHash(hash: string): RoutePath {
  const path = hash.replace(/^#/, '').split('?')[0] || '/';
  const normalised = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return (ROUTES as readonly string[]).includes(normalised) ? (normalised as RoutePath) : '/';
}

export function useRoute(): RoutePath {
  const [route, setRoute] = useState<RoutePath>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: RoutePath): void {
  window.location.hash = `#${path}`;
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: RoutePath;
  children: ReactNode;
}

export function Link({ to, children, ...rest }: LinkProps) {
  return (
    <a href={`#${to}`} {...rest}>
      {children}
    </a>
  );
}
