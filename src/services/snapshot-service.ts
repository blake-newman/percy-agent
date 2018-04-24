import PercyClientService from './percy-client-service'
import RequestService from './request-service'
import logger from '../utils/logger'

export default class SnapshotService extends PercyClientService {
  async createSnapshot(
    buildId: number,
    name: string,
    rootResourceUrl: string,
    domSnapshot: string = '',
    requestManifest: string[] = [],
    enableJavaScript: boolean = false,
    widths: number[] = [1280],
    minimumHeight: number = 500,
  ): Promise<number | null> {
    let rootResource = this.percyClient.makeResource({
      resourceUrl: this.parseUrlPath(rootResourceUrl),
      content: domSnapshot,
      isRoot: true,
      mimetype: 'text/html',
    })

    let resources = [rootResource]

    if (requestManifest) {
      let requestService = new RequestService()
      let requestResources = await requestService.processManifest(requestManifest)
      resources = resources.concat(requestResources)
    }

    let snapshotId: number | null = null

    await this.percyClient.createSnapshot(
      buildId, resources, {name, widths, enableJavaScript, minimumHeight}
    ).then(async (response: any) => {
      snapshotId = parseInt(response.body.data.id)
      logger.info(`SnapshotService#createSnapshot[Snapshot ${snapshotId}] created`)

      logger.info(`SnapshotService#createSnapshot[Snapshot ${snapshotId}] uploading missing resources...`)

      await this.percyClient.uploadMissingResources(buildId, response, resources).then(() => {
        logger.info(`SnapshotService#createSnapshot[Snapshot ${snapshotId}] done uploading missing resources`)
        return snapshotId
      })
    }, (error: any) => {
      logger.error(`SnapshotService#createSnapshot ${error}`)
    })

    logger.info(`SnapshotService#createSnapshot returning ${snapshotId}`)
    return snapshotId
  }

  async finalizeSnapshot(snapshotId: number): Promise<boolean> {
    let response = await this.percyClient.finalizeSnapshot(snapshotId)
      .then(() => {
        logger.info(`SnapshotService#finalizeSnapshot[Snapshot ${snapshotId}]: finalized`)
        return true
      }, (error: any) => {
        logger.error(`SnapshotService#finalizeSnapshot: ${error}`)
        return false
      })

    return response
  }
}
