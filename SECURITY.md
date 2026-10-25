# Security Policy

## Reporting a vulnerability

Please report any security issue privately by opening a GitHub security advisory or contacting the repository maintainer directly.

Do not post security details in public issues or pull requests.

## Safe handling

- Never commit secrets or credentials.
- Validate uploaded CSV files before processing.
- Treat all browser-side file uploads as untrusted input.
- Be careful with any external dependency updates.

## Limitations

This project runs in the browser and is hosted as a static site. Browser-side processing does not guarantee protection against malicious files, browser vulnerabilities, or compromised client devices.
