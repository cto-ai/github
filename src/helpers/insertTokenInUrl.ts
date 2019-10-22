/**
 * Insert token in github url
 * @param {string} repoUrl
 * @param {string} token
 * @returns url with token
 */
export const insertTokenInUrl = (repoUrl: string, token: string): string => {
  const pos = 8 // insert token after https://
  return `${repoUrl.slice(0, pos)}${token}@${repoUrl.slice(pos)}`
}
