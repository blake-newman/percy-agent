import {flags} from '@oclif/command'
import Axios from 'axios'
import {logError} from '../utils/logger'
import PercyCommand from './percy-command'

export default class Stop extends PercyCommand {
  static description = 'Stops the percy process.'
  static hidden = true

  static examples = [
    '$ percy stop\n' +
    'info: percy has stopped.',
  ]

  static flags = {
    port: flags.integer({
      char: 'p',
      default: 5338,
      description: 'port',
    }),
  }

  async run() {
    await super.run()

    // If Percy is disabled or is missing a token, gracefully exit here
    if (!this.percyWillRun()) { this.exit(0) }

    const {flags} = this.parse(Stop)
    const port = flags.port ? flags.port : 5338

    if (this.processService.isRunning()) {
      await this.postToRunningAgent('/percy/stop', port)
    } else {
      this.logger.warn('percy is already stopped.')
    }
  }

  private async postToRunningAgent(path: string, port: number) {
    await Axios(`http://localhost:${port}${path}`, {method: 'POST'})
      .catch((error: any) => {
        if (error.message === 'socket hang up') { // We expect a hangup
          this.logger.info('percy stopped.')
        } else {
          logError(error)
        }
      })
  }
}
