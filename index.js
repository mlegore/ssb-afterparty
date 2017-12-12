import MultiServer from "multiserver"
import plugify from './plugify'

export function (inputRemote, inputChannels, outputChannels, cb) {

  var ms = MultiServer(inputChannels)

  // connect to the pipe input
  ms.client(inputRemote, function (err, stream) {
    var sbot = muxrpc(() => {

      var keepalive = setInterval(sbot.whoami, 1e3)
      sbot.close = fork(sbot.close, function () {
        clearInterval(keepalive)
      })

    var close
      var api = {
        start () {
          // create an rpc server to output
          var ms = MultiServer(outputChannels)
          close = ms.server(function (stream) {
            var pipe = muxrpc(null, sbot.manifest) (sbot)
            pull(stream, pipe.createStream(), stream)
          }
        },
        close () {
          if (close) {
            close()
            close = null
          }
        }
      }

      cb(null, api)
    })()

    pull(stream, sbot.createStream(), stream)
}
