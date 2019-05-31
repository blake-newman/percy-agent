import { flags } from '@oclif/command';
import PercyCommand from './percy-command';
export default class Snapshot extends PercyCommand {
    static description: string;
    static hidden: boolean;
    static args: {
        name: string;
        description: string;
        required: boolean;
    }[];
    static examples: string[];
    static flags: {
        'snapshot-files': flags.IOptionFlag<string | undefined>;
        'ignore-files': flags.IOptionFlag<string | undefined>;
        'base-url': flags.IOptionFlag<string | undefined>;
        'network-idle-timeout': import("@oclif/parser/lib/flags").IOptionFlag<number | undefined>;
        'port': import("@oclif/parser/lib/flags").IOptionFlag<number | undefined>;
    };
    run(): Promise<void>;
}
