import assert from "node:assert/strict";
import test from "node:test";
import { reviewJobFromWebhook, verifyWebhookSignature } from "../src/webhook.mjs";

test("validates GitHub's documented webhook signature vector", () => {
  const body = Buffer.from("Hello, World!");
  const signature = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17";
  assert.equal(verifyWebhookSignature("It's a Secret to Everybody", body, signature), true);
  assert.equal(verifyWebhookSignature("wrong", body, signature), false);
});

test("creates jobs only for reviewable pull request events", () => {
  const payload = {
    action: "synchronize",
    number: 42,
    installation: { id: 123 },
    repository: { full_name: "gregnazario/example" },
    pull_request: {
      draft: false,
      user: { login: "gregnazario" },
      head: { sha: "abcdef" },
    },
  };
  assert.deepEqual(reviewJobFromWebhook("pull_request", payload, "gregnazario"), {
    key: "gregnazario/example#42",
    fullName: "gregnazario/example",
    number: 42,
    installationId: 123,
    headSha: "abcdef",
  });
  assert.equal(reviewJobFromWebhook("pull_request", { ...payload, action: "closed" }, "gregnazario"), null);
  assert.equal(reviewJobFromWebhook("issues", payload, "gregnazario"), null);
});
