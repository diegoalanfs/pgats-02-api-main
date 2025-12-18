export function getBaseURL() {
  const baseURL = __ENV.BASE_URL;

  return baseURL || 'http://localhost:3000';
}
