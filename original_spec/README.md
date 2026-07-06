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
- [Screen navigation](screen_navigation.md) — screen/report relationships and links to scope questions
- [Screens](wireframes/index.html) — all screen wireframes with linked feature files and grouped report access
- [Reports](reports/index.html) — all report and folio examples, each with report notes

## Gherkin feature files

The feature pack lives in `../features/`:

### Screen flow

- [Lookup Screen feature](../features/lookup_screen.feature)
- [Name Search Results feature](../features/name_search_results.feature)
- [Date Search Results feature](../features/date_search_results.feature)
- [Transaction Screen feature](../features/transaction_screen.feature)
- [Print Screen feature](../features/print_screen.feature)

### Reporting

- [Printed Outputs feature](../features/printed_outputs.feature)
- [Daily Cash Reporting feature](../features/daily_cash_reporting.feature)

Feature previews are handled by the shared tool in `../original_spec/tools/feature-preview.js`, so the `.feature` files themselves remain clean Gherkin.

Unresolved scope questions live beside the relevant feature as `../features/[feature_file_name].questions` and are the canonical place for open decisions.

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

features/
├── lookup_screen.feature
├── lookup_screen.questions
├── name_search_results.feature
├── name_search_results.questions
├── date_search_results.feature
├── date_search_results.questions
├── transaction_screen.feature
├── transaction_screen.questions
├── print_screen.feature
├── print_screen.questions
├── printed_outputs.feature
├── printed_outputs.questions
├── daily_cash_reporting.feature
└── daily_cash_reporting.questions

tools/
└── feature-preview.js
```
