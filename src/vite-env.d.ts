/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to `"true"` to show WIPO Connect outbox tools on Super → Integrations. */
  readonly VITE_SHOW_WIPO_CONNECT_OUTBOX_UI?: string;
  /** Google reCAPTCHA v2 checkbox site key (public). */
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
