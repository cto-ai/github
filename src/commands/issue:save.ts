import { Question, sdk, ux } from '@cto.ai/sdk'
import Debug from 'debug'
import branch from 'git-branch'
import { ParseAndHandleError } from '../errors'
import { execPromisified } from '../helpers/execPromisified'
import { checkLocalChanges } from '../helpers/git'
import { AnsIssueSave } from '../types/Answers'

const debug = Debug('github:issueSave')

const question: Question<AnsIssueSave> = {
  type: 'input',
  name: 'message',
  message: `\n📝 Please enter a commit message:\n`,
}

export const issueSave = async () => {
  try {
    const hasLocalChanges = await checkLocalChanges()
    if (!hasLocalChanges) {
      sdk.log('\n❌ Nothing to save!\n')
      return
    }
    await execPromisified(`git add .`)
    const { message } = await ux.prompt<AnsIssueSave>(question)
    await execPromisified(`git commit -m "${message}"`)
    const currentBranch = await branch()
    await execPromisified(`git push --set-upstream origin ${currentBranch}`)
    sdk.log('\n🎉 Successfully committed and pushed your code!\n')
  } catch (err) {
    debug(err)
    await ParseAndHandleError(err, 'issue:save')
  }
}
