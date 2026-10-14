# Contributing

Thanks for improving CSM Failure Lab. Contributions should help people reason
about customer-success failures without exposing real customers, systems, or
secrets.

## Setup and quality checks

1. Install a current Node.js LTS release and run `npm install`.
2. Start the app with `npm run dev`.
3. Before opening a pull request, run `npm test`, `npm run lint`, and
   `npm run format:check`.

## Scenario content

Scenario source files are YAML. Use `npm run validate:scenarios` to check
authoring errors and `npm run generate:scenarios` to refresh generated scenario
data after a source change. Keep scenarios fictional, sanitized, and useful as
teaching material; never use a real customer, employee, account, incident, or
support conversation.

Do not include credentials, API keys, access tokens, private URLs, personal
data, production identifiers, or confidential business information in issues,
pull requests, tests, examples, or scenario YAML.

## Review expectations

Keep changes focused and explain the learning value of new or revised scenario
content. Include tests for behavior changes, validate scenario content when it
changes, and update documentation when readers need new guidance. Reviewers may
ask for simpler language, stronger evidence, or clearer separation between
symptoms, root causes, and lessons.
