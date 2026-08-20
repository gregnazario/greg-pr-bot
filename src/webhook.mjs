import { createHmac, timingSafeEqual } from "node:crypto";

const reviewActions = new Set(["opened", "reopened", "ready_for_review", "synchronize"]);

export function verifyWebhookSignature(secret, body, signature) {
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function reviewJobFromWebhook(eventName, payload, author) {
  if (eventName !== "pull_request" || !reviewActions.has(payload.action)) return null;
  const pullRequest = payload.pull_request;
  const fullName = payload.repository?.full_name;
  const installationId = payload.installation?.id;
  const number = payload.number;
  if (!pullRequest || !fullName || !installationId || !Number.isSafeInteger(number)) return null;
  if (pullRequest.draft || pullRequest.user?.login?.toLowerCase() !== author.toLowerCase()) return null;
  return {
    key: `${fullName}#${number}`,
    fullName,
    number,
    installationId,
    headSha: pullRequest.head?.sha,
  };
}
