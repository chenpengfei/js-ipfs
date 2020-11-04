/* eslint-env mocha */
'use strict'

const sinon = require('sinon')
const server = require('./utils/server')
const { expect } = require('aegir/utils/chai')
const uint8ArrayFromString = require('uint8arrays/from-string')
const all = require('it-all')

describe('add-all', () => {
  let ipfs
  let socket

  before(() => {
    ipfs = {
      addAll: sinon.stub()
    }
    socket = server({ ipfs })
  })

  it('should add files', async () => {
    const path1 = '/path/file-1.txt'
    const cid1 = 'cid-1'
    const path2 = '/path/file-1.txt'
    const cid2 = 'cid-2'

    const results = [{
      type: 'RESULT',
      path: path1,
      cid: cid1
    }, {
      type: 'RESULT',
      path: path2,
      cid: cid2
    }]

    ipfs.addAll.returns(results)

    const requests = [
      { index: 1, type: 'FILE', path: path1, content: uint8ArrayFromString('hello world') },
      { index: 1, type: 'FILE', path: path1 },
      { index: 2, type: 'FILE', path: path2, content: uint8ArrayFromString('hello world') },
      { index: 2, type: 'FILE', path: path2 }
    ]

    const channel = socket.send('/ipfs.Root/addAll', {})
    requests.forEach(request => channel.clientSend(request))
    channel.clientEnd()

    await expect(all(channel.sink)).to.eventually.deep.equal(results)
  })
})
