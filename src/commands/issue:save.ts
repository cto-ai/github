import { Question, ux } from '@cto.ai/sdk'
import Debug from 'debug'
import branch from 'git-branch'
import { ParseAndHandleError } from '../errors'
import { execPromisified } from '../helpers/execPromisified'
import { checkLocalChanges } from '../helpers/git'
import { AnsIssueSave } from '../types/Answers'
import { validatedPrompt } from '../helpers/promptUtils'

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
      await ux.print('\n❌ Nothing to save!\n')
      return
    }
    await execPromisified(`git add .`)
    const message = await validatedPrompt(question, (resp) => { return resp == '' ? true : false }, ' Commit message cannot be empty!')
    await execPromisified(`git commit -m "${message}"`)
    const currentBranch = await branch()
    await execPromisified(`git push --set-upstream origin ${currentBranch}`)
    await ux.print('\n🎉 Successfully committed and pushed your code!\n')
  } catch (err) {
    debug(err)
    await ParseAndHandleError(err, 'issue:save')
  }
}
