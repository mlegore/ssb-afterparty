# ssb-afterparty

Tools to allow ssb clients to spawn processes to add plugins and views to an already existing sbot instance.

## Components

### index.js

This class takes an input channel and output channel and gives you a promise to an extendable sbot pipe to attach plugins to

### plugify.js & flume.js

These modules emulate sbot's plugin system and flumeDb for view creation (provides use and \_flumeUse methods)

### connect.js

This module provides methods to augment a running client instance by attaching a view channel or api.
pipeIn(api, clientChannel) takes an input channel and augments the passed in api with the methods available over the channel.
pipeOut(api, manifest, serveChannel) creates a muxrpc service and connects it to a channel.
fromInputChannel(clientChannel) creates a new api muxrpc from a channel
toOutputStream(api, manifest) creates a muxrpc service channel from an api
inStream(api, overwriteOpts, cb) creates a stream that when pulled to, extends api, easy to pass this around, cb is called when the api has been extended

    //
    // In the main thread
    //
    import afterparty from 'ssb-afterparty'
    import msChannel from 'ssb-afterparty/channels/multiserver'
    import ws from 'multiserver/plugins/ws'

    // Using async because it's nice, but you can use promise notation here too
    async function setup(api, manifest) {
      var inWs = ws({port: 1234})
      var outWs = ws({port: 1235})

      // To serve an api out to a pipe
      var toPipe = ms.server(inWs)
      pipeOut(api, manifest, toPipe)

      // To merge in methods provided by a pipe
      var fromPipe = ms.client('ws://localhost:1235', outWs)
      var sbot = await pipeIn(api, fromPipe)

      // Now you can use more plugins
      sbot.about.get((err, val) => {
        // access your plugins here        
      })    
    }

    //
    // In the worker/separate thread
    //
    import afterparty from 'ssb-afterparty'
    import msChannel from 'ssb-afterparty/channels/multiserver'
    import ws from 'multiserver/plugins/ws'

    async function setup() {
      // Create channel from sbot or elsewhere
      var inputToPipe = msChannel.client('ws://localhost:1234', ws({port: 1234})

      // Create channel to a multiserver to serve
      var outputFromPipe = msChannel.server(ws({port: 1235})

      // Pass this argument to tell whether to forward all methods through, or
      // only new methods
      var forward = false

      var sbot = await afterparty(inputToPipe, outputFromPipe, forward)

      sbot.use(require('ssb-private'), overwrite: true)
          .use(require('ssb-about'))

      sbot()
    }
