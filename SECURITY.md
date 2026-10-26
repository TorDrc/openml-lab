# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Use GitHub's private reporting: on the repository page choose **Security → Report a vulnerability**. (Repository maintainers: enable this under **Settings → Code security → Private vulnerability reporting**.) Include what you found, steps to reproduce, and which browser and version you used.

This is a volunteer-run project, so there is no guaranteed response time or bug bounty. Reports will be acknowledged and handled on a best-effort basis.

## What the application does and does not do

- OpenML Lab is a **static website**. There is no backend, database, authentication or API key, so there are no server-side secrets and no user accounts to compromise.
- Uploaded CSV files are read and processed **only in your browser**. They are never transmitted. The only data the site stores is your light/dark theme choice in `localStorage`.
- There are no analytics, trackers or third-party scripts, fonts or CDNs.

## Protections in place

- **Upload validation:** extension check, 5 MB size limit, 20,000-row and 100-column limits, rejection of empty files, binary (NUL-containing) content and unterminated quotes.
- **Output sanitising:** control and bidirectional-override characters are stripped and displayed values are length-limited; React escapes all text, and the code base does not use `innerHTML` or `dangerouslySetInnerHTML`. CSV exports neutralise spreadsheet formula injection (cells starting with `=`, `+`, `-`, `@`).
- **Content-Security-Policy:** production builds include a CSP `<meta>` tag (`default-src 'self'`, no inline scripts, no external connections, `object-src 'none'`, `form-action 'none'`). GitHub Pages cannot send HTTP security headers, so a meta tag is the only option; it cannot enforce `frame-ancestors`.
- **Least-privilege CI:** the workflow requests `contents: read` for building and adds `pages: write` and `id-token: write` only for the deploy job. No secrets or personal access tokens are used or required.

## Known limitations

- **Browser-side processing is not a guarantee of security.** A maliciously crafted file or a vulnerability in your browser, in TensorFlow.js or in another dependency could still cause harm (for example, excessive memory use or a crash). Avoid opening files from untrusted sources and do not load highly sensitive data on shared or untrusted computers.
- The CSP currently permits `'unsafe-eval'` as a precaution for TensorFlow.js. This weakens the policy against script injection. It should be removed once training has been confirmed to work without it in the supported browsers.
- Large inputs within the limits can still make a low-memory phone slow or unresponsive; training can be stopped from the UI or by closing the tab.
- Dependencies have **not** been security-audited yet (the project was prepared without registry access, so `npm audit` has never been run). After your first `npm install`, run `npm audit`, and consider enabling Dependabot alerts and updates. Keep `package-lock.json` current and review dependency updates.

## Supported versions

Only the latest commit on `main` (the version deployed to GitHub Pages) is supported.
