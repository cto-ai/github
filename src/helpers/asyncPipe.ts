// based on https://github.com/obengwilliam/pipeawait

const asyncPipe = (...fns: Function[]) => (param?: any) =>
  fns.reduce(async (acc, fn) => fn(await acc), param)

const _trace = (msg: string) => (x: any) => {
  console.log(msg, x)
  return x
}

export { asyncPipe, _trace }
