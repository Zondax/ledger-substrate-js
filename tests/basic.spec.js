import { expect, test } from './jest'
import { hdKeyDerivation } from '../src'
import { SLIP0044, SS58_ADDR_TYPE } from '../src/config'

test('Kusama hardened', () => {
  let m = 'equip will roof matter pink blind book anxiety banner elbow sun young'
  let output = hdKeyDerivation(m, '', SLIP0044.KUSAMA, 0x80000000, 0x80000000, 0x80000000, SS58_ADDR_TYPE.KUSAMA)
  console.log(output)

  const expected_address = 'JMdbWK5cy3Bm4oCyhWNLQJoC4cczNgJsyk7nLZHMqFT7z7R'
  const expected_pk = 'ffbc10f71d63e0da1b9e7ee2eb4037466551dc32b9d4641aafd73a65970fae42'

  expect(output.pk.toString('hex')).toEqual(expected_pk)
  expect(output.address.toString('hex')).toEqual(expected_address)
})

test('Kusama non-hardened', () => {
  let m = 'equip will roof matter pink blind book anxiety banner elbow sun young'
  let output = hdKeyDerivation(m, '', SLIP0044.KUSAMA, 0, 0, 0, SS58_ADDR_TYPE.KUSAMA)
  console.log(output)

  const expected_address = 'G58F7QUjgT273AaNScoXhpKVjCcnDvCcbyucDZiPEDmVD9d'
  const expected_pk = '9aacddd17054070103ad37ee76610d1adaa7f8e0d02b76fb91391eec8a2470af'

  expect(output.pk.toString('hex')).toEqual(expected_pk)
  expect(output.address.toString('hex')).toEqual(expected_address)
})

test('Polkadot', () => {
  let m = 'equip will roof matter pink blind book anxiety banner elbow sun young'
  let output = hdKeyDerivation(m, '', SLIP0044.POLKADOT, 0x80000000, 0x80000000, 0x80000000, SS58_ADDR_TYPE.POLKADOT)
  console.log(output)

  const expected_address = '166wVhuQsKFeb7bd1faydHgVvX1bZU2rUuY7FJmWApNz2fQY'
  const expected_pk = 'e1b4d72d27b3e91b9b6116555b4ea17138ddc12ca7cdbab30e2e0509bd848419'

  expect(output.pk.toString('hex')).toEqual(expected_pk)
  expect(output.address.toString('hex')).toEqual(expected_address)
})
