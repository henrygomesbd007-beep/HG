import { configureFal, checkAccess, MODEL, sendError } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    checkAccess(req);
    const { prompt, imageData, duration = '5', adultConfirmed } = req.body || {};
    if (!adultConfirmed) return res.status(400).json({ error: 'Confirm you are 18+ and that all depicted characters are fictional adults.' });
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 1800) return res.status(400).json({ error: 'Enter a prompt between 1 and 1800 characters.' });
    if (typeof imageData !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(imageData)) return res.status(400).json({ error: 'Upload a PNG, JPEG, or WebP image.' });
    if (imageData.length > 4_000_000) return res.status(413).json({ error: 'Image is too large. Choose an image under about 2.8 MB.' });
    if (!['5', '10'].includes(String(duration))) return res.status(400).json({ error: 'Unsupported duration.' });

    const client = configureFal();
    const queued = await client.queue.submit(MODEL, {
      input: {
        prompt: prompt.trim(),
        image_url: imageData,
        duration: String(duration),
        negative_prompt: 'low quality, flicker, distorted anatomy, extra limbs, blurry'
      }
    });
    return res.status(202).json({ requestId: queued.request_id, model: MODEL, status: 'IN_QUEUE' });
  } catch (err) {
    return sendError(res, err);
  }
}
