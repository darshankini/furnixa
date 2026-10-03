import { createApp } from '../backend/dist/app.factory.js';

// Reused across warm invocations so Nest (and the DB pool) boots once per instance
let serverPromise;

export default async function handler(req, res) {
  serverPromise ??= createApp().then(async (app) => {
    await app.init();
    return app.getHttpAdapter().getInstance();
  });
  const server = await serverPromise;

  // The vercel.json rewrite (/api/:path* -> /api) appends ?path=... to the URL;
  // remove it so Nest's ValidationPipe doesn't reject it as an unknown query param
  const url = new URL(req.url, 'http://localhost');
  url.searchParams.delete('path');
  req.url = url.pathname + url.search;

  return server(req, res);
}