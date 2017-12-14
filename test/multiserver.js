var test = require('tape')
var pull = require('pull-stream')
var muxrpc = require('muxrpc')
var MultiServer = require('multiserver')

var ms = require('../channels/multiserver')
var afterparty = require('..')

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
var ws = require('multiserver/plugins/ws')({port: 2349})
var wsOut = require('multiserver/plugins/ws')({port: 2350})
var server = MultiServer([ws])

var close = server.server(function (stream) {
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

  afterparty(ms.client('ws://localhost:2349', [ws]), ms.server([wsOut]), { forward: true })
  .then(function (api) {
    api()
    var wsOut = require('multiserver/plugins/ws')({port: 2350})
    var server = MultiServer([ws])

    server.client('ws://localhost:2350', function (err, stream) {
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
