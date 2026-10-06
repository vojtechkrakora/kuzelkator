<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## User verification before commits and pushes

- Implement and test changes, then present them for the user's verification.
- Do not commit or push until the user has verified the current changes and explicitly approved committing and/or pushing them.
- Approval for an earlier change does not authorize committing or pushing subsequent changes. If more changes are made after approval, wait for renewed verification and approval.
- This rule applies to every commit and push, including documentation and agent-instruction changes.

## Branches, pull requests, and independent review

- Make all changes on a dedicated `feature/<description>` or `bug/<description>` branch, including documentation and workflow changes. Do not commit or push directly to `main`.
- After the user verifies the changes and approves committing and pushing, push the branch and open a pull request targeting `main`.
- Every PR must be reviewed by an independent agent using a different model from the implementing agent. Review the actual PR diff, relevant context, and validation results for correctness, regressions, and missing tests.
- Record the review outcome in the PR. Address any blocking findings and have the updated changes reviewed again. Any changes made after user approval also require renewed user verification before committing or pushing, as specified above.
- Merge the PR into `main` only after the reviewing agent approves the current revision and all required checks pass. A successful review authorizes completing the merge; do not bypass the PR workflow.
- If a reviewer using a different model is unavailable, leave the PR unmerged and explain the blocker. Do not substitute self-review for the required independent review.
