// TODO: Use mock transport

/** ******************************************************************************
 *  (c) 2018 - 2022 Zondax AG
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ******************************************************************************* */
import { blake2bFinal, blake2bInit, blake2bUpdate } from 'blakejs'

import Transport from '@ledgerhq/hw-transport'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'

import { PolkadotGenericApp } from '../src'
import { supportedApps } from '../src'

const PATH = "m/44'/354'/0'/0'/0'"
const TX_METADATA_SRV_URL = 'https://api.zondax.ch/polkadot/transaction/metadata'
const CHAIN_NAME = 'Westend Local'
const CHAIN_ID = 'wsd-local'
const YOUR_PUBKEY = 'd280b24dface41f31006e5a2783971fc5a66c862dd7d08f97603d2902b75e47a'
const YOUR_ADDRESS = 'HLKocKgeGjpXkGJU6VACtTYJK4ApTCfcGRw51E5jWntcsXv'
const YOUR_BLOB =
  '0000609f7615bb5f0ec9066a3f1366d6a90ba978b273b1ad1b5b020003052a4557332073aaeade2e91827746c10ba63306a001386d0f0019000000569ef659b987a40aee41ea6269d4f09dd9e384a852552cdeaade5504bd2f617c569ef659b987a40aee41ea6269d4f09dd9e384a852552cdeaade5504bd2f617c4671e11346334df0c4a1c933236cc120b67193eb2a8106b48a3788b80d18e368'

let transport: Transport



describe.skip('Integration', function () {
  beforeAll(async () => {
    transport = await TransportNodeHid.create(1000)
  })

  test('get version', async () => {
    const app = new PolkadotGenericApp(transport, CHAIN_ID, TX_METADATA_SRV_URL)
    const resp = await app.getVersion()
    console.log(resp)
    expect(resp).toHaveProperty('test_mode')
    expect(resp).toHaveProperty('major')
    expect(resp).toHaveProperty('minor')
    expect(resp).toHaveProperty('patch')
    expect(resp.testMode).toEqual(false)
  })

  test('get address', async () => {
    const { ss58_addr_type: ss58prefix } = supportedApps.find(app => app.name == CHAIN_NAME) || {}
    expect(ss58prefix).toBeDefined()
    if (ss58prefix === undefined) {
      return
    }

    const app = new PolkadotGenericApp(transport, CHAIN_ID, TX_METADATA_SRV_URL)

    const response = await app.getAddress(PATH, ss58prefix)
    console.log(response)

    expect(response).toHaveProperty('pubKey')
    expect(response.pubKey).toEqual(YOUR_PUBKEY)
    expect(response.address).toEqual(YOUR_ADDRESS)
  })

  test('show address', async () => {
    const { ss58_addr_type: ss58prefix } = supportedApps.find(app => app.name == CHAIN_NAME) || {}
    expect(ss58prefix).toBeDefined()
    if (ss58prefix === undefined) {
      return
    }

    const app = new PolkadotGenericApp(transport, CHAIN_ID, TX_METADATA_SRV_URL)

    const response = await app.getAddress(PATH, ss58prefix, true)

    console.log(response)

    expect(response).toHaveProperty('address')
    expect(response).toHaveProperty('pubKey')

    expect(response.pubKey).toEqual(YOUR_PUBKEY)
    expect(response.address).toEqual(YOUR_ADDRESS)
  })

  describe('Tx Metadata', () => {
    test('Success', async () => {
      const app = new PolkadotGenericApp(transport, CHAIN_ID, TX_METADATA_SRV_URL)

      const txBlob = Buffer.from(YOUR_BLOB, 'hex')
      const resp = await app.getTxMetadata(txBlob)

      expect(resp).toBeDefined()
    })

    test('Wrong/Invalid chain id', async () => {
      const app = new PolkadotGenericApp(transport, 'xxx', TX_METADATA_SRV_URL)

      const txBlob = Buffer.from(YOUR_BLOB, 'hex')
      try {
        await app.getTxMetadata(txBlob)
      } catch (e: any) {
        expect(e.response.status).toBe(404)
      }
    })

    test('Empty/Wrong service url', async () => {
      const app = new PolkadotGenericApp(transport, 'ksm', '')

      const txBlob = Buffer.from(YOUR_BLOB, 'hex')
      try {
        await app.getTxMetadata(txBlob)
      } catch (e: any) {
        expect(e.code).toBe('ECONNREFUSED')
      }
    })
  })

  test('sign', async () => {
    const txBlob = Buffer.from(YOUR_BLOB, 'hex')

    const app = new PolkadotGenericApp(transport, CHAIN_ID, TX_METADATA_SRV_URL)
    const responseSign = await app.sign(PATH, txBlob)

    console.log(responseSign)
  })

  /*
  // TODO only valid on westend (running locally) now. Enable it again whenever metadata is supported on public nodes.
  test('sign2_and_verify', async () => {
    const { ss58_addr_type: ss58prefix } = supportedApps.find(app => app.name == CHAIN_NAME) || {}
    expect(ss58prefix).toBeDefined()
    if (ss58prefix === undefined) {
      return
    }

    const txBlob = Buffer.from(YOUR_BLOB, 'hex')

    const app = new PolkadotGenericApp(transport, CHAIN_ID, TX_METADATA_SRV_URL)

    const responseAddr = await app.getAddress(PATH, ss58prefix)
    const responseSign = await app.sign(PATH, txBlob)

    const pubkey = responseAddr.pubKey

    console.log(responseAddr)
    console.log(responseSign)

    // Check signature is valid
    let prehash = txBlob
    if (txBlob.length > 256) {
      const context = blake2bInit(32)
      blake2bUpdate(context, txBlob)
      prehash = Buffer.from(blake2bFinal(context))
    }

    const valid = ed25519.verify(responseSign.signature.subarray(1), prehash, pubkey)
    expect(valid).toEqual(true)
  })*/
})
