var muxrpc = require('muxrpc')
var pull = require('pull-stream')
var Obv = require('obv')
var plugify = require('./plugify')

const {syncToAsync} = require('./util')

module.exports = function (inputChannel, outputChannel, forward) {
  // muxrpc factory method, wait until muxrpc api is ready, then connect
  // any streams that are waiting, and wait for more connections
  var outputApi = Obv()
  function onConnect (stream) {
    if(outputApi.value) {
      var pipe = muxrpc(null, outputApi.value.manifest) (outputApi.value.api)
      pull(stream, pipe.createStream(), stream)
    } else {
      outputApi.once(val => {
        var pipe = muxrpc(null, val.manifest) (val.api)
        pull(stream, pipe.createStream(), stream)
      })
    }
  }

  // If outputChannel is a duplex stream, just use that, otherwise
  // connect the outputChannel to the muxrpc factory
  if (outputChannel.sink && outputChannel.source) {
    onConnect(outputChannel)
  } else {
    outputChannel(onConnect)
  }

  return new Promise(function (resolve, reject) {
    // connect to the pipe input
    var sbot = muxrpc((err, manifest, sbot) => {
      if (err) {
        return reject(err)
      }

      // If we forward piped in methods, include them in the manifest
      // otherwise exclude them, so they're local methods only
      if (forward)
        sbot.manifest = syncToAsync(manifest)

      sbot = plugify(sbot)
      var started
      var createPipe = function (options) {
        started = true

        // Wrap api in another object to override manifest as a getter
        // without changing api exposed to plugins
        var serveApi = {
          manifest (cb) {
            cb(null, sbot.manifest)
          }
        }

        serveApi.__proto__ = sbot

        // set the api to be served, which should then start hooking
        // up active connects to the rpc endpoint
        outputApi.set({manifest: sbot.manifest, api: serveApi})
        return sbot
      }

      createPipe.close = function () {
        if (outputChannel.close) {
          outputChannel.close()
        }
      }
      createPipe.use = function (plugin, overwrite) {
        if (started)
          throw new Error('pipe already started, cannot load plugins anymore')
        sbot.use(plugin, overwrite)
      }

      resolve(createPipe)
    }) ()

    if (inputChannel.then) {
      inputChannel.then(function (stream) {
        pull(stream, sbot.createStream(), stream)
      }, reject)
    } else {
      pull(inputChannel, sbot.createStream(), inputChannel)
    }
  })
}
