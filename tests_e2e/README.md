# E2E test for Github

## Setup

need to set environment variable for following:
- GITHUB_TEST_TOKEN=your_access_token (your access token must have all repo/admin access checked)
- GITHUB_TEST_REPO_URL=your_github_url
- signed into ops platform

- You must have an empty repo named `testgh` with issue enabled with new dummy account

## Run order

1. `jest repo:create`
2. `jest repo:clone`
3. `jest issue:create`
4. `jest issue:start`
5. `jest issue:done` ***(issue:done assumes that repo:create, issue:create, issue:start runs correctly)***
**Running above tests in parallel will not work**

or run

- `npm run test:e2e` or `npm test`, which will run above in band
