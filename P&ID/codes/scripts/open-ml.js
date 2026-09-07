const path = require('path');
const { exec } = require('child_process');

const mlIndex = path.resolve(__dirname, '..', '..', '..', 'ML', 'index.html');
const quoted = `"${mlIndex}"`;

let cmd;
if (process.platform === 'win32') {
  cmd = `start "" ${quoted}`;
} else if (process.platform === 'darwin') {
  cmd = `open ${quoted}`;
} else {
  cmd = `xdg-open ${quoted}`;
}

exec(cmd, (err) => {
  if (err) {
    console.error('ML acilamadi:', mlIndex, err.message);
    process.exitCode = 1;
  }
});
