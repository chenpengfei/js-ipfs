'use strict'

const pushable = require('it-pushable')

class MessageChannel {
  constructor () {
    this.source = pushable()
    this.sink = pushable()
  }

  sendMetadata (metadata) {
    this.metadata = metadata
  }

  sendMessage (message) {
    this.sink.push(message)
  }

  sendTrailers (trailers) {
    this.trailers = trailers
  }

  end (error) {
    this.sink.end(error)
  }

  clientSend (message) {
    this.source.push(message)
  }

  clientEnd (err) {
    this.source.end(err)
  }
}

module.exports = () => {
  return new MessageChannel()
}
