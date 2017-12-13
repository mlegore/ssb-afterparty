var pull = require('pull-stream')
var muxrpc = require('muxrpc')
const {noop, isObject} = require('./util')

function extend (api, otherApi, overwriteOpts) {
  return merge(api, otherApi, overwriteOpts === undefined ? true : overwriteOpts)
}

module.exports.extend = extend

// Merge api with otherApi, recursively. If overwriteOpts is provided,
// check if api[path][to] already defines the property, if it does,
// if overwriteOpts[path][to] is true, overwrite the property
function merge (api, otherApi, overwriteOpts) {
  Object.keys(otherApi).forEach(key => {
    if(!(key in api) || overwriteOpts === true || overwriteOpts[key] === true) {
      api[key] = otherApi[key]
    } else if (isObject(api[key]) && isObject(otherApi[key])
      && isObject(overwriteOpts[key])) {
      merge(api[key], otherApi[key], overwriteOpts[key])
    }
  })

  return api
}

function fromInputChannel (inputChannel) {
  return pipeIn({}, inputChannel, true)
}

function toOutputStream (api, manifest) {
  if (!manifest && api.manifest) {
    manifest = api.manifest
  }

  if (!manifest) {
    throw new Error('manifest is required')
  }

  var mux = muxrpc(null, manifest) (api)
  return mux.createStream()
}

function inStream (api, overwriteOpts, cb) {
  if (!cb) {
    cb = noop
  }

  var muxready = function (err, manifest, otherApi) {
    if(err) {
      cb(err)
    } else {
      cb(null, extend(api, otherApi, overwriteOpts))
    }
  }
  var mux = muxrpc(muxready) ()

  return mux.createStream()
}

module.exports.fromInputChannel = fromInputChannel
module.exports.toOutputStream = toOutputStream
module.exports.inStream = inStream

module.exports.pipeIn = function pipeIn (api, inputChannel, overwriteOpts) {
  return new Promise(function (resolve, reject) {
    var apiStream = inStream(api, overwriteOpts, (err, otherApi) => {
      if(err) {
        reject(err)
      } else {
        resolve(otherApi)
      }
    })

    if (inputChannel.then) {
      inputChannel.then(function (stream) {
        pull(stream, apiStream, stream)
      }, reject)
    } else {
      pull(inputChannel, apiStream, inputChannel)
    }
  })
}

module.exports.pipeOut = function (api, manifest, outputChannel) {
  if (!manifest) {
    throw new Error('manifest is required')
  }

  manifest['manifest'] = 'sync'
  var serveApi = {
    manifest () {
      return manifest
    }
  }

  serveApi.__proto__ = api
  function onConnect (stream) {
    return pull(stream, toOutputStream(serveApi, manifest), stream)
  }

  // If outputChannel is a duplex stream, just use that, otherwise
  // connect the outputChannel to the muxrpc factory
  if (outputChannel && outputChannel.sink && outputChannel.source) {
    return onConnect(outputChannel)
  } else if (outputChannel) {
    return outputChannel(onConnect)
  }
}
