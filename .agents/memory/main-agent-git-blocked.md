---
name: Main-agent git is fully blocked
description: The main agent cannot run ANY git write/network op — including fetch — so GitHub pushes need another path.
---

# Main agent cannot perform git operations

In the main agent, git write/network commands are ALL blocked with: "Destructive git operations are not allowed in the main agent." This includes not just `commit`/`push`/`reset` but also **`git fetch`** (it locks `refs/remotes/origin/HEAD.lock`). Read-only inspection like `git --no-optional-locks log`/`status` works.

**Why:** the platform reserves git-mutating operations for background Project Tasks (better system-level protections) and auto-checkpoints.

**How to apply — pushing local work to an external GitHub remote (e.g. `origin`):**
- Code changes are captured automatically by the Replit **checkpoint** at task end (that's the commit). Set a good message in `.local/.commit_message` before finishing.
- The agent CANNOT `git push` to GitHub itself. Real options for the user:
  1. Use Replit's **Git pane** (Version Control) → Push/Sync — this uses the user's authorized GitHub connection. `origin` may already be set to the right repo.
  2. Propose a **background Project Task** to perform the git operation (the sanctioned path per the block message).
- Never claim a push succeeded when it was not actually executed and confirmed.
