const path = require('path');
const { exec } = require('child_process');

const cadIndex = path.resolve(__dirname, '..', '..', '..', 'CAD', 'index.html');
const quoted = `"${cadIndex}"`;

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
    console.error('CAD acilamadi:', cadIndex, err.message);
    process.exitCode = 1;
  }
});
