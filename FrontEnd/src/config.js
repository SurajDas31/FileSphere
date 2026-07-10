export const config = {
  API_BASE_URL: import.meta.env.API_BASE_URL ?? 'http://localhost:7000',
  ENV: import.meta.env.ENV ?? 'development',
  DEBUG: import.meta.env.DEBUG === 'true',
};
