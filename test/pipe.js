var test = require('tape')
var pull = require('pull-stream')
var muxrpc = require('muxrpc')
var MultiServer = require('multiserver')

var afterparty = require('../pipe')
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

test('pipe through', function (t) {
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

  var mux = muxrpc((err, manifest, apiAtOtherEnd) => {
    check(apiAtOtherEnd)
  }) ()

  afterparty(mainApi.createStream(), mux.createStream(), true)
  .then(function(api) {
    api()
    t.on('end', api.close)
  })
})
