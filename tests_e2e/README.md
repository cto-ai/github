# E2E test for GitHub

## Setup

You need to set environment variable for following:
- `GITHUB_TEST_TOKEN`=Your_access_token (Your access token must have all repo/admin access checked)
- `GITHUB_TEST_TARGET`=The name of op you want to test against. You will need to put namespace to run it against other team. (@cto.ai/github)
- `EXISTING_USER_NAME`=Existing user name for ops platform for testing
- `EXISTING_USER_PASSWORD`=Existing user password for ops platform for testing

- You must have an empty repo named `testgh` with issue enabled with new dummy account that is associated with GITHUB_TEST_TOKEN

## Run order

1. `jest repo:create`
2. `jest repo:clone`
3. `jest issue:create`
4. `jest issue:start`
5. `jest issue:done` ***(issue:done assumes that repo:create, issue:create, issue:start runs correctly)***
**Running above tests in parallel will not work**

Or

- `npm run test:e2e` or `npm test`, which will run above in band
