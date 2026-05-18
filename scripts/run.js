// Strip ELECTRON_RUN_AS_NODE then run the specified command.
// Usage: node scripts/run.js <command> [args...]
// Must explicitly remove from env object because Windows cmd.exe
// re-reads system env vars from registry with shell:true.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const { spawn } = require('child_process');
const args = process.argv.slice(2);
const [cmd, ...cmdArgs] = args;

const child = spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  shell: true,
  env,
});
child.on('close', (code) => process.exit(code));
