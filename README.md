# 🚀 CTO.ai - Official Op - GitHub 🚀

An Op to simplify an opinionated GitHub workflow.

## Requirements 🔑

To run this or any other Op, install the [Ops Platform.](https://cto.ai/platform).

Find information about how to run and build Ops via the [Ops Platform Documentation](https://cto.ai/docs/overview)

This Op also requires an access token for GitHub interactions.

* To create a GitHub access token:
  
  * Create an access token with the `repo` and `admin` scopes following the instructions [here](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line).

  * Copy the access token and provide it when prompted.
  
  * Your remote `origin` must be set to a valid GitHub repo.

## Usage

Running `ops run github`, gives you a list of available commands to help you get started.

## Local Development

To develop and run Ops locally:

  1. Clone the repo `git clone <git url>`
  2. `cd` into the directory and install dependancies with `npm install`
  3. Run the Op from your local source code with `ops run path/to/op`

## Available Commands 💡

All the commands start with `ops run github`. From there, you would use the following commands to manage your GitHub flow.

* `repo:create`

Initializes a new git repo in the current working directory and pushes to the user's selected organization or personal GitHub repository.

* `repo:clone`

Clones a remote repo that you are a contributor on to your current working directory.

* `issue:create`

Creates a new issue in GitHub. Current working directory must be a repo either cloned or created using the
repo:create or repo:clone commands.

* `issue:list`

Lists all the issues the user has access to. If the current working directory is a
repo in github then the issues are scope by the repo otherwise it displays all issues that you are assigned to or created by you etc.

* `issue:search`

Searches all issues in GitHub for your current working directory by selected filters. User can pass optional query string argument in form of `[-q <+querystring> | --query <+querystring>]` for additional filters.  
Please check [GitHub querystring](https://help.github.com/en/articles/searching-issues-and-pull-requests) for detailed info

* `issue:start`

Lists all issues in GitHub for your current working directory. Selecting a issue will checkout a branch for that issue and set the upstream in github.

* `issue:save`

Adds all unstaged changes, commits and pushes to GitHub for the current working
branch.

* `issue:done`

Converts the current working issue into a pull-request and allows you to tag reviewers.

* `pulls:list`

Lists all the pull requests for a given repo. The current working directory has to be a repo.

* `label:add`

Allows you to create a new label in a repo and sync the label addition across other repos in the organization.

* `label:edit`

Allows you to edit a label and sync the edit across other repos in the organization.

* `label:remove`

Allows you to remove label from a repo and sync the removal across other repos in the organization.

* `label:sync`

Allows you to sync up labels from one base repo to any other repo(s) that you have access to. The op will check for any missing labels in the targeted repo(s) and add in as necessary.

* `token:update`

Allows you to update your GitHub access token.

## Debugging this Op

Use `DEBUG=github:* ops run github <command>` in order to run the op in debug mode.

When submitting issues or requesting help, be sure to also include the version information output from `ops -v`
