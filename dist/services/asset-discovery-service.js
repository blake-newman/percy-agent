"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pool = require("generic-pool");
const puppeteer = require("puppeteer");
const logger_1 = require("../utils/logger");
const wait_for_network_idle_1 = require("../utils/wait-for-network-idle");
const percy_client_service_1 = require("./percy-client-service");
const response_service_1 = require("./response-service");
class AssetDiscoveryService extends percy_client_service_1.default {
    constructor(buildId, options = {}) {
        super();
        this.DEFAULT_NETWORK_IDLE_TIMEOUT = 50; // ms
        this.MAX_SNAPSHOT_WIDTHS = 10;
        // Default widths to use for asset discovery. Must match Percy service defaults.
        this.DEFAULT_WIDTHS = [1280, 375];
        this.responseService = new response_service_1.default(buildId);
        this.networkIdleTimeout = options.networkIdleTimeout || this.DEFAULT_NETWORK_IDLE_TIMEOUT;
        this.browser = null;
        this.pool = null;
    }
    async setup() {
        logger_1.profile('-> assetDiscoveryService.setup');
        const browser = this.browser = await this.createBrowser();
        this.pool = await this.createPagePool(() => {
            return this.createPage(browser);
        }, this.DEFAULT_WIDTHS.length, this.MAX_SNAPSHOT_WIDTHS);
        logger_1.profile('-> assetDiscoveryService.setup');
    }
    async createBrowser() {
        logger_1.profile('-> assetDiscoveryService.puppeteer.launch');
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-web-security',
            ],
            ignoreHTTPSErrors: true,
            handleSIGINT: false,
        });
        logger_1.profile('-> assetDiscoveryService.puppeteer.launch');
        return browser;
    }
    async createPagePool(exec, min, max) {
        logger_1.profile('-> assetDiscoveryService.createPagePool');
        const result = pool.createPool({
            create() {
                return exec();
            },
            destroy(page) {
                return page.close();
            },
        }, { min, max });
        logger_1.profile('-> assetDiscoveryService.createPagePool');
        return result;
    }
    async createPage(browser) {
        logger_1.profile('-> assetDiscoveryService.browser.newPage');
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        logger_1.profile('-> assetDiscoveryService.browser.newPage');
        return page;
    }
    async discoverResources(rootResourceUrl, domSnapshot, options) {
        logger_1.profile('-> assetDiscoveryService.discoverResources');
        if (this.browser === null) {
            logger_1.default.error('Puppeteer failed to open browser.');
            return [];
        }
        if (!this.pool) {
            logger_1.default.error('Failed to create pool of pages.');
            return [];
        }
        if (options.widths && options.widths.length > this.MAX_SNAPSHOT_WIDTHS) {
            logger_1.default.error(`Too many widths requested. Max is ${this.MAX_SNAPSHOT_WIDTHS}. Requested: ${options.widths}`);
            return [];
        }
        rootResourceUrl = this.parseRequestPath(rootResourceUrl);
        logger_1.default.debug(`discovering assets for URL: ${rootResourceUrl}`);
        const enableJavaScript = options.enableJavaScript || false;
        const widths = options.widths || this.DEFAULT_WIDTHS;
        // Do asset discovery for each requested width in parallel. We don't keep track of which page
        // is doing work, and instead rely on the fact that we always have fewer widths to work on than
        // the number of pages in our pool. If we wanted to do something smarter here, we should consider
        // switching to use puppeteer-cluster instead.
        logger_1.profile('--> assetDiscoveryService.discoverForWidths', { url: rootResourceUrl });
        const resourcePromises = [];
        for (const width of widths) {
            const promise = this.resourcesForWidth(this.pool, width, domSnapshot, rootResourceUrl, enableJavaScript);
            resourcePromises.push(promise);
        }
        const resourceArrays = await Promise.all(resourcePromises);
        let resources = [].concat(...resourceArrays);
        logger_1.profile('--> assetDiscoveryService.discoverForWidths');
        const resourceUrls = [];
        // Dedup by resourceUrl as they must be unique when sent to Percy API down the line.
        resources = resources.filter((resource) => {
            if (!resourceUrls.includes(resource.resourceUrl)) {
                resourceUrls.push(resource.resourceUrl);
                return true;
            }
            return false;
        });
        logger_1.profile('-> assetDiscoveryService.discoverResources', { resourcesDiscovered: resources.length });
        return resources;
    }
    shouldRequestResolve(request) {
        const requestPurpose = request.headers().purpose;
        switch (requestPurpose) {
            case 'prefetch':
            case 'preload':
            case 'dns-prefetch':
            case 'prerender':
            case 'preconnect':
            case 'subresource':
                return false;
            default:
                return true;
        }
    }
    async teardown() {
        await this.cleanPool();
        await this.closeBrowser();
    }
    async resourcesForWidth(pool, width, domSnapshot, rootResourceUrl, enableJavaScript) {
        logger_1.default.debug(`discovering assets for width: ${width}`);
        logger_1.profile('--> assetDiscoveryService.pool.acquire', { url: rootResourceUrl });
        const page = await pool.acquire();
        logger_1.profile('--> assetDiscoveryService.pool.acquire');
        await page.setJavaScriptEnabled(enableJavaScript);
        await page.setViewport(Object.assign(page.viewport(), { width }));
        page.on('request', async (request) => {
            try {
                if (!this.shouldRequestResolve(request)) {
                    await request.abort();
                    return;
                }
                if (request.url() === rootResourceUrl) {
                    await request.respond({
                        body: domSnapshot,
                        contentType: 'text/html',
                        status: 200,
                    });
                    return;
                }
                await request.continue();
            }
            catch (error) {
                logger_1.logError(error);
            }
        });
        const maybeResourcePromises = [];
        // Listen on 'requestfinished', which tells us a request completed successfully.
        // We could also listen on 'response', but then we'd have to check if it was successful.
        page.on('requestfinished', async (request) => {
            const response = request.response();
            if (response) {
                // Parallelize the work in processResponse as much as possible, but make sure to
                // wait for it to complete before returning from the asset discovery phase.
                const promise = this.responseService.processResponse(rootResourceUrl, response, width);
                promise.catch(logger_1.logError);
                maybeResourcePromises.push(promise);
            }
            else {
                logger_1.default.debug(`No response for ${request.url()}. Skipping.`);
            }
        });
        // Debug log failed requests.
        page.on('requestfailed', async (request) => {
            logger_1.default.debug(`Failed to load ${request.url()} : ${request.failure().errorText}}`);
        });
        try {
            logger_1.profile('--> assetDiscoveryService.page.goto', { url: rootResourceUrl });
            await page.goto(rootResourceUrl);
            logger_1.profile('--> assetDiscoveryService.page.goto');
            logger_1.profile('--> assetDiscoveryService.waitForNetworkIdle');
            await wait_for_network_idle_1.default(page, this.networkIdleTimeout);
            logger_1.profile('--> assetDiscoveryService.waitForNetworkIdle');
            logger_1.profile('--> assetDiscoveryServer.waitForResourceProcessing');
            const maybeResources = await Promise.all(maybeResourcePromises);
            logger_1.profile('--> assetDiscoveryServer.waitForResourceProcessing');
            logger_1.profile('--> assetDiscoveryService.pool.release', { url: rootResourceUrl });
            await page.removeAllListeners('request');
            await page.removeAllListeners('requestfinished');
            await page.removeAllListeners('requestfailed');
            await pool.release(page);
            logger_1.profile('--> assetDiscoveryService.pool.release');
            return maybeResources.filter((maybeResource) => maybeResource != null);
        }
        catch (error) {
            logger_1.logError(error);
        }
        return [];
    }
    async cleanPool() {
        if (this.pool === null) {
            return;
        }
        await this.pool.drain();
        await this.pool.clear();
        this.pool = null;
    }
    async closeBrowser() {
        if (this.browser === null) {
            return;
        }
        await this.browser.close();
        this.browser = null;
    }
}
exports.default = AssetDiscoveryService;
