import { forwardRef, type ElementRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { env } from '@/utils/env';

type Props = {
  /** From `GET /platform-settings` when the API exposes it; falls back to `VITE_RECAPTCHA_SITE_KEY`. */
  siteKey?: string | null;
  /** When true, prevents interaction while the form is submitting. */
  disabled?: boolean;
};

/**
 * Google reCAPTCHA v2 “I’m not a robot” checkbox. Renders nothing when no site key is available
 * (API `recaptcha.registration.site_key` or `VITE_RECAPTCHA_SITE_KEY`).
 */
export const RecaptchaV2Checkbox = forwardRef<ElementRef<typeof ReCAPTCHA>, Props>(function RecaptchaV2Checkbox(
  { siteKey: siteKeyProp, disabled = false },
  ref,
) {
  const resolved = (typeof siteKeyProp === 'string' ? siteKeyProp.trim() : '') || env.recaptchaSiteKey.trim();
  if (!resolved) {
    return null;
  }

  return (
    <div
      className={`auth-register-form-span-2 flex justify-center [&_.g-recaptcha]:origin-top [&_.g-recaptcha]:scale-[0.92] sm:[&_.g-recaptcha]:scale-100 ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <ReCAPTCHA ref={ref} sitekey={resolved} theme="light" />
    </div>
  );
});
