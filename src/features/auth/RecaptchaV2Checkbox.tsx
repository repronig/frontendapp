import { forwardRef, type ElementRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { env } from '@/utils/env';

type Props = {
  /** When true, prevents interaction while the form is submitting. */
  disabled?: boolean;
};

/**
 * Google reCAPTCHA v2 “I’m not a robot” checkbox. Renders nothing when
 * `VITE_RECAPTCHA_SITE_KEY` is unset (local/dev without captcha).
 */
export const RecaptchaV2Checkbox = forwardRef<ElementRef<typeof ReCAPTCHA>, Props>(function RecaptchaV2Checkbox(
  { disabled = false },
  ref,
) {
  const siteKey = env.recaptchaSiteKey;
  if (!siteKey) {
    return null;
  }

  return (
    <div
      className={`auth-register-form-span-2 flex justify-center [&_.g-recaptcha]:origin-top [&_.g-recaptcha]:scale-[0.92] sm:[&_.g-recaptcha]:scale-100 ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <ReCAPTCHA ref={ref} sitekey={siteKey} theme="light" />
    </div>
  );
});
