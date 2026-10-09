import { configureFal, checkAccess, MODEL, sendError } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    checkAccess(req);
    const requestId = req.query?.requestId;
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{8,100}$/.test(requestId)) return res.status(400).json({ error: 'Invalid request ID.' });
    const client = configureFal();
    const status = await client.queue.status(MODEL, { requestId, logs: false });
    if (status.status === 'COMPLETED') {
      const result = await client.queue.result(MODEL, { requestId });
      const videoUrl = result?.data?.video?.url;
      if (!videoUrl || !/^https:\/\//.test(videoUrl)) return res.status(502).json({ error: 'The provider completed the job but returned no video URL.' });
      return res.status(200).json({ status: 'COMPLETED', videoUrl, model: MODEL });
    }
    return res.status(200).json({ status: status.status || 'IN_PROGRESS' });
  } catch (err) {
    return sendError(res, err);
  }
}
