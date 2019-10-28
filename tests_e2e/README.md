# E2E test for Github

## Setup

need to set environment variable for following:
- `GITHUB_TEST_TOKEN`=your_access_token (your access token must have all repo/admin access checked)
- `GITHUB_TEST_TARGET`=op you want to test against (i.e @cto.ai/github)
- `EXISTING_USER_NAME`=existing user name for testing
- `EXISTING_USER_PASSWORD`=existing user password for testing

- You must have an empty repo named `testgh` with issue enabled with new dummy account that is associated with GITHUB_TEST_TOKEN

## Run order

1. `jest repo:create`
2. `jest repo:clone`
3. `jest issue:create`
4. `jest issue:start`
5. `jest issue:done` ***(issue:done assumes that repo:create, issue:create, issue:start runs correctly)***
**Running above tests in parallel will not work**

or run

- `npm run test:e2e` or `npm test`, which will run above in band
