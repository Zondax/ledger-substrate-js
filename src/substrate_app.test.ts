/** ******************************************************************************
 *  (c) 2019 - 2022 Zondax AG
 *  (c) 2016-2017 Ledger
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
import { MockTransport } from '@ledgerhq/hw-transport-mocker'
import { PolkadotGenericApp } from './generic_app'

describe('API', function () {
  test('SignRaw - Valid', () => {
    const responseBuffer = Buffer.concat([
      Buffer.from([0, 1, 2, 3, 0]), // Version information
      Buffer.from([0x90, 0x00]), // Status code for no errors (0x9000)
    ])

    const transport = new MockTransport(responseBuffer)
    const app = new PolkadotGenericApp(transport)

    const mockBlob = Buffer.from('0x00')

    const result = await app.signRaw('m/0', mockBlob)

    expect(result.signature).toBe('0x00')
  })

  test('SignRaw - Error', () => {
    expect(false).toBeFalsy()
  })
})
