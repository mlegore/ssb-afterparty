var MultiServer = require('multiserver')

function checkPlugins (plugins) {
  if (!plugins) {
    throw new Error('Must provide at least one plugin')
  }

  if (!Array.isArray(plugins)) {
    return [plugins]
  }

  return plugins
}

module.exports.client = function (remote, plugins) {
  plugins = checkPlugins(plugins)
  var ms = MultiServer(plugins)
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

module.exports.server = function (plugins) {
  var close
  plugins = checkPlugins(plugins)
  var ms = MultiServer(plugins)
  var serve = function (onConnect) {
    close = ms.server(function (stream) {
      onConnect(stream)
    })

    return close
  }

  serve.close = function () {
    if (close) {
      close()
      close = null
    }
  }

  return serve
}
