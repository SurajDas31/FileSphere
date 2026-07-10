export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:7000',
  ENV: import.meta.env.VITE_ENV ?? 'development',
  DEBUG: import.meta.env.VITE_DEBUG === 'true',
};
