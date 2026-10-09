# Motion Studio AI — deployable web app / PWA

A mobile-first image-to-video interface with a server-side fal.ai queue integration. It can be installed from a deployed site using Chrome's **Add to Home screen**. This repository does **not** include an APK binary and has not been deployed to a public URL.

## Implemented in this source

- Mobile-responsive image upload and preview (PNG/JPEG/WebP, max 2.8 MB in this version).
- Prompt editor, prompt presets, 5/10 second duration selection.
- Adult/consent confirmation UI.
- PWA manifest, icon, and static asset service-worker cache.
- Server-side generation queue and status polling through `@fal-ai/client`.
- API key is read only from the server-side `FAL_KEY` environment variable.
- Optional `APP_PASSWORD` shared access guard.

## Not included / not verified

- No APK file, public deployment, or live API credentials are included.
- Real generation will not work until a valid provider key is configured and the provider accepts the request.
- Free generation is not guaranteed. Provider credits/pricing can change; image-to-video commonly consumes paid credits.
- Provider rules apply. This app does not bypass provider moderation or guarantee explicit adult generation. Use only lawful images you own or have permission to animate, and only fictional adults or consenting adults.
- The image data is sent to the selected cloud provider. Do not upload sensitive images unless you accept that provider's data terms.
- The video URL is provider-hosted; save a local copy if needed.

## Deploy to Vercel

1. Create an account at https://vercel.com and a fal.ai account at https://fal.ai.
2. Create a fal API key in your fal dashboard.
3. Upload this folder to a private GitHub repository or deploy it with Vercel CLI.
4. In Vercel Project Settings → Environment Variables, set:
   - `FAL_KEY` = your fal API key
   - `APP_PASSWORD` = a long random password (recommended)
   - optionally `VIDEO_MODEL` = a model endpoint you are allowed to use
5. Redeploy after setting environment variables.
6. Open the deployed URL in Chrome on Android. Use the browser menu → **Add to Home screen** / **Install app**.

### Local development

Requires Node.js 20+ and a Vercel account/CLI for API routes.

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your real credentials; never commit it.
npm run dev
```

## Security notes

- Never put `FAL_KEY` in `app.js`, HTML, or any `NEXT_PUBLIC_*` variable.
- Set `APP_PASSWORD` for a personal deployment. This simple shared password is not a full user-account system or robust rate limiter; do not expose it to the public without adding authentication, quotas, and abuse protection.
- The initial API accepts image data URIs and limits request size to stay under common serverless body limits. The UI limits selected files to 2.8 MB.
- Provider moderation, pricing, and model availability are controlled by the provider.
