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
  // req.query can still carry path=... (Vercel's helper or a cached parse of the original URL),
  // so set it explicitly from the cleaned URL. All our query params are single values.
  Object.defineProperty(req, 'query', {
    value: Object.fromEntries(url.searchParams),
    writable: true,
    configurable: true,
    enumerable: true,
  });

  return server(req, res);
}