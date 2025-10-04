# server backend
## architecture
express + sqlite
## storage
- last-modified
- hashing
  - stashapp always uses md5
  - b2 uses sha1
- stashid
- name, alises (stashdb)
  - use last-modified of stashdb
## lookup
- image routing
  - /optimized
  - /b2

# processing
- webp-watch

## sync
- sync manager
  - download from stash over VPN
  - manage discrepancies btw local/ remote


# sub-projects
https://github.com/feederbox826/webp-watcher
https://github.com/feederbox826/stash-tag-sync