---
name: bash grep/rg masks some string literals
description: Environment quirk — trust the read tool over bash grep for certain literals.
---

# bash `rg`/`grep` output masks certain string literals

In this environment, bash `rg`/`grep` output sometimes replaces specific string
literals with a placeholder (seen as `n`/`ln`), e.g. role names, "12 roles",
"8 roles", "Customer Portal User", "Refund". Line numbers and structure are intact,
but the literal text is hidden.

**Why:** a redaction/masking layer on shell output — not a bug in your pattern.

**How to apply:** to verify exact literal content (counts, role names, enum values),
use the `read` tool on the file (its output is unmasked). Use bash grep only to
locate line numbers / count matches, then confirm content with `read`.
