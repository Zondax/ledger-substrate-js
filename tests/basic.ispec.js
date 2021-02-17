import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { expect, test } from 'jest'
import { blake2bInit, blake2bUpdate, blake2bFinal } from 'blakejs'
import { newKusamaApp, hd_key_derivation } from '../src'
import { SLIP0044, SS58_ADDR_TYPE } from '../src/config'

const ed25519 = require('ed25519-supercop')

test('test Kusama hardened', () => {
  let m = 'equip will roof matter pink blind book anxiety banner elbow sun young'
  let output = hd_key_derivation(m, SLIP0044.KUSAMA, 0x80000000, 0x80000000, 0x80000000, SS58_ADDR_TYPE.KUSAMA)
  console.log(output)

  const expected_address = "JMdbWK5cy3Bm4oCyhWNLQJoC4cczNgJsyk7nLZHMqFT7z7R"
  const expected_pk = "ffbc10f71d63e0da1b9e7ee2eb4037466551dc32b9d4641aafd73a65970fae42"

  expect(output.pk.toString('hex')).toEqual(expected_pk)
  expect(output.address.toString('hex')).toEqual(expected_address)
})

test('test Kusama non-hardened', () => {
  let m = 'equip will roof matter pink blind book anxiety banner elbow sun young'
  let output = hd_key_derivation(m, SLIP0044.KUSAMA, 0, 0, 0, SS58_ADDR_TYPE.KUSAMA)
  console.log(output)

  const expected_address = "G58F7QUjgT273AaNScoXhpKVjCcnDvCcbyucDZiPEDmVD9d"
  const expected_pk = "9aacddd17054070103ad37ee76610d1adaa7f8e0d02b76fb91391eec8a2470af"

  expect(output.pk.toString('hex')).toEqual(expected_pk)
  expect(output.address.toString('hex')).toEqual(expected_address)
})

test('test Polkadot', () => {
  let m = 'equip will roof matter pink blind book anxiety banner elbow sun young'
  let output = hd_key_derivation(m, SLIP0044.POLKADOT, 0x80000000, 0x80000000, 0x80000000, SS58_ADDR_TYPE.POLKADOT)
  console.log(output)

  const expected_address = "166wVhuQsKFeb7bd1faydHgVvX1bZU2rUuY7FJmWApNz2fQY"
  const expected_pk = "e1b4d72d27b3e91b9b6116555b4ea17138ddc12ca7cdbab30e2e0509bd848419"

  expect(output.pk.toString('hex')).toEqual(expected_pk)
  expect(output.address.toString('hex')).toEqual(expected_address)
})

test('get version', async () => {
  const transport = await TransportNodeHid.create(1000)

  const app = newKusamaApp(transport)
  const resp = await app.getVersion()
  console.log(resp)

  expect(resp.return_code).toEqual(0x9000)
  expect(resp.error_message).toEqual('No errors')
  expect(resp).toHaveProperty('test_mode')
  expect(resp).toHaveProperty('major')
  expect(resp).toHaveProperty('minor')
  expect(resp).toHaveProperty('patch')
  expect(resp.test_mode).toEqual(false)
})

test('get address', async () => {
  const transport = await TransportNodeHid.create(1000)
  const app = newKusamaApp(transport)

  const pathAccount = 0x80000000
  const pathChange = 0x80000000
  const pathIndex = 0x80000005

  const response = await app.getAddress(pathAccount, pathChange, pathIndex)
  console.log(response)

  expect(response.return_code).toEqual(0x9000)
  expect(response.error_message).toEqual('No errors')
  expect(response).toHaveProperty('pubKey')
  expect(response.pubKey).toEqual('d280b24dface41f31006e5a2783971fc5a66c862dd7d08f97603d2902b75e47a')
  expect(response.address).toEqual('HLKocKgeGjpXkGJU6VACtTYJK4ApTCfcGRw51E5jWntcsXv')
})

test('show address', async () => {
  jest.setTimeout(60000)

  const transport = await TransportNodeHid.create(1000)
  const app = newKusamaApp(transport)

  const pathAccount = 0x80000000
  const pathChange = 0x80000000
  const pathIndex = 0x8000000a
  const response = await app.getAddress(pathAccount, pathChange, pathIndex, true)

  console.log(response)

  expect(response.return_code).toEqual(0x9000)
  expect(response.error_message).toEqual('No errors')

  expect(response).toHaveProperty('address')
  expect(response).toHaveProperty('pubKey')

  expect(response.pubKey).toEqual('3306fecee2c27f149f8de8f1fbcaaa01d53801e9b74938d5d4c7b009d0fc93f9')
  expect(response.address).toEqual('DjE39wTisBv1CVA5dVvppx5djFCiuNgxz8Xcey8Xmp16Bnv')
})

test('sign2_and_verify', async () => {
  jest.setTimeout(60000)

  const txBlobStr =
    '0400ffbc10f71d63e0da1b9e7ee2eb4037466551dc32b9d4641aafd73a65970fae4202286beed502000022040000b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe280b332587f46c556aa806781884284f50d90b8c1b02488a059700673c93f41c'

  const txBlob = Buffer.from(txBlobStr, 'hex')

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
    const context = blake2bInit(64, null)
    blake2bUpdate(context, txBlob)
    prehash = Buffer.from(blake2bFinal(context))
  }
  const valid = ed25519.verify(responseSign.signature.slice(1), prehash, pubkey)
  expect(valid).toEqual(true)
})
