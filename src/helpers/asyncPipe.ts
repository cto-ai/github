import { ux } from "@cto.ai/sdk"

// based on https://github.com/obengwilliam/pipeawait

const asyncPipe = (...fns: Function[]) => (param?: any) =>
  fns.reduce(async (acc, fn) => fn(await acc), param)

const _trace = (msg: string) => (x: any) => {
  //TODO: this should/should not be async
  ux.print(msg + ' ' + x)
  return x
}

export { asyncPipe, _trace }
