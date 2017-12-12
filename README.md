# ssb-afterparty

Tools to allow ssb clients to spawn processes to add plugins and views to an already existing sbot instance.

## Components

client.js

This class augments a running client instance with methods to attach views provided be another sbot view provider.

index.js

This class takes an input client and allows plugins to be attached to it (provides use and \_flumeUse methods)

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
