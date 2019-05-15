"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const globby = require("globby");
const puppeteer = require("puppeteer");
const logger_1 = require("../utils/logger");
const sdk_utils_1 = require("../utils/sdk-utils");
class StaticSnapshotService {
    constructor(options) {
        this.server = null;
        this.app = express();
        this.options = options;
        this.app.use(cors());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json({ limit: '50mb' }));
        this.app.use(options.baseUrl, express.static(options.snapshotDirectory));
    }
    async start() {
        logger_1.default.info(`serving static site at ${this._buildLocalUrl()}`);
        this.server = await this.app.listen(this.options.port);
    }
    async snapshotAll() {
        logger_1.default.debug('taking snapshots of static site');
        const browser = await puppeteer.launch({
            args: ['--no-sandbox'],
            handleSIGINT: false,
        });
        const percyAgentClientFilename = sdk_utils_1.agentJsFilename();
        const page = await browser.newPage();
        const pageUrls = await this._buildPageUrls();
        for (const url of pageUrls) {
            logger_1.default.debug(`visiting ${url}`);
            await page.goto(url);
            await page.addScriptTag({
                path: percyAgentClientFilename,
            });
            await page.evaluate((name) => {
                const percyAgentClient = new PercyAgent();
                return percyAgentClient.snapshot(name);
            }, url);
        }
        browser.close();
    }
    async stop() {
        if (this.server) {
            await this.server.close();
        }
        logger_1.default.info(`shutting down static site at ${this._buildLocalUrl()}`);
    }
    _buildLocalUrl() {
        return `http://localhost:${this.options.port}${this.options.baseUrl}`;
    }
    async _buildPageUrls() {
        const baseUrl = this._buildLocalUrl();
        const pageUrls = [];
        const globOptions = {
            cwd: this.options.snapshotDirectory,
            ignore: this.options.ignoreGlobs,
        };
        const paths = await globby(this.options.snapshotGlobs, globOptions);
        for (const path of paths) {
            pageUrls.push(baseUrl + path);
        }
        return pageUrls;
    }
}
exports.default = StaticSnapshotService;
