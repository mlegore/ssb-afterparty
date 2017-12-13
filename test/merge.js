var test = require('tape')

const {extend} = require('../connect')
const {isObject, clone} = require('../util')

var a

var api = {
  get (i, cb) {
    if(i < 0 || i >= messages.length)
      return cb('index out of range')
    cb(null, messages[i])
  },
  plugin: {
    get () {
      return a
    },
    set (v) {
      a = v
    }
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

// Assume nested objects only, with no arrays
function deepContains (testApi, api1) {
  if(!isObject(testApi) && isObject(api1)) {
    return false
  }

  return Object.keys(api1).every(key => key in testApi &&
    (!isObject(api1[key]) || deepContains(testApi[key], api1[key]))
  )
}

test('full extend', function (t) {
  t.plan(2)

  var otherApi = { other () {} }
  var copy = clone(api, val => val)
  var merged = extend(copy, otherApi)
  t.ok(deepContains(merged, api))
  t.ok(deepContains(merged, otherApi))
})

var overwritingApi = {
  plugin: { get () {}, set () {} },
  sinceStream () {}
}

test('extend with overwrites, full overwrite', function (t) {
  t.plan(5)

  var copy = clone(api, val => val)
  var merged = extend(copy, overwritingApi)
  t.ok(merged['sinceStream'] === overwritingApi['sinceStream'])
  t.ok(merged['plugin'] === overwritingApi['plugin'])
  t.ok(merged['sinceStream'] === copy['sinceStream'])
  t.ok(merged['plugin'] === copy['plugin'])
  t.ok(merged['get'] == api['get'])
})

test('extend with overwrites, overwrite options', function (t) {
  t.plan(3)

  var copy = clone(api, val => val)
  var merged = extend(copy, overwritingApi, {plugin: true})
  t.ok(merged['sinceStream'] === api['sinceStream'])
  t.ok(merged['plugin'] === overwritingApi['plugin'])
  t.ok(merged['plugin'] === copy['plugin'])
})

test('extend with overwrites, sub-overwrite-options', function (t) {
  t.plan(5)

  var copy = clone(api, val => val)
  var pluginBefore = copy['plugin']
  var merged = extend(copy, overwritingApi, {sinceStream: false, plugin: {get: true}})
  t.ok(merged['sinceStream'] === api['sinceStream'])
  t.ok(merged['plugin'] === pluginBefore)
  t.ok(merged['plugin']['get'] === overwritingApi['plugin']['get'])
  t.ok(merged['plugin']['get'] === copy['plugin']['get'])
  t.ok(merged['plugin']['set'] === api['plugin']['set'])
})
