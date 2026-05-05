// Strip ELECTRON_RUN_AS_NODE then run the specified command.
// Usage: node scripts/run.js <command> [args...]
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require('child_process');
const args = process.argv.slice(2);
const [cmd, ...cmdArgs] = args;

const child = spawn(cmd, cmdArgs, { stdio: 'inherit', shell: true });
child.on('close', (code) => process.exit(code));
