/**
 * Dynamic AI Service URL resolver
 * Handles trailing slashes, private network hostnames (e.g. Render internal DNS),
 * and defaults to local development microservice.
 */
export const getAiServiceUrl = () => {
  let url = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  return url;
};

export default getAiServiceUrl;
