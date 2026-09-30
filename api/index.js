import { createApp } from '../backend/dist/app.factory.js';

// Reused across warm invocations so Nest (and the DB pool) boots once per instance
let serverPromise;

export default async function handler(req, res) {
  serverPromise ??= createApp().then(async (app) => {
    await app.init();
    return app.getHttpAdapter().getInstance();
  });
  const server = await serverPromise;
  return server(req, res);
}