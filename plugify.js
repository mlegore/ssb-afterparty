var Hookable = require('hoox')
var flumeFill = require('./flume')
const {clone, mergeApi, mergePermissions,
  mergeManifest, hookOptionalCB, getSince} = require ('./util')

function merge (a, b, mapper) {
  for(var k in b) {
    if(b[k] && 'object' === typeof b[k] && !Buffer.isBuffer(b[k]))
      merge(a[k] = {}, b[k], mapper)
    else
      a[k] = mapper(b[k], k)
  }

  return a
}

module.exports = function (api, opts = {}) {
  var plugins = []
  if (!('manifest' in api))
    api.manifest = {}
  if (!('permissions' in api))
    api.permissions = {}

  if (!('use' in api)) {
    process.env.FV_REDUCE_LS = true

    api.use = function (plug, overwrite) {
      if('function' === typeof plug) {
        var p = {init: plug}
        plugins.push(p)
        init(api, plugin)
        return api
      }

      if(plug.name && 'string' === typeof plug.name) {
        if(plugins.some(function (_plug) { return _plug.name === plug.name }) && !overwrite) {
          return api
        }
      }

      if(!plug.init)
        throw new Error('plugins *must* have "init" method')

      var name = plug.name
      if(plug.manifest)
        api.manifest =
          mergeManifest(api.manifest, plug.manifest, name)
      if(plug.permissions)
        api.permissions =
          mergePermissions(api.permissions, plug.permissions, name)

      plugins.push(plug)
      api = init(api, plug, opts)
      return api
    }
  }

  var cached
  var since = () => {
    if (cached)
      return cached
    cached = getSince(api)
    return cached
  }
  api = flumeFill(api, since, opts.flumeOpts)
  return api
}

// Mixin to allow loading of plugins for an already
// started instance of ssb or ssb-client
function init (api, plug, opts) {
  var _api = plug.init.call({createClient: api}, api, opts)
  if(plug.name) {
    var o = {}; o[plug.name] = _api; _api = o
  }

  return merge(api, _api, function (v, k) {
    if ('function' === typeof v) {
      v = Hookable(v)
      if (plug.manifest && plug.manifest[k] === 'sync') {
        hookOptionalCB(v)
      }
    }
    return v
  })
}
