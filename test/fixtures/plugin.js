var FlumeReduce = require('flumeview-reduce')

exports.name = 'testPlugin'
exports.version = '1.0.0'
exports.manifest = {
  stream: 'source',
  get: 'async'
}

exports.init = function (ssb, config) {
  return ssb._flumeUse('testPlugin', FlumeReduce(1, reduce, map))
}

function reduce (result, item) {
  if (!result) result = {}
  if (item && item.value) {
    Object.keys(item).forEach(key => {
      result[key] = item[key]
    })
  }

  return result
}

function map (msg) {
  return msg
}
