const path = require('path');
const { spawnSync } = require('child_process');

const targetDir = path.resolve(__dirname, '..', 'P&ID', 'codes');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function getNpmOriginalArgs() {
  try {
    const parsed = JSON.parse(process.env.npm_config_argv || '{}');
    return Array.isArray(parsed.original) ? parsed.original : [];
  } catch {
    return [];
  }
}

function resolveMode() {
  const cliArg = (process.argv[2] || '').toLowerCase();
  if (['ml', 'pid', 'both'].includes(cliArg)) {
    return cliArg;
  }

  const npmArgs = getNpmOriginalArgs().map((arg) => String(arg).toLowerCase());
  const startIdx = npmArgs.lastIndexOf('start');
  if (startIdx >= 0) {
    const next = npmArgs[startIdx + 1];
    if (['ml', 'pid', 'both'].includes(next)) {
      return next;
    }
  }

  return 'pid';
}

function runNpm(scriptArgs) {
  return spawnSync(npmCmd, scriptArgs, {
    cwd: targetDir,
    stdio: 'inherit',
    shell: true
  });
}

function ensurePidDeps() {
  const electronCli = path.join(targetDir, 'node_modules', 'electron', 'cli.js');
  const fs = require('fs');
  if (fs.existsSync(electronCli)) {
    return true;
  }

  console.log('Ilk calistirma: P&ID bagimliliklari yukleniyor (npm install)...');
  const install = runNpm(['install']);
  return (install.status ?? 1) === 0;
}

function launch(mode) {
  if (mode === 'ml') {
    return runNpm(['run', 'open:ml']);
  }

  if (mode === 'pid') {
    if (!ensurePidDeps()) {
      return { status: 1 };
    }
    return runNpm(['run', 'start:pid']);
  }

  if (mode === 'both') {
    if (!ensurePidDeps()) {
      return { status: 1 };
    }
    runNpm(['run', 'open:ml']);
    return runNpm(['run', 'start:pid']);
  }

  console.error('Gecersiz mod. Kullanim: npm start ml | npm start pid | npm start both');
  console.error('Alternatif: npm run ml | npm run pid | npm run both');
  return { status: 1 };
}

const mode = resolveMode();
const result = launch(mode);
process.exit(result.status ?? 1);
