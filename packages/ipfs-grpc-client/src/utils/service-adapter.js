'use strict'

/**
 * improbable-eng/grpc-web does it's own protobuf->js conversion,
 * the official grpc/grpc-js module does another protobuf->conversion.
 *
 * So as to not have two types of protobuf->js conversion, here we
 * use an adapter to make the grpc/grpc-js module's version behave like
 * the improbable-eng/grpc-web version.
 *
 * @param {object} services - Service definitions loaded by grpc/proto-loader
 * @returns {object} - Service definitions formatted for improbable-eng/grpc-web
 */
module.exports = function serviceAdaptor (services) {
  const output = {}

  Object.keys(services)
    .filter(serviceName => Boolean(services[serviceName].service))
    .forEach(serviceName => {
      const service = services[serviceName]
      const serviceDef = {}
      output[serviceName] = serviceDef

      Object.keys(service.service)
        .forEach(methodName => {
          const method = service.service[methodName]

          serviceDef[methodName] = {
            service: {
              serviceName: `ipfs.${serviceName}`
            },
            methodName,
            requestStream: method.requestStream,
            responseStream: method.responseStream,
            requestType: {
              serializeBinary: method.requestSerialize,
              deserializeBinary: method.requestDeserialize
            },
            responseType: {
              serializeBinary: method.responseSerialize,
              deserializeBinary: (buf) => {
                const obj = method.responseDeserialize(buf)

                Object.defineProperty(obj, 'toObject', {
                  enumerable: false,
                  configurable: false,
                  value: () => obj
                })

                return obj
              }
            }
          }
        })
    })

  return output
}
