export type HashValue = string & { __brand: "HashValue" };
export type hashType = "md5" | "sha1"

export interface MiniHash<T extends hashType> {
  __hashType: "mini";
  __hashAlgorithm: T;
  value: HashValue;
}

export interface FullHash<T extends hashType> {
  __hashType: "full";
  __hashAlgorithm: T;
  value: HashValue;
}

export const toMiniHash = <T extends hashType>(hash: FullHash<T>): MiniHash<T> => ({
  __hashType: "mini",
  __hashAlgorithm: hash.__hashAlgorithm,
  value: Buffer.from(hash.value, 'hex').toString('base64url') as HashValue,
})

export const toFullHash = <T extends hashType>(mini: MiniHash<T>): FullHash<T> => ({
  __hashType: "full",
  __hashAlgorithm: mini.__hashAlgorithm,
  value: Buffer.from(mini.value, 'base64url').toString('hex') as HashValue,
})