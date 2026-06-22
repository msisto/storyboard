# Storyboard — Claude Code instructions

## Git

- **Never push to remote unless explicitly asked.** Commit locally; wait for the user to say "push" before running `git push`.
- Do not amend published commits.

## UI design

Before adding any new UI concept, consider how it adds complexity to an already abstraction-laden interface. Examine solutions for redundancies in information architecture — stacked tab bars with identically named tabs at each level, controls that duplicate each other, panels that re-expose the same information. Prefer context-driven UI (show what's relevant to the current selection) over additive UI (show everything, let the user switch).
