var pull = require('pull-stream')
var Pushable = require('pull-pushable')
var pullPause = require('pull-pause')
var toBuffer = require('typedarray-to-buffer')

module.exports.pullParent = function (channel) {
  return pullWorker(self, channel, true)
}

// isBuffer expects _isBuffer = true
function box (data, channel) {
  if(Buffer.isBuffer(data)) {
    var message = { '_isBuffer': true, value: data }
    if (channel) {
      message['channel'] = channel
    }
    return message
  }

  if (channel) {
    return { channel: channel, value: data }
  }
  return data
}

function unbox (message) {
  if(message._isBuffer) {
    message.value = toBuffer(message.value)
    return message.value
  }

  if (message.channel) {
    return message.value
  }
  return message
}

function pullWorker (agent, channel, inWorker) {
  var pause = pullPause()
  pause.pause()
  var p = Pushable(true)
  var duplex = {
    source: p.source,
    sink: pull(
      pause,
      pull.drain(val => {
        agent.postMessage(box(val, channel))
      }))
  }

  var ready = false
  var listening = false
  var inWork = inWorker

  agent.addEventListener('message', function (e) {
    if (channel && channel !== e.data.channel) {
      return
    }

    if (e.data.ready) {
      ready = true
      if(!ready) {
        agent.postMessage({ channel, ready: true})
      }
      pause.resume()
      return
    }

    p.push(unbox(e.data))
  })

  function pollForReady () {
    if (!ready) {
      agent.postMessage({ channel, ready: true})
      setTimeout(pollForReady, 200)
    }
  }

  pollForReady()
  return duplex
}

module.exports.pullWorker = pullWorker
