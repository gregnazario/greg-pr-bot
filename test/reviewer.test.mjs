import assert from "node:assert/strict";
import test from "node:test";
import { buildPiEnvironment, reviewPullRequest } from "../src/reviewer.mjs";

const config = {
  author: "gregnazario",
  maxDiffChars: 10_000,
  fingerprint: "abc123",
  models: [{ provider: "zai", model: "glm-5.3", thinking: "high", label: "zai/glm-5.3:high" }],
};

function pullRequest() {
  return {
    number: 7,
    state: "open",
    draft: false,
    title: "Change",
    body: "Body",
    user: { login: "gregnazario" },
    head: { sha: "1234567890", ref: "feature" },
    base: { ref: "main" },
  };
}

test("posts a review for a new PR head", async () => {
  let posted;
  const client = {
    getPullRequest: async () => pullRequest(),
    listIssueComments: async () => [],
    getPullRequestDiff: async () => "diff --git a/a b/a",
    createIssueComment: async (_repo, _number, body) => (posted = body),
  };
  const result = await reviewPullRequest({
    client,
    fullName: "gregnazario/example",
    number: 7,
    config,
    runModel: async () => "No actionable issues found.",
    logger: { log() {} },
  });
  assert.equal(result.status, "reviewed");
  assert.match(posted, /head:1234567890 config:abc123/);
  assert.match(posted, /No actionable issues found/);
});

test("does not rerun a current review", async () => {
  let ran = false;
  const client = {
    getPullRequest: async () => pullRequest(),
    listIssueComments: async () => [{
      user: { type: "Bot" },
      body: "<!-- greg-pr-bot-review head:1234567890 config:abc123 -->\nold",
    }],
  };
  const result = await reviewPullRequest({
    client,
    fullName: "gregnazario/example",
    number: 7,
    config,
    runModel: async () => (ran = true),
    logger: { log() {} },
  });
  assert.equal(result.status, "skipped_current");
  assert.equal(ran, false);
});

test("removes GitHub App and webhook secrets from Pi's environment", () => {
  const env = buildPiEnvironment({
    PATH: "/bin",
    ZAI_API_KEY: "model-key",
    GH_TOKEN: "installation-token",
    APP_PRIVATE_KEY_BASE64: "private-key",
    GITHUB_WEBHOOK_SECRET: "webhook-secret",
  });
  assert.deepEqual(env, { PATH: "/bin", ZAI_API_KEY: "model-key" });
});
