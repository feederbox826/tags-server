import Fuse from 'fuse.js'
// create fuse index

export const fuseOptions = {
  keys: ['name', 'aliases'],
  threshold: 0.4,
  shouldSort: true,
  findAllMatches: true,
  minMatchCharLength: 2
}