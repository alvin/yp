# Yellow Point — Product Spec

The living specification for **Yellow Point**, written to be built from — by
engineers and coding agents — and kept in step with the app.

## What's here

| Folder | What it is |
| --- | --- |
| `personas/` | **Who** we're building for — one Markdown profile each |
| `features/` | **What & why** — user stories with acceptance criteria, as Gherkin `.feature` |
| `wireframes/` | **Where** — an SVG sketch of each screen / flow |

## Working with this spec

- Each `features/*.feature` is one user story; its `Then / And …` lines are the
  acceptance criteria, and `@persona:` names who it serves.
- A story tagged `@status:done` has exactly one test,
  `app/tests/features/<same name>.test.ts`, that asserts its criteria;
  `app/tests/coverage-map.test.ts` fails the build otherwise. Stories not yet
  built stay `@status:backlog`.
- A change in behaviour updates the story in the same commit as the code and
  the test. A story that no longer describes the app is a bug.
- The matching `wireframes/*.svg` shows the intended screen.
