export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'REPRONIG',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.repronig.local/api/v1',
  paystackPublicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
  flutterwavePublicKey: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || '',
  /** Google reCAPTCHA v2 checkbox site key (public). Leave empty to hide captcha in dev. */
  recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
};
