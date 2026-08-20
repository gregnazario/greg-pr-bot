# greg-pr-bot

A private, account-wide pull-request reviewer for `gregnazario`. It uses
[Pi](https://github.com/earendil-works/pi) as the coding harness. The default model is
GLM-5.3 through a Z.AI Coding Plan subscription, and the model list is configurable.

One central scheduled workflow discovers open PRs authored by `gregnazario` in every
repository where the GitHub App is installed. It posts one persistent review comment
and refreshes that comment whenever the PR head commit changes. No workflow file is
needed in the repositories being reviewed.

## What it reviews

- Security vulnerabilities and unsafe trust boundaries
- Correctness bugs and edge cases
- Performance and scalability problems
- Reliability, maintainability, and general code quality

Draft PRs are skipped. Five new PR revisions are reviewed per run by default; the
five-minute schedule picks up any remaining work on later runs.

## Setup

1. Create a private GitHub App owned by `gregnazario`.
2. Disable webhooks and allow installation only on this account.
3. Grant these repository permissions:
   - Contents: read
   - Issues: read and write
   - Pull requests: read and write
4. Install the App on all repositories, or select a smaller set.
5. Add the App client ID as the repository variable `APP_CLIENT_ID`.
6. Generate a private key and add its PEM contents as the repository secret
   `APP_PRIVATE_KEY`.
7. Add the Z.AI Coding Plan API key as the repository secret `ZAI_API_KEY`.
8. Run **Review my pull requests** from the Actions tab once; after that it runs every
   five minutes.

To add future repositories, update the GitHub App installation and include them. No
repository code change is needed.

## Security model

The workflow creates a short-lived installation token with only the permissions above.
The controller uses that token to read PR diffs and update comments, but removes it from
Pi's environment before starting GLM. Pi runs with tools, extensions, skills, context
files, sessions, and project trust disabled. PR titles, descriptions, and diffs are
therefore model input only and cannot execute commands or read runner secrets.

The GitHub Actions dependencies and Pi version are pinned. Dependabot can be added later
to keep those pins current through reviewed PRs.

## Limits

The App can review only repositories included in its installation. For PRs sent to a
repository owned by someone else, that owner must install the App or use a separate
per-repository workflow.

Large diffs are capped at four million characters. A truncated review says so in the
input metadata; split very large changes into smaller PRs for a better review.

## Configuration

The workflow accepts these variables:

| Variable | Default | Purpose |
| --- | ---: | --- |
| `PI_MODELS` | `zai/glm-5.3:high` | Comma-separated `provider/model[:thinking]` reviewers |
| `PR_AUTHOR` | `gregnazario` | Only review PRs opened by this GitHub user |
| `MAX_REVIEWS_PER_RUN` | `5` | Bound subscription usage and workflow duration |
| `MAX_DIFF_CHARS` | `4000000` | Maximum diff characters sent to each model |

Set the repository variable `PI_MODELS` to change or combine reviewers, for example:

```text
zai/glm-5.3:high,zai/glm-4.7:high
```

Each model runs independently through Pi and receives the same PR diff. Their findings
are grouped in one bot comment. Changing `PI_MODELS` changes the review configuration
fingerprint, so existing open PRs are reviewed again even when their head SHA is
unchanged.

The workflow also forwards optional `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`, and `DEEPSEEK_API_KEY` repository
secrets. Add only the secret required by each configured provider. Pi supports further
providers; add their documented environment-variable secret to the workflow before
selecting them.
