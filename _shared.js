import { fal } from '@fal-ai/client';

export const MODEL = process.env.VIDEO_MODEL || 'fal-ai/kling-video/v2.5-turbo/standard/image-to-video';

export function configureFal() {
  const key = process.env.FAL_KEY;
  if (!key) {
    const err = new Error('Generation is not configured yet. Add FAL_KEY in your hosting provider settings.');
    err.status = 503;
    throw err;
  }
  fal.config({ credentials: key });
  return fal;
}

export function checkAccess(req) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return;
  const supplied = req.headers['x-app-password'];
  if (typeof supplied !== 'string' || supplied !== expected) {
    const err = new Error('App password is incorrect.');
    err.status = 401;
    throw err;
  }
}

export function sendError(res, err) {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  res.status(status).json({ error: status === 500 ? 'The generation provider returned an error. Check your API configuration and provider limits.' : err.message });
}
