import { toBuffer } from '../common'

describe('toBuffer', () => {
  it('should pass through Buffer unchanged', () => {
    const input = Buffer.from('deadbeef', 'hex')
    const result = toBuffer(input)

    expect(result).toBe(input)
    expect(result.toString('hex')).toBe('deadbeef')
  })

  it('should convert Uint8Array to Buffer', () => {
    const input = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
    const result = toBuffer(input)

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.toString('hex')).toBe('deadbeef')
  })

  it('should convert hex string to Buffer', () => {
    const input = 'deadbeef'
    const result = toBuffer(input)

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.toString('hex')).toBe('deadbeef')
  })

  it('should convert hex string with 0x prefix to Buffer', () => {
    const input = '0xdeadbeef'
    const result = toBuffer(input)

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.toString('hex')).toBe('deadbeef')
  })

  it('should handle empty inputs', () => {
    expect(toBuffer(Buffer.alloc(0)).length).toBe(0)
    expect(toBuffer(new Uint8Array(0)).length).toBe(0)
    expect(toBuffer('').length).toBe(0)
    expect(toBuffer('0x').length).toBe(0)
  })

  it('should handle large inputs', () => {
    const largeHex = 'ab'.repeat(1000)
    const result = toBuffer(largeHex)

    expect(result.length).toBe(1000)
    expect(result.toString('hex')).toBe(largeHex)
  })
})
