import {describe} from 'mocha'
import Start from '../../src/commands/start'
import Stop from '../../src/commands/stop'
import * as chai from 'chai'
import {captureStdOut} from '../helpers/stdout'
const expect = chai.expect

describe('Stop', () => {
  beforeEach(async () => {
    await captureStdOut(async () => Start.run([]))
  })

  describe('#stop', () => {
    it('stops percy agent gracefully', async () => {
      let stdout = await captureStdOut(async () => {
        await Stop.run([])
      })

      expect(stdout).to.match(/info: gracefully stopping percy-agent\[\d+\]/)
    })

    it('stops percy agent forcefully', async () => {
      let stdout = await captureStdOut(async () => {
        await Stop.run(['--force'])
      })

      expect(stdout).to.match(/info: forcefully stopping percy-agent\[\d+\]/)
    })

    it('warns you when percy agent is already stopped', async () => {
      await captureStdOut(async () => {
        await Stop.run([])
      })

      let stdout = await captureStdOut(async () => {
        await Stop.run([])
      })

      expect(stdout).to.match(/warn: percy-agent is already stopped/)
    })
  })
})
