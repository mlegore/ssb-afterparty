var MultiServer = require('multiserver')
var muxrpc = require('muxrpc')
var pull = require('pull-stream')
var plugify = require('./plugify')
const {syncToAsync} = require('./util')

module.exports = function (inputRemote, inputChannels, outputChannels, forward, cb) {
  if (!cb && 'function' === typeof forward) {
    cb = forward
    forward = true
  }

  var ms = MultiServer(inputChannels)

  // connect to the pipe input
  ms.client(inputRemote, function (err, stream) {
    var sbot = muxrpc((err, manifest, sbot) => {
      var close, started

      // If we forward piped in methods, include them in the _manifest
      // otherwise exclude them, so they're local methods only
      if (forward)
        sbot.manifest = syncToAsync(manifest)

      sbot = plugify(sbot)

      var api = {
        start () {
          started = true

          // Wrap api in another object to override manifest as a getter
          // without changing api exposed to plugins
          var serveApi = {
            manifest (cb) {
              cb(null, sbot.manifest)
            }
          }

          serveApi.__proto__ = sbot

          // create an rpc server to output
          var ms = MultiServer(outputChannels)
          close = ms.server(function (stream) {
            var pipe = muxrpc(null, sbot.manifest) (serveApi)
            pull(stream, pipe.createStream(), stream)
          })
        },
        close () {
          if (close) {
            close()
            close = null
          }
        },
        use (plugin, overwrite) {
          if (started)
            throw new Error('pipe already started, cannot load plugins anymore')
          sbot.use(plugin, overwrite)
        }
      }

      cb(null, api)
    }) ()

    pull(stream, sbot.createStream(), stream)
  })
}
