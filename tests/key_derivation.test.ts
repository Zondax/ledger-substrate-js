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

import { getAppParams } from '../src/supported_apps'
import { hdKeyDerivation } from '../src/key_derivation'

const SEED = 'equip will roof matter pink blind book anxiety banner elbow sun young'

describe('KeyDerivation', function () {
  test('Kusama hardened', () => {
    const KSM = getAppParams('Kusama')

    //@ts-ignore
    const output = hdKeyDerivation(SEED, '', KSM.slip0044, 0x80000000, 0x80000000, 0x80000000, KSM.ss58_addr_type)
    console.log(output)

    const expected_address = 'JMdbWK5cy3Bm4oCyhWNLQJoC4cczNgJsyk7nLZHMqFT7z7R'
    const expected_pk = 'ffbc10f71d63e0da1b9e7ee2eb4037466551dc32b9d4641aafd73a65970fae42'

    expect(output?.pk.toString('hex')).toEqual(expected_pk)
    expect(output?.address.toString('hex')).toEqual(expected_address)
  })

  test('Kusama non-hardened', () => {
    const KSM = getAppParams('Kusama')

    //@ts-ignore
    const output = hdKeyDerivation(SEED, '', KSM.slip0044, 0, 0, 0, KSM.ss58_addr_type)
    console.log(output)

    const expected_address = 'G58F7QUjgT273AaNScoXhpKVjCcnDvCcbyucDZiPEDmVD9d'
    const expected_pk = '9aacddd17054070103ad37ee76610d1adaa7f8e0d02b76fb91391eec8a2470af'

    expect(output?.pk.toString('hex')).toEqual(expected_pk)
    expect(output?.address.toString('hex')).toEqual(expected_address)
  })

  test('Polkadot', () => {
    const DOT = getAppParams('Polkadot')

    //@ts-ignore
    const output = hdKeyDerivation(SEED, '', DOT.slip0044, 0x80000000, 0x80000000, 0x80000000, DOT.ss58_addr_type)
    console.log(output)

    const expected_address = '166wVhuQsKFeb7bd1faydHgVvX1bZU2rUuY7FJmWApNz2fQY'
    const expected_pk = 'e1b4d72d27b3e91b9b6116555b4ea17138ddc12ca7cdbab30e2e0509bd848419'

    expect(output?.pk.toString('hex')).toEqual(expected_pk)
    expect(output?.address.toString('hex')).toEqual(expected_address)
  })

  test('Ternoa', () => {
    const CAPS = getAppParams('Ternoa')

    //@ts-ignore
    const output = hdKeyDerivation(SEED, '', CAPS.slip0044, 0x80000000, 0x80000000, 0x80000000, CAPS.ss58_addr_type)
    console.log(output)

    const expected_address = '5ED8FvTWgsk9AmJoBPj7UyfdTfpJYaKZGA9CKmJWzb4Dk9Wd'
    const expected_pk = '5ee4922bdb199b22175df9f13b8b7bf282896b7dccfce815c9621f9c2a9fdf03'

    expect(output?.pk.toString('hex')).toEqual(expected_pk)
    expect(output?.address.toString('hex')).toEqual(expected_address)
  })
})
