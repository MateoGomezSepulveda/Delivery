#!/usr/bin/env node
const { spawn } = require('node:child_process');
const path = require('node:path');

const compatPath = path.resolve(__dirname, 'node-compat.cjs');
require(compatPath);

const quotedCompat = compatPath.includes(' ')
  ? `"${compatPath.replace(/\\/g, '/')}"`
  : compatPath.replace(/\\/g, '/');

const existingNodeOptions = process.env.NODE_OPTIONS || '';
const requireFlag = `--require ${quotedCompat}`;
const nextNodeOptions = existingNodeOptions.includes('node-compat.cjs')
  ? existingNodeOptions
  : `${existingNodeOptions} ${requireFlag}`.trim();

const expoCliBin = require.resolve('expo/bin/cli');
const args = process.argv.slice(2);

const child = spawn(process.execPath, [expoCliBin, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: nextNodeOptions,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
