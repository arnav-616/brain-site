// Settings for Node scripts: who this brain belongs to and where the vault is (site.config.json).
// VAULT_PATH in the environment, or --vault <path> on the command line, still win.
import { readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const site = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'))

export function vaultPath(argv = process.argv) {
  const i = argv.indexOf('--vault')
  return resolve(root, i > -1 ? argv[i + 1] : process.env.VAULT_PATH || site.vaultPath)
}
