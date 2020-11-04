'use strict'

const { Server: WebSocketServer } = require('ws')
const EventEmitter = require('events').EventEmitter
const WebSocketMessageChannel = require('./web-socket-message-channel')
const debug = require('debug')('ipfs:grpc-server:utils:web-socket-server')
const coerce = require('coercer')
const { camelCase } = require('change-case')

/**
 * @param {Buffer} buf - e.g. 'fooBar'
 * @returns {object} - e.g. 'foo-bar'
 **/
const fromHeaders = (buf) => {
  const headers = buf.toString('utf8')
    .trim()
    .split('\r\n')
    .map(s => s.split(':').map(s => s.trim()))
    .reduce((acc, curr) => {
      if (curr[0] !== 'content-type' && curr[0] !== 'x-grpc-web') {
        acc[camelCase(curr[0])] = curr[1]
      }

      return acc
    }, {})

  return coerce(headers)
}

module.exports = async (ipfs, options = {}) => {
  const config = await ipfs.config.getAll()
  const grpcAddr = config.Addresses.RPC
  const [,, host, , port] = grpcAddr.split('/')

  debug(`starting ws server on ${host}:${port}`)

  const emitter = new EventEmitter()

  const wss = new WebSocketServer({
    host,
    port
  })

  wss.on('connection', function connection (ws, request) {
    ws.on('error', error => debug(`WebSocket Error: ${error.stack}`))

    ws.once('message', function incoming (buf) {
      const path = request.url
      const metadata = fromHeaders(buf)
      const channel = new WebSocketMessageChannel(ws)

      emitter.emit('message', {
        path,
        metadata,
        channel
      })
    })
  })

  wss.on('error', error => debug(`WebSocket Server Error: ${error.stack}`))

  return new Promise((resolve) => {
    wss.on('listening', () => {
      // @ts-ignore
      emitter.stop = () => {
        return new Promise((resolve) => {
          wss.close(() => resolve())
        })
      }
      // @ts-ignore
      emitter.multiaddr = `/ip4/${wss.address().address}/tcp/${wss.address().port}/ws`

      resolve(emitter)
    })
  })
}
