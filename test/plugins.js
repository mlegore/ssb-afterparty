var test = require('tape')
var pull = require('pull-stream')
var muxrpc = require('muxrpc')

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

var mainApi = muxrpc(null, manifest) (api)

test('plugin', function (t) {
  t.plan(2)

  var check = function (apiAtOtherEnd) {
    apiAtOtherEnd.testPlugin.get((err, val) => {
      t.notOk(err)
      t.deepEqual(expected, val)
      t.end()
    })
  }

  var mux = muxrpc((err, manifest, apiAtOtherEnd) => {
    check(apiAtOtherEnd)
  }) ()

  afterparty(mainApi.createStream(), mux.createStream(), true)
  .then(function(api) {
    api = api.use(testPlugin)
    api()
    t.on('end', api.close)
  })
})
