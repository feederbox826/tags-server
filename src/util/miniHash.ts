export const toMiniHash = (fullHash: string): string =>
  Buffer.from(fullHash, 'hex').toString('base64url')

export const toFullHash = (miniHash: string): string =>
  Buffer.from(miniHash as string, 'base64url').toString('hex')