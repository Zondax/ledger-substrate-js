import { PolkadotGenericApp } from '../src'

describe('Utility Functions', () => {
  describe('parseEcdsaSignature', () => {
    it('should correctly parse a valid ECDSA signature', () => {
      // Use the provided mock signature data
      const mockSignatureHex =
        '0049e82e90885000e41ca31927dd9c6074fc8833a82b96dffb60a5079d910a36141551d915ee9f255e3730d485486f7b76d7b5b94131916ede850a53562453f106'
      const mockSignature = Buffer.from(mockSignatureHex, 'hex')

      const result = PolkadotGenericApp.parseEcdsaSignature(mockSignature)

      // Check the structure
      expect(result).toHaveProperty('r')
      expect(result).toHaveProperty('s')
      expect(result).toHaveProperty('v')

      // Check the lengths
      expect(result.r).toHaveLength(64) // 32 bytes in hex = 64 chars
      expect(result.s).toHaveLength(64) // 32 bytes in hex = 64 chars
      expect(result.v).toHaveLength(2) // 1 byte in hex = 2 chars

      // Check the values match the input
      expect(result.r).toBe('0049e82e90885000e41ca31927dd9c6074fc8833a82b96dffb60a5079d910a36')
      expect(result.s).toBe('141551d915ee9f255e3730d485486f7b76d7b5b94131916ede850a53562453f1')
      expect(result.v).toBe('06')
    })

    it('should throw error for invalid signature length', () => {
      // Create an invalid length buffer
      const invalidSignature = Buffer.alloc(64) // 64 bytes instead of 65

      expect(() => {
        PolkadotGenericApp.parseEcdsaSignature(invalidSignature)
      }).toThrow('Invalid ECDSA signature length')
    })
  })
})
