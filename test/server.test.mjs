import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createAppServer } from "../src/server.mjs";

test("serves health checks and authenticates webhook pings", async (t) => {
  const secret = "test-secret";
  const { server } = createAppServer({
    webhookSecret: secret,
    tokenProvider: { get: async () => "unused" },
    reviewConfig: { author: "gregnazario" },
    logger: { log() {}, error() {} },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const health = await fetch(`http://127.0.0.1:${port}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, queued: 0 });

  const body = Buffer.from("{}");
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const ping = await fetch(`http://127.0.0.1:${port}/github/webhook`, {
    method: "POST",
    headers: {
      "X-GitHub-Event": "ping",
      "X-Hub-Signature-256": signature,
    },
    body,
  });
  assert.equal(ping.status, 200);

  const rejected = await fetch(`http://127.0.0.1:${port}/github/webhook`, {
    method: "POST",
    headers: { "X-GitHub-Event": "ping", "X-Hub-Signature-256": "sha256=bad" },
    body,
  });
  assert.equal(rejected.status, 401);
});
