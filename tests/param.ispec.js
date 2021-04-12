import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { blake2bFinal, blake2bInit, blake2bUpdate } from 'blakejs'
import { newKusamaApp } from '../src'

const ed25519 = require('ed25519')

const data = require('testcases')

async function signAndVerify(txBlob) {
  const transport = await TransportNodeHid.create(1000)
  const app = newKusamaApp(transport)
  const pathAccount = 0x80000000
  const pathChange = 0x80000000
  const pathIndex = 0x80000000

  const responseAddr = await app.getAddress(pathAccount, pathChange, pathIndex)
  const responseSign = await app.sign(pathAccount, pathChange, pathIndex, txBlob)

  const pubkey = Buffer.from(responseAddr.pubKey, 'hex')

  console.log(responseAddr)
  console.log(responseSign)

  // Check signature is valid
  let prehash = txBlob
  if (txBlob.length > 256) {
    const context = blake2bInit(32, null)
    blake2bUpdate(context, txBlob)
    prehash = Buffer.from(blake2bFinal(context))
  }

  return ed25519.Verify(prehash, responseSign.signature.slice(1), pubkey)
}

data.forEach(tc => {
  test(`${tc.index} - ${tc.name}`, async () => {
    jest.setTimeout(60000)
    const txBlob = Buffer.from(tc.blob, 'hex')

    expect(await signAndVerify(txBlob)).toEqual(true)
  })
})
