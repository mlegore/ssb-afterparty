var MultiServer = require('multiserver')
var muxrpc = require('muxrpc')
var pull = require('pull-stream')

module.exports = function (inputRemote, inputChannels, outputChannels, cb) {

  var ms = MultiServer(inputChannels)

  // connect to the pipe input
  ms.client(inputRemote, function (err, stream) {
    var sbot = muxrpc((err, manifest, sbot) => {
      var close
      var api = {
        start () {
          // create an rpc server to output
          var ms = MultiServer(outputChannels)
          close = ms.server(function (stream) {
            var pipe = muxrpc(null, syncToAsync(manifest)) (sbot)
            pull(stream, pipe.createStream(), stream)
          })
        },
        close () {
          if (close) {
            close()
            close = null
          }
        }
      }

        cb(null, api)
    }) ()

    pull(stream, sbot.createStream(), stream)
  })
}

// Function to recursively convert all sync manifest methods to async
function syncToAsync (manifest) {
  var copy = {}

  Object.keys(manifest).forEach(function(key) {
    if ('string' !== typeof manifest[key]) {
      copy[key] = syncToAsync(manifest[key])
    } else if(manifest[key] === 'sync') {
      copy[key] = 'async'
    } else {
      copy[key] = manifest[key]
    }
  })

  return copy
}
