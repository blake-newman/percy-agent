"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let responseCache = {};
/**
 * Keep an in-memory cache of asset responses.
 *
 * When enabled, asset responses will be kept in memory. When the asset is
 * re-requested, it will be responsed with what the cached response. This makes
 * it so servers aren't being hounded for the same asset over and over again.
 */
async function cacheResponse(response, logger) {
    const responseUrl = response.url();
    const statusCode = response.status();
    if (!!responseCache[responseUrl]) {
        logger.debug(`Asset already in cache ${responseUrl}`);
        return;
    }
    if (![200, 201].includes(statusCode)) {
        return;
    }
    try {
        const buffer = await response.buffer();
        responseCache[responseUrl] = {
            status: response.status(),
            headers: response.headers(),
            body: buffer,
        };
        logger.debug(`Added ${responseUrl} to asset discovery cache`);
    }
    catch (error) {
        logger.debug(`Could not cache response ${responseUrl}: ${error}`);
    }
}
exports.cacheResponse = cacheResponse;
function getResponseCache(url) {
    return responseCache[url];
}
exports.getResponseCache = getResponseCache;
function _setResponseCache(newResponseCache) {
    responseCache = newResponseCache;
    return responseCache;
}
exports._setResponseCache = _setResponseCache;
