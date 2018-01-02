var test = require('tape')
var pull = require('pull-stream')
var muxrpc = require('muxrpc')

const {pipeIn, pipeOut} = require('../connect')
var ms = require('../channels/multiserver')
var ws = require('multiserver/plugins/ws')
var afterparty = require('..')
var testPlugin = require('./fixtures/plugin')

var manifest = {
  get: 'async',
  createLogStream: 'source',
  sinceStream: 'source',
  manifest: 'sync'
}

var messages = [
  { val: 'value0', timestamp: 0, value: { sequence: 0 } },
  { val1: 'value1', timestamp: 1, value: { sequence: 1 } },
  { val2: 'value2', timestamp: 2, value: { sequence: 2 } },
  { val: 'othervalue0', timestamp: 3, value: { sequence: 3 } },
  { val2: 'othervalue2',timestamp: 4, value: { sequence: 4 } }
]

var expected = {
  val: 'othervalue0',
  val1: 'value1',
  val2: 'othervalue2',
  timestamp: 4,
  value: { sequence: 4 }
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

test('multiserver connect pipe through', function (t) {
  t.plan(2)

  var check = function (apiAtOtherEnd) {
    apiAtOtherEnd.testPlugin.get((err, val) => {
      t.notOk(err)
      t.deepEqual(expected, val)
      t.end()
    })
  }

  var inWs = ws({port: 2351})
  var outWs = ws({port: 2352})
  var outputChannel = ms.server(inWs)
  pipeOut(api, manifest, outputChannel)

  var inputChannel = ms.client('ws://localhost:2352', outWs)
  pipeIn(api, inputChannel).then(check, function (reject) {
    t.notOk(reject)
  })

  afterparty(ms.client('ws://localhost:2351', inWs), ms.server(outWs))
    .then(function(api) {
      api.use(testPlugin)
      api()
      t.on('end', api.close)
    }, function (err) {
      t.notOk(err)
    })

  t.on('end', outputChannel.close)
})
