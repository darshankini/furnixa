import { createApp } from './app.factory.js';

// No top-level await: Hostinger's LiteSpeed runner (lsnode.js) loads this file with require(),
// which fails with ERR_REQUIRE_ASYNC_MODULE when the ESM graph contains top-level await.
async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
