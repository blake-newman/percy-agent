import * as pool from 'generic-pool';
import * as puppeteer from 'puppeteer';
import { SnapshotOptions } from '../percy-agent-client/snapshot-options';
import PercyClientService from './percy-client-service';
import ResponseService from './response-service';
interface AssetDiscoveryOptions {
    networkIdleTimeout?: number;
}
export default class AssetDiscoveryService extends PercyClientService {
    responseService: ResponseService;
    browser: puppeteer.Browser | null;
    pagePool: pool.Pool<puppeteer.Page> | null;
    readonly DEFAULT_NETWORK_IDLE_TIMEOUT: number;
    networkIdleTimeout: number;
    readonly MAX_SNAPSHOT_WIDTHS: number;
    readonly PAGE_POOL_SIZE_MIN: number;
    readonly PAGE_POOL_SIZE_MAX: number;
    readonly DEFAULT_WIDTHS: number[];
    constructor(buildId: number, options?: AssetDiscoveryOptions);
    setup(): Promise<void>;
    createBrowser(): Promise<puppeteer.Browser>;
    createPagePool(exec: () => PromiseLike<puppeteer.Page>, min: number, max: number): Promise<pool.Pool<puppeteer.Page>>;
    createPage(browser: puppeteer.Browser): Promise<puppeteer.Page>;
    discoverResources(rootResourceUrl: string, domSnapshot: string, options: SnapshotOptions): Promise<any[]>;
    shouldRequestResolve(request: puppeteer.Request): boolean;
    teardown(): Promise<void>;
    private resourcesForWidth;
    private cleanPagePool;
    private closeBrowser;
}
export {};
