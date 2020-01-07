import { ux } from '@cto.ai/sdk'
import { ChildProcess, spawn, SpawnOptions } from 'child_process'
import concat from 'concat-stream'
import Debug from 'debug'
import { execPromisified } from '../../src/helpers/execPromisified'
import { cleanupFn } from '../utils/cleanupFn'
import { EXISTING_USER_NAME, EXISTING_USER_PASSWORD, OP_NAME, OP_PATH } from '../utils/constants'

const debugVerbose = Debug('cmd:verbose')

const defaultEnv = {
  NODE_ENV: 'test',
}

const setEnv = (
  defaultEnv: NodeJS.ProcessEnv,
  processEnv: NodeJS.ProcessEnv,
) => {
  return { ...defaultEnv, ...processEnv }
}

interface cmdObj {
  args: string[]
  inputs?: string[]
  timeout?: number
  command?: string
  options?: SpawnOptions
}

async function run({
  args = [],
  inputs = [],
  timeout = 5000,
  command = OP_PATH,
  options = {},
}: cmdObj): Promise<any> {
  const env = setEnv(defaultEnv, process.env)
  const childProcess = spawn(command, ['run', OP_NAME, ...args], {
    env,
    ...options,
  })

  if (inputs.length > 0) {
    sendInput(inputs, childProcess, timeout)
  }

  return new Promise(resolve => {
    // to enable verbose logs set DEBUG=cmd*
    childProcess.stderr.on('data', errChunk => {
      debugVerbose(errChunk.toString())
    })

    childProcess.stdout.on('data', chunk => {
      debugVerbose(chunk.toString())
    })

    childProcess.stdout.pipe(
      concat((buffer: Buffer) => {
        const result = buffer.toString()

        resolve(result)
      }),
    )
  })
}

const sendInput = function (
  inputs: string[],
  child: ChildProcess,
  timeout: number,
) {
  if (!inputs.length) {
    return child.stdin.end()
  }

  const [firstInput, ...remainingInputs] = inputs

  setTimeout(() => {
    try {
      if (child.stdin.writable) {
        child.stdin.write(firstInput)
      }
    } catch (error) {
      //TODO: this should/should not be async
      ux.print('%O' + error)
    }

    sendInput(remainingInputs, child, timeout)
  }, timeout)
}

const cleanup = async (command: string) => {
  try {
    await cleanupFn[command]()
    await ux.print('cleanup endpoint hit successfully')
  } catch (err) {
    console.error({ err })
  }
}

const sleep = (milliseconds: number) => {
  return new Promise(resolve => setTimeout(() => resolve(), milliseconds))
}

const signin = async (
  user: string = EXISTING_USER_NAME,
  password: string = EXISTING_USER_PASSWORD,
) => {
  return await execPromisified(
    `${OP_PATH} account:signin -u ${user} -p ${password}`,
  )
}
const signout = async () => {
  return await execPromisified(`${OP_PATH} account:signout`)
}

export { run, sleep, cleanup, signin, signout }

