/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public repository URL, injected by the deploy workflow. Left undefined for local builds. */
  readonly VITE_REPO_URL?: string;
}
