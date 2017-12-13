var cont = require('cont')
var pull = require('pull-stream')
var PullCont = require('pull-cont')
var path = require('path')
var Obv = require('obv')
var wrap = require('./flume-wrap')

function map(obj, iter) {
  var o = {}
  for(var k in obj)
    o[k] = iter(obj[k], k, obj)
  return o
}

module.exports = function (api, since, overwrite = false)  {
  if (!('_views' in api))
    api._views = []

  // Hard code to true for now
  var ready = Obv()
  ready.set(true)

  var views = []
  var closed = false
  var rebuild = function (cb) {
    return cont.para(map(api._views, function (sv) {
      return function (cb) {
        sv.destroy(function (err) {
          if(err) return cb(err)
          //destroy should close the sink stream,
          //which will restart the write.
          var rm = sv.since(function (v) {
            if(v === since().value) {
              rm()
              cb()
            }
          })
        })
      }
    }))
    (function (err) {
      if(err) cb(err) //hopefully never happens

      //then restream each streamview, and callback when it's uptodate with the main log.
    })
  }

  function wrapMessage (msg) {
    if (!msg)
      return msg

    return {
      value: msg,
      seq: msg.value ? msg.value.sequence : null
    }
  }

  api._flumeUse = function (name, createView) {
    if(!(api.createLogStream && 'function' === typeof api.createLogStream))
      throw "plugin cannot be loaded, need 'createLogStream' to polyfill flume"
    if(~Object.keys(api).indexOf(name) && !overwrite)
      throw new Error(name + ' is already in use!')

    var log = {
      dir: null,
      get: function (n, cb) {
        api.get(n, cb)
      },
      since: since(),
      stream: function (opts) {
        var pause = require('pull-pause')()
        return pull(
          api.createLogStream({seq: true, values: true, keys: true}),
          pull.filter(msg => !msg.sync),
          pull.map(wrapMessage)
        )
      },
      append: function () {}
    }

    var sv = createView(log, name)
    views[name] = api[name] = wrap(sv, since(), ready)

    sv.since.once(function build (upto) {
      pull(
        api.createLogStream({gt: upto, live: true, seq: true, values: true}),
        pull.filter(msg => !msg.sync),
        pull.map(wrapMessage),
        sv.createSink(function (err) {
          if(err && !closed) throw err
          else if(!closed)
            sv.since.once(rebuild)
        })
      )
    })

    api.close = function () {
      closed = true
    }

    return api
  }

  return api
}
