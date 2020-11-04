'use strict'

const grpcJs = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const { grpc } = require('@improbable-eng/grpc-web')
const transport = require('./grpc/transport')
const toUrlString = require('ipfs-core-utils/src/to-url-string')
const serviceAdaptor = require('./utils/service-adapter')

grpc.setDefaultTransport(transport())

const packageDefinition = protoLoader.loadSync(
  require.resolve('ipfs-grpc-protocol/src/root.proto'), {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: false,
    oneofs: true
  }
)

const protoDescriptor = grpcJs.loadPackageDefinition(packageDefinition)
const service = serviceAdaptor(protoDescriptor.ipfs)

const protocols = {
  'ws://': 'http://',
  'wss://': 'https://'
}

module.exports = function createClient (opts = {}) {
  opts = opts || {}
  opts.url = toUrlString(opts.url)

  Object.keys(protocols).forEach(protocol => {
    if (opts.url.startsWith(protocol)) {
      opts.url = protocols[protocol] + opts.url.substring(protocol.length)
    }
  })

  const client = {
    addAll: require('./core-api/add-all')(grpc, service.Root.addAll, opts),
    id: require('./core-api/id')(grpc, service.Root.id, opts)
  }

  return client
}
