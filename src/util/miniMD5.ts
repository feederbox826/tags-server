export type fullMD5 = string & { __fullMD5: true }
export type miniMD5 = string & { __miniMD5: true }

export const toMiniMD5 = (md5: fullMD5): miniMD5 =>
  Buffer.from(md5, 'hex').toString('base64url') as miniMD5

export const toFullMD5 = (mini: miniMD5): fullMD5 =>
  Buffer.from(mini, 'base64url').toString('hex') as fullMD5