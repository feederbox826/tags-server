import { PathLike, createReadStream } from "fs";
import crypto from "crypto";

type hashType = "md5" | "sha1"

export function multiHash(file: PathLike, algos: hashType[] = ["md5", "sha1"]): Promise<Record<hashType, string>> {
  const fileStream = createReadStream(file);
  return new Promise((resolve, reject) => {
    const hashes = algos.map((algo) => crypto.createHash(algo))
    fileStream.on('data', (data) => hashes.forEach((hash) => hash.update(data)))
    fileStream.on('end', () => {
      const result: Partial<Record<hashType, string>> = {}
      hashes.forEach((hash, index) => {
        const algo = algos[index]
        result[algo] = hash.digest("base64url")
      })
      resolve(result as Record<hashType, string>)
    })
    fileStream.on('error', (err) => reject(err))
  })
}