import { PathLike, createReadStream } from "fs";
import { MiniHash, hashType, HashValue } from "./miniHash.js";
import crypto from "crypto";

export function multiHash(file: PathLike, algos: hashType[] = ["md5", "sha1"]): Promise<Record<hashType, MiniHash<hashType>>> {
  const fileStream = createReadStream(file);
  return new Promise((resolve, reject) => {
    const hashes = algos.map((algo) => crypto.createHash(algo))
    fileStream.on('data', (data) => hashes.forEach((hash) => hash.update(data)))
    fileStream.on('end', () => {
      const result: Partial<Record<hashType, MiniHash<hashType>>> = {}
      hashes.forEach((hash, index) => {
        const algo = algos[index]
        result[algo] = {
          __hashType: "mini",
          __hashAlgorithm: algo,
          value: hash.digest("base64url") as HashValue,
        }
      })
      resolve(result as Record<hashType, MiniHash<hashType>>)
    })
    fileStream.on('error', (err) => reject(err))
  })
}