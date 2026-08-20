import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import test from "node:test";
import { createGitHubAppJwt, GitHubClient } from "../src/github.mjs";

test("creates an RS256 GitHub App JWT with bounded claims", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const now = 1_800_000_000_000;
  const jwt = createGitHubAppJwt({ clientId: "Iv1.test", privateKey, now });
  const [header, payload, signature] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url")), { alg: "RS256", typ: "JWT" });
  assert.deepEqual(JSON.parse(Buffer.from(payload, "base64url")), {
    iat: 1_799_999_940,
    exp: 1_800_000_540,
    iss: "Iv1.test",
  });
  assert.equal(
    verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url")),
    true,
  );
});

test("paginates GitHub list responses", async () => {
  const calls = [];
  const client = new GitHubClient("token", async (url) => {
    calls.push(url);
    const page = new URL(url).searchParams.get("page");
    const length = page === "1" ? 100 : 2;
    return new Response(JSON.stringify(Array.from({ length }, (_, index) => ({ index }))), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  const results = await client.paginatedList("/example");
  assert.equal(results.length, 102);
  assert.equal(calls.length, 2);
});
