# Yellow Point Lodge Front Desk Scope

Start with [Scope home](index.html).

For local preview, run a static server from the repository root:

```sh
npx serve
```

Then open either:

- `http://localhost:3000/`
- `http://localhost:3000/original_spec/`

The scope index links to:

- [Requirements](requirements.md) — consolidated requirements, project principles, scope boundaries, and open details
- [Screen navigation](screen_navigation.md) — screen/report relationships
- [Screens](wireframes/index.html) — all screen wireframes with grouped report access
- [Reports](reports/index.html) — all report and folio examples, each with report notes

## Scope structure

```text
scope/
├── index.html
├── README.md
├── requirements.md
├── screen_navigation.md
├── reports/
│   ├── index.html
│   ├── *.html
│   └── report-styles.css
└── wireframes/
    ├── index.html
    ├── assets/
    │   └── wireframe-styles.css
    └── html/
        └── *.html

tools/
└── feature-preview.js
```
