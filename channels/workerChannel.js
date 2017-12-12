var pull = require('pull-stream')
var Pushable = require('pull-pushable')

module.exports.pullParent = function (channel) {
  return pullWorker(self, channel)
}

module.exports.pullWorker = function pullWorker (agent, channel) {
  var duplex = {
    source: Pushable(),
    sink: pull.sink(val => {
      if (channel) {
        agent.postMessage({channel: channel, value: val})
      } else {
        agent.postMessage(val)
      }
    })
  }

  agent.addEventListener('message', function (e) {
    if (!channel) {
      duplex.source.push(e.data)
    } else if (e.data.channel && e.data.channel === channel) {
      duplex.source.push(e.data.value)
    }
  }

  return duplex
}
