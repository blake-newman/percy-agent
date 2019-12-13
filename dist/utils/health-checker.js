"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const retryAxios = require("retry-axios");
const agent_service_constants_1 = require("../services/agent-service-constants");
const logger_1 = require("./logger");
async function healthCheck(port = agent_service_constants_1.DEFAULT_PORT, retryOptions) {
    const healthcheckUrl = `http://localhost:${port}${agent_service_constants_1.HEALTHCHECK_PATH}`;
    const retryConfig = Object.assign({ retry: 5, retryDelay: 500, shouldRetry: () => true }, retryOptions);
    const axiosInstance = axios_1.default.create({ raxConfi: retryConfig });
    const interceptorId = retryAxios.attach(axiosInstance);
    await axiosInstance.get(healthcheckUrl).then(() => {
        logger_1.default.info('percy is ready.');
    }).catch((error) => {
        logger_1.default.error(`Failed to establish a connection with ${healthcheckUrl}`);
        logger_1.default.debug(error);
    });
    retryAxios.detach(interceptorId);
}
exports.default = healthCheck;