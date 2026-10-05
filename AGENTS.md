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
