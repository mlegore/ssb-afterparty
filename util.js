var mapMerge = require('map-merge')
var Obv = require('obv')
var pull = require('pull-stream')
var isArray = Array.isArray

module.exports.clone = function clone (obj, mapper) {
  function map(v, k) {
    return isObject(v) ? clone(v, mapper) : mapper(v, k)
  }

  if(isArray(obj)) {
    return obj.map(map)
  } else if(isObject(obj)) {
    var o = {}
    for(var k in obj) {
      o[k] = map(obj[k], k)
    }
    return o
  } else {
    return map(obj)
  }
}

module.exports.hookOptionalCB = function hookOptionalCB (syncFn) {
  // syncFn is a function that's expected to return its result or throw an error
  // we're going to hook it so you can optionally pass a callback
  syncFn.hook(function(fn, args) {
    // if a function is given as the last argument, treat it as a callback
    var cb = args[args.length - 1]
    if (typeof cb == 'function') {
      var res
      args.pop() // remove cb from the arguments
      try { res = fn.apply(this, args) }
      catch (e) { return cb(e) }
      cb(null, res)
    } else {
      // no cb provided, regular usage
      return fn.apply(this, args)
    }
  })
}

module.exports.mergeApi = function mergeApi (a, b, mapper) {
  for(var k in b) {
    if(b[k] && 'object' === typeof b[k] && !Buffer.isBuffer(b[k]))
      mergeApi(a[k] = {}, b[k], mapper)
    else
      a[k] = mapper(b[k], k)
  }

  return a
}

module.exports.mergeManifest = function mergeManifest (manf, _manf, name) {
  if(name) {
    var o = {}; o[name] = _manf; _manf = o
  }
  return mapMerge(manf, _manf)
}

module.exports.mergePermisson = function mergePermissions (perms, _perms, name) {
  return mapMerge(perms,
    clone(_perms, function (v) {
      return name ? name + '.' + v : v
    })
  )
}

// Function to recursively convert all sync manifest methods to async
module.exports.syncToAsync = function syncToAsync (manifest) {
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

module.exports.getSince = function (api) {
  if ('sinceStream' in api) {
    var obv = Obv()
    pull(
      api.sinceStream(),
      pull.drain(val => {
        obv.set(val)
      })
    )
    return obv
  }

  if ('since' in api) {
    return poll(cb => api.since(cb), val => val, 200)
  }

  if ('status' in api) {
    return poll(cb => api.status(cb), val => val.sync.since, 200)
  }

  throw new Error('Cannot find or emulate since parameter')
}

function poll (f, select, interval) {
  var obv = Obv()
  var updateSince = function () {
    f((err, val) => {
      if(err)
        throw err
      obv.set(select(val))
      setTimeout(updateSince, interval)
    })
  }
  updateSince()
  return obv
}

module.exports.noop = function noop (err) {
  if (err) throw explain(err, 'callback not provided')
}
