var test = require('tape')
var pull = require('pull-stream')
var muxrpc = require('muxrpc')
var MultiServer = require('multiserver')
var afterparty = require('..')
var testPlugin = require('./fixtures/plugin')

var manifest = {
  get: 'async',
  createLogStream: 'source',
  sinceStream: 'source',
  manifest: 'sync'
}
var messages = [{
  seq: 0,
  value: { val: 'value0' }
}, {
  seq: 1,
  value: { val1: 'value1' }
}, {
  seq: 2,
  value: { val2: 'value2' }
}, {
  seq: 3,
  value: { val: 'othervalue0' }
}, {
  seq: 4,
  value: { val2: 'othervalue2' }
}]

var expected = {
  val: 'othervalue0',
  val1: 'value1',
  val2: 'othervalue2'
}

var api = {
  get (i, cb) {
    if(i < 0 || i >= messages.length)
      return cb('index out of range')
    cb(null, messages[i])
  },
  createLogStream (opts) {
    return pull.values(messages)
  },
  sinceStream () {
    return pull.values([4])
  },
  manifest () {
    return manifest
  }
}

var portIn = 2347
var portOut = 2348

var mainApi = muxrpc(null, manifest) (api)

var ws = require('multiserver/plugins/ws')({port: portIn})
var wsOut = require('multiserver/plugins/ws')({port: portOut})
var ms = MultiServer([ws])

var close = ms.server(function (stream) {
  pull(stream, mainApi.createStream(), stream)
})

test('plugin', function (t) {
  t.plan(2)

  var check = function (apiAtOtherEnd) {
    apiAtOtherEnd.testPlugin.get((err, val) => {
      t.notOk(err)
      t.deepEqual(expected, val)
      t.end()
    })
  }

  afterparty('ws://localhost:' + portIn, [ws], [wsOut], (err, api) => {
    api.use(testPlugin)
    api.start()
    var wsOut = require('multiserver/plugins/ws')({port: portOut})
    var ms = MultiServer([ws])

    ms.client('ws://localhost:' + portOut, function (err, stream) {
      var mux = muxrpc((err, manifest, apiAtOtherEnd) => {
        check(apiAtOtherEnd)
      }) ()

      pull(stream, mux.createStream(), stream)
    })

    t.on('end', api.close)
  })

  t.on('end', close)
})
