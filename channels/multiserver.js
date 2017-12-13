var MultiServer = require('multiserver')

module.exports.client = function (remote, channels) {
  var ms = MultiServer(channels)
  return new Promise(function(resolve, reject) {
    ms.client(remote, function (err, stream) {
      if (err) {
        reject(err)
      } else {
        resolve(stream)
      }
    })
  })
}

module.exports.server = function (channels) {
  var close
  var ms = MultiServer(channels)
  var serve = function (onConnect) {
    close = ms.server(function (stream) {
      onConnect(stream)
    })
  }

  serve.close = function () {
    if (close) {
      close()
      close = null
    }
  }

  return serve
}
