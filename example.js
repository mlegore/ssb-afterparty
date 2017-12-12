import afterparty from 'ssb-afterparty'
import {net} from 'multiserver/net'
import {workerChannel, workerReady} from 'ssb-afterparty'

// Example is WIP, subject to change
var sbot = afterparty('worker://channelA',
  [workerChannel('channelA')],
  [workerChannel('channelB')],
  workerReady)

sbot.use(require('ssb-private'), overwrite: true)
    .use(require('ssb-patchwork'))

sbot.start()
