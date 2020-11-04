'use strict'

const errCode = require('err-code')

/**
 * @param {object} grpc - an @improbable-eng/grpc-web instance
 * @param {object} service - an @improbable-eng/grpc-web service
 * @param {object} options - RPC options
 * @param {string} options.host - RPC options
 * @param {object} options.request - A request object
 * @param {boolean} [options.debug] - Whether to print debug messages
 * @param {object} [options.metadata] - Metadata sent as headers
 * @returns {Promise<object>} - a response object
 **/
module.exports = (grpc, service, options = { host: '127.0.0.1:5009', request: {} }) => {
  return new Promise((resolve, reject) => {
    if (options.request) {
      const request = options.request

      options.request = {
        serializeBinary: () => service.requestType.serializeBinary(request)
      }
    }

    grpc.unary(service, {
      ...options,
      onEnd: ({ status, statusMessage, headers, message, trailers }) => {
        if (status) {
          const error = new Error(message || statusMessage)

          return reject(errCode(error, trailers.get('grpc-code'), {
            stack: trailers.get('grpc-stack') || error.stack,
            status
          }))
        }

        resolve(message)
      }
    })
  })
}
