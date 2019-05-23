import { StaticSnapshotOptions } from './static-snapshot-options';
export default class StaticSnapshotService {
    readonly options: StaticSnapshotOptions;
    private readonly app;
    private server;
    constructor(options: StaticSnapshotOptions);
    start(): Promise<void>;
    snapshotAll(): Promise<void>;
    stop(): Promise<void>;
    _buildLocalUrl(): string;
    _buildPageUrls(): Promise<any>;
}
