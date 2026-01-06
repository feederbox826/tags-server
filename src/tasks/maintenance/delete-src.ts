import debug from 'debug';
const log = debug('tags:tasks:delsrc');
const error = debug('tags:tasks:delsrc:error');
debug.enable('tags:*')

import { localDB, LocalFileEntry } from '../../storage/local-db.js';

function getLocalFilesWithSource(): LocalFileEntry[] {
  const rows = localDB.prepare('SELECT * FROM localfiles WHERE src = 1').all() as LocalFileEntry[];
  return rows;
}

const FILE_PATH = 'D:\\Workspace\\stashtag\\no-src'

export async function delHasSrc(dir: string) {
  const filesWithSrc = getLocalFilesWithSource();
  const fs = await import('fs/promises');
  const path = await import('path');

  for (const fileEntry of filesWithSrc) {
    const fullPath = path.join(dir, String(fileEntry.path));
    try {
      await fs.unlink(fullPath);
      log(`Deleted file with src: ${fileEntry.path}`);
    } catch (err) {
      if (err instanceof Error && (err as any).code === 'ENOENT') {
        continue; // file doesn't exist, skip
      }
      error(`Error deleting file ${fileEntry.path}: ${err}`);
    }
  }
}

// delHasSrc(FILE_PATH);