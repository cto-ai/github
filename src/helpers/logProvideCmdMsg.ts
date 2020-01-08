import { ux } from '@cto.ai/sdk'

const getTable = async commands => {
  const data = Object.keys(commands).map(item => {
    return {
      name: ` ${ux.colors.callOutCyan(item)}`,
      description: `  ${ux.colors.secondary(commands[item].description)}`,
    }
  })
  await ux.table(
    data,
    {
      name: {},
      description: {},
    },
    {
      'no-header': true,
    },
  )
}

export const logProvideCmdMsg = async commands => {
  const msgPre = `\n☝️  ${ux.colors.primary(
    `Please provide a command to run github op:\n👉 ${ux.colors.multiPurple(
      'ops run github <command>',
    )}`,
  )}\n\n${ux.colors.actionBlue(
    `Here's a list of all the commands that we support →`,
  )}\n`
  const msgPost = `\n➡️  Try cloning a repo using ${ux.colors.multiPurple(
    'ops run github repo:clone',
  )} to get started!\n`
  await ux.print(msgPre)
  // ux.table returns void but console logs the table
  await getTable(commands)
  await ux.print(msgPost)
}
