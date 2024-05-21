// /** ******************************************************************************
//  *  (c) 2018 - 2022 Zondax AG
//  *
//  *  Licensed under the Apache License, Version 2.0 (the "License");
//  *  you may not use this file except in compliance with the License.
//  *  You may obtain a copy of the License at
//  *
//  *      http://www.apache.org/licenses/LICENSE-2.0
//  *
//  *  Unless required by applicable law or agreed to in writing, software
//  *  distributed under the License is distributed on an "AS IS" BASIS,
//  *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  *  See the License for the specific language governing permissions and
//  *  limitations under the License.
//  ******************************************************************************* */
// import { blake2bFinal, blake2bInit, blake2bUpdate } from 'blakejs'
// import { ed25519 } from '@noble/curves/ed25519'

// import { newSubstrateApp } from '../src'
// import { openTransportReplayer, RecordStore } from '@ledgerhq/hw-transport-mocker'

// const CHAIN = 'Kusama'
// const YOUR_PUBKEY = 'd280b24dface41f31006e5a2783971fc5a66c862dd7d08f97603d2902b75e47a'
// const YOUR_ADDRESS = 'HLKocKgeGjpXkGJU6VACtTYJK4ApTCfcGRw51E5jWntcsXv'
// const YOUR_BLOB =
//   '040000313233343536373839303132333435363738393031323334353637383930313233158139ae28a3dfaac5fe1560a5e9e05cd5038d2433158139ae28a3dfaac5fe1560a5e9e05c362400000c000000b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafeb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe'

// jest.setTimeout(60000)

// describe('Integration', function () {
//   test('get version', async () => {
//     const store = RecordStore.fromString(`
//     => e016000000
//     <= 000000050107426974636f696e034254439000
//     => e001000000
//     <= 3110000405312e352e35042300000004312e37002013fe17e06cf2f710d33328aa46d1053f8fadd48dcaeca2c5512dd79e2158d5779000
//   `,
//       {
//         autoSkipUnknownApdu: true,
//       }
//     );
//     const transport = await openTransportReplayer(store)

//     const app = newSubstrateApp(transport, CHAIN)
//     const resp = await app.getVersion()
//     console.log(resp)

//     expect(resp.return_code).toEqual(0x9000)
//     expect(resp.error_message).toEqual('No errors')
//     expect(resp).toHaveProperty('test_mode')
//     expect(resp).toHaveProperty('major')
//     expect(resp).toHaveProperty('minor')
//     expect(resp).toHaveProperty('patch')
//     expect(resp.test_mode).toEqual(false)
//   })

// //   test('get address', async () => {
// //     // @ts-expect-error transport will be there
// //     const app = newSubstrateApp(transport, CHAIN)

// //     const pathAccount = 0x80000000
// //     const pathChange = 0x80000000
// //     const pathIndex = 0x80000005

// //     const response = await app.getAddress(pathAccount, pathChange, pathIndex)
// //     console.log(response)

// //     expect(response.return_code).toEqual(0x9000)
// //     expect(response.error_message).toEqual('No errors')
// //     expect(response).toHaveProperty('pubKey')
// //     expect(response.pubKey).toEqual(YOUR_PUBKEY)
// //     expect(response.address).toEqual(YOUR_ADDRESS)
// //   })

// //   test('show address', async () => {
// //     // @ts-expect-error transport will be there
// //     const app = newSubstrateApp(transport, CHAIN)

// //     const pathAccount = 0x80000000
// //     const pathChange = 0x80000000
// //     const pathIndex = 0x80000005
// //     const response = await app.getAddress(pathAccount, pathChange, pathIndex, true)

// //     console.log(response)

// //     expect(response.return_code).toEqual(0x9000)
// //     expect(response.error_message).toEqual('No errors')

// //     expect(response).toHaveProperty('address')
// //     expect(response).toHaveProperty('pubKey')

// //     expect(response.pubKey).toEqual(YOUR_PUBKEY)
// //     expect(response.address).toEqual(YOUR_ADDRESS)
// //   })

// //   test('sign2_and_verify', async () => {
// //     const txBlob = Buffer.from(YOUR_BLOB, 'hex')

// //     // @ts-expect-error transport will be there
// //     const app = newSubstrateApp(transport, CHAIN)

// //     const pathAccount = 0x80000000
// //     const pathChange = 0x80000000
// //     const pathIndex = 0x80000000

// //     const responseAddr = await app.getAddress(pathAccount, pathChange, pathIndex)
// //     const responseSign = await app.sign(pathAccount, pathChange, pathIndex, txBlob)

// //     const pubkey = responseAddr.pubKey

// //     console.log(responseAddr)
// //     console.log(responseSign)

// //     // Check signature is valid
// //     let prehash = txBlob
// //     if (txBlob.length > 256) {
// //       const context = blake2bInit(32)
// //       blake2bUpdate(context, txBlob)
// //       prehash = Buffer.from(blake2bFinal(context))
// //     }

// //     const valid = ed25519.verify(responseSign.signature.subarray(1), prehash, pubkey)
// //     expect(valid).toEqual(true)
// //   })
// })


test('skip manual', async () => {})
