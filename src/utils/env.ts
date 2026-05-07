export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'REPRONIG',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.repronig.local/api/v1',
  paystackPublicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
  flutterwavePublicKey: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || '',
};
