"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const constants_1 = require("../services/constants");
const static_snapshot_service_1 = require("../services/static-snapshot-service");
const logger_1 = require("../utils/logger");
const percy_command_1 = require("./percy-command");
class Snapshot extends percy_command_1.default {
    async run() {
        await super.run();
        const { args, flags } = this.parse(Snapshot);
        const snapshotDirectory = args.snapshotDirectory;
        const port = flags.port;
        const staticServerPort = port + 1;
        const networkIdleTimeout = flags['network-idle-timeout'];
        const baseUrl = flags['base-url'];
        const rawIgnoreGlob = flags['ignore-files'];
        const rawSnapshotGlob = flags['snapshot-files'];
        const snapshotGlobs = rawSnapshotGlob.split(',');
        const ignoreGlobs = rawIgnoreGlob ? rawIgnoreGlob.split(',') : [];
        // exit gracefully if percy will not run
        if (!this.percyWillRun()) {
            this.exit(0);
        }
        // check that the base url passed in starts with a slash and exit if it is missing
        if (baseUrl[0] !== '/') {
            logger_1.default.warn('The base-url flag must begin with a slash.');
            this.exit(1);
        }
        // start the agent service
        await this.agentService.start({ port, networkIdleTimeout });
        this.logStart();
        const options = {
            port: staticServerPort,
            snapshotDirectory,
            baseUrl,
            snapshotGlobs,
            ignoreGlobs,
        };
        const staticSnapshotService = new static_snapshot_service_1.default(options);
        // start the snapshot service
        await staticSnapshotService.start();
        // take the snapshots
        await staticSnapshotService.snapshotAll();
        // stop the static snapshot and agent services
        await staticSnapshotService.stop();
        await this.agentService.stop();
    }
}
Snapshot.description = 'Snapshot a directory containing a pre-built static website';
Snapshot.hidden = false;
Snapshot.args = [{
        name: 'snapshotDirectory',
        description: 'A path to the directory you would like to snapshot',
        required: true,
    }];
Snapshot.examples = [
    '$ percy snapshot _site/',
    '$ percy snapshot _site/ --base-url "/blog"',
    '$ percy snapshot _site/ --ignore-files "/blog/drafts/**"',
];
Snapshot.flags = {
    'snapshot-files': command_1.flags.string({
        char: 's',
        description: 'Glob or comma-seperated string of globs for matching the files and directories to snapshot.',
        default: '**/*.html,**/*.htm',
    }),
    'ignore-files': command_1.flags.string({
        char: 'i',
        description: 'Glob or comma-seperated string of globs for matching the files and directories to ignore.',
        default: '',
    }),
    'base-url': command_1.flags.string({
        char: 'b',
        description: 'If your static files will be hosted in a subdirectory, instead \n' +
            'of the webserver\'s root path, set that subdirectory with this flag.',
        default: '/',
    }),
    // from exec command. needed to start the agent service.
    'network-idle-timeout': command_1.flags.integer({
        char: 't',
        default: constants_1.default.NETWORK_IDLE_TIMEOUT,
        description: 'Asset discovery network idle timeout (in milliseconds)',
    }),
    'port': command_1.flags.integer({
        char: 'p',
        default: constants_1.default.PORT,
        description: 'Port',
    }),
};
exports.default = Snapshot;
