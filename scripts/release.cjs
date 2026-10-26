// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'release');
for (const name of ['dist', 'release-icons', 'release']) {
  const target = path.resolve(root, name);
  if (path.dirname(target) !== root || !['dist', 'release-icons', 'release'].includes(path.basename(target))) throw Error('Unsafe release path');
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isSymbolicLink() || fs.realpathSync(target) !== target) throw Error('Release folder must not be a link: ' + target);
    console.log('Removing previous build: ' + target);
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
  }
}
const builder = require.resolve('electron-builder/cli.js');
const result = spawnSync(process.execPath, [builder, '--win', 'nsis', 'portable', '--publish', 'never', '--config.directories.output=' + output], { cwd: root, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
if (result.error) console.error(result.error.message);
