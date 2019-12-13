"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const spawn = require("cross-spawn");
const which = require("which");
const configuration_1 = require("../configuration/configuration");
const configuration_2 = require("../utils/configuration");
const percy_command_1 = require("./percy-command");
class Exec extends percy_command_1.default {
    async run() {
        await super.run();
        const { argv, flags } = this.parse(Exec);
        const command = argv.shift();
        if (!command) {
            this.logger.info('You must supply a command to run after --');
            this.logger.info('Example:');
            this.logger.info('$ percy exec -- echo "run your test suite"');
            return this.exit(1);
        }
        if (which.sync(command, { nothrow: true }) == null) {
            this.logger.error(`Error: command not found "${command}"`);
            return this.exit(127);
        }
        if (this.percyWillRun()) {
            await this.start(configuration_2.default(flags));
        }
        // Even if Percy will not run, continue to run the subprocess
        await new Promise((resolve, reject) => {
            const spawnedProcess = spawn(command, argv, { stdio: 'inherit' });
            spawnedProcess.on('exit', resolve);
            spawnedProcess.on('error', reject);
        }).catch((error) => {
            // catch subprocess errors
            this.logger.error(error.toString());
            return 1;
        }).then((code) => {
            // oclif exit raises an error to stop script execution, so the following
            // stop method cannot be used inside of the subprocess event handlers
            // which would warn about an uncaught promise
            return this.stop(code);
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
    'allowed-hostname': command_1.flags.string({
        char: 'h',
        description: 'Allowable hostname(s) to capture assets from',
        multiple: true,
    }),
    'network-idle-timeout': command_1.flags.integer({
        char: 't',
        description: [
            `[default: ${configuration_1.DEFAULT_CONFIGURATION.agent['asset-discovery']['network-idle-timeout']}]`,
            'Asset discovery network idle timeout (in milliseconds)',
        ].join(' '),
    }),
    'cache-responses': command_1.flags.boolean({
        description: [
            `[default: ${configuration_1.DEFAULT_CONFIGURATION.agent['asset-discovery']['cache-responses']}]`,
            'Enable caching network responses for asset discovery (experimental)',
        ].join(' '),
    }),
    'port': command_1.flags.integer({
        char: 'p',
        description: [
            `[default: ${configuration_1.DEFAULT_CONFIGURATION.agent.port}]`,
            'Port',
        ].join(' '),
    }),
    'config': command_1.flags.string({
        char: 'c',
        description: 'Path to percy config file',
    }),
};
exports.default = Exec;