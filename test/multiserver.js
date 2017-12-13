var test = require('tape')
var pull = require('pull-stream')
var muxrpc = require('muxrpc')
var MultiServer = require('multiserver')

var afterparty = require('.')
var manifest = {
  test: 'sync',
  manifest: 'sync',
  source: 'source'
}

var values = [0, 5, 2, 3]
var api = {
  test (input) {
    return 'test:' + input;
  },
  source () {
    return pull.values(values)
  },
  manifest () {
    return manifest
  }
}

var mainApi = muxrpc(null, manifest) (api)

var ws = require('multiserver/plugins/ws')({port: 2345})
var wsOut = require('multiserver/plugins/ws')({port: 2346})
var ms = MultiServer([ws])

var close = ms.server(function (stream) {
  pull(stream, mainApi.createStream(), stream)
})

test('multiserver pipe through', function (t) {
  t.plan(3)

  var check = function (apiAtOtherEnd) {
    apiAtOtherEnd.test('value', (err, ret) => {
      t.notOk(err)
      t.equal(api.test('value'), ret)
    })

    pull(
      apiAtOtherEnd.source(),
      pull.collect(function (err, ary) {
        t.deepEqual(values, ary)
      }))
  }

  afterparty('ws://localhost:2345', [ws], [wsOut], (err, api) => {
    api.start()
    var wsOut = require('multiserver/plugins/ws')({port: 2346})
    var ms = MultiServer([ws])

    ms.client('ws://localhost:2346', function (err, stream) {
      var mux = muxrpc((err, manifest, apiAtOtherEnd) => {
        apiAtOtherEnd._manifest = manifest
        apiAtOtherEnd.manifest = function () {
          return manifest
        }

        check(apiAtOtherEnd)
      }) ()

      pull(stream, mux.createStream(), stream)
    })

    t.on('end', api.close)
  })

  t.on('end', close)
})
