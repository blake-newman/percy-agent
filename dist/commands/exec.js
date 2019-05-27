"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const spawn = require("cross-spawn");
const constants_1 = require("../services/constants");
const percy_command_1 = require("./percy-command");
class Exec extends percy_command_1.default {
    async run() {
        await super.run();
        const { argv } = this.parse(Exec);
        const { flags } = this.parse(Exec);
        const port = flags.port;
        const networkIdleTimeout = flags['network-idle-timeout'];
        const command = argv.shift();
        if (!command) {
            this.logger.info('You must supply a command to run after --');
            this.logger.info('Example:');
            this.logger.info('$ percy exec -- echo "run your test suite"');
            return;
        }
        if (this.percyWillRun()) {
            await this.agentService.start({ port, networkIdleTimeout });
            this.logStart();
        }
        // Even if Percy will not run, continue to run the subprocess
        const spawnedProcess = spawn(command, argv, { stdio: 'inherit' });
        spawnedProcess.on('exit', async (code) => {
            if (this.percyWillRun()) {
                await this.agentService.stop();
            }
            process.exit(code);
        });
    }
}
Exec.description = 'Start and stop Percy around a supplied command.';
Exec.hidden = false;
Exec.strict = false;
Exec.examples = [
    '$ percy exec -- echo \"percy is running around this echo command\"',
    '$ percy exec -- bash -c "echo foo && echo bar"',
];
Exec.flags = {
    'network-idle-timeout': command_1.flags.integer({
        char: 't',
        default: constants_1.default.NETWORK_IDLE_TIMEOUT,
        description: 'asset discovery network idle timeout (in milliseconds)',
    }),
    'port': command_1.flags.integer({
        char: 'p',
        default: constants_1.default.PORT,
        description: 'port',
    }),
};
exports.default = Exec;
