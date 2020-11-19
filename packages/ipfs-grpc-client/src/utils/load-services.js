'use strict'

// @ts-ignore
const protocol = require('ipfs-grpc-protocol')
const protobuf = require('protobufjs/light')
const { Service } = protobuf

const CONVERSION_OPTS = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: false,
  oneofs: true
}

module.exports = function loadServices () {
  const root = protobuf.Root.fromJSON(protocol)
  const output = {}

  Object
    // @ts-ignore
    .keys(root.nested.ipfs)
    // @ts-ignore
    .filter(key => root.nested.ipfs[key] instanceof Service)
    // @ts-ignore
    .map(key => root.nested.ipfs[key])
    .forEach(service => {
      const serviceDef = {}

      output[service.name] = serviceDef

      Object.keys(service.methods)
        .forEach(methodName => {
          const method = service.methods[methodName].resolve()

          serviceDef[methodName] = {
            service: {
              serviceName: `ipfs.${service.name}`
            },
            methodName,
            requestStream: method.requestStream,
            responseStream: method.responseStream,
            requestType: {
              serializeBinary: (obj) => {
                const message = method.resolvedRequestType.fromObject(obj)
                return method.resolvedRequestType.encode(message).finish()
              },
              deserializeBinary: (buf) => {
                const message = method.resolvedRequestType.decode(buf)
                return method.resolvedRequestType.toObject(message, CONVERSION_OPTS)
              }
            },
            responseType: {
              serializeBinary: (obj) => {
                const message = method.resolvedResponseType.fromObject(obj)
                return method.resolvedResponseType.encode(message).finish()
              },
              deserializeBinary: (buf) => {
                const message = method.resolvedResponseType.decode(buf)
                return method.resolvedResponseType.toObject(message, CONVERSION_OPTS)
              }
            }
          }
        })
    })

  return output
}
