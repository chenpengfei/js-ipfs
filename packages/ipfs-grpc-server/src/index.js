'use strict'

const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const first = require('it-first')
const debug = require('debug')('ipfs:grpc-server')
const webSocketServer = require('./utils/web-socket-server')
const errCode = require('err-code')

const packageDefinition = protoLoader.loadSync(
  require.resolve('ipfs-grpc-protocol/src/root.proto'), {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: false,
    oneofs: true
  }
)

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
const {
  // @ts-ignore
  Root
} = protoDescriptor.ipfs

module.exports = async function createServer (ipfs, options = {}) {
  options = options || {}

  const server = new grpc.Server()
  server.addService(Root.service, {
    addAll: require('./core-api/add-all')(ipfs, options),
    // @ts-ignore
    id: require('./core-api/id')(ipfs, options)
  })

  const socket = options.socket || await webSocketServer(ipfs, options)

  socket.on('message', async ({ path, metadata, channel }) => {
    // @ts-ignore
    const handler = server.handlers.get(path)

    if (!handler) {
      channel.end(new Error(`Request path ${path} unimplemented`))
      return
    }

    channel.handler = handler

    switch (handler.type) {
      case 'bidi':
        handler.func(channel.source, channel.sink, metadata)
          .catch(err => {
            channel.end(err)
          })

        channel.sendMetadata({})

        for await (const output of channel.sink) {
          channel.sendMessage(output)
        }

        channel.end()

        break
      case 'unary':
        handler.func(await first(channel.source), metadata, (err, value, metadata, flags) => {
          if (err) {
            return channel.end(errCode(new Error(err.message || err.details), err.code, err))
          }

          channel.sendMetadata(metadata || {})

          if (value) {
            channel.sendMessage(value)
          }

          channel.end()
        })
        break
      case 'clientStream':
        handler.func(channel.source, metadata, (err, value, metadata, flags) => {
          if (err) {
            return channel.end(errCode(new Error(err.message || err.details), err.code, err))
          }

          channel.sendMetadata(metadata || {})

          if (value) {
            channel.sendMessage(value)
          }

          channel.end()
        })
        break
      case 'serverStream':
        handler.func(await first(channel.source), channel.sink, metadata)
          .catch(err => {
            channel.end(err)
          })

        channel.sendMetadata({})

        for await (const output of channel.sink) {
          channel.sendMessage(output)
        }

        channel.end()

        break
      default:
        debug(`Invalid handler type ${handler.type}`)
    }
  })

  return socket
}
