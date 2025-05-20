/** ******************************************************************************
 *  (c) 2019 - 2024 Zondax AG
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
import axios from 'axios'

import type Transport from '@ledgerhq/hw-transport'
import BaseApp, { BIP32Path, INSGeneric, LedgerError, ResponseError, processErrorResponse, processResponse } from '@zondax/ledger-js'

import {
  ECDSA_PUBKEY_LEN,
  ED25519_PUBKEY_LEN,
  GenericResponseSign,
  GenericResponseSignEcdsa,
  GenericeResponseAddress,
  P1_VALUES,
  SCHEME,
  SS58Prefix,
  TransactionBlob,
  TransactionMetadataBlob,
  TxMetadata,
} from './common'

export class PolkadotGenericApp extends BaseApp {
  static _INS = {
    GET_VERSION: 0x00 as number,
    GET_ADDR: 0x01 as number,
    SIGN: 0x02 as number,
    SIGN_RAW: 0x03 as number,
  }

  static _params = {
    cla: 0xf9,
    ins: { ...PolkadotGenericApp._INS } as INSGeneric,
    p1Values: { ONLY_RETRIEVE: 0x00 as 0, SHOW_ADDRESS_IN_DEVICE: 0x01 as 1 },
    chunkSize: 250,
    requiredPathLengths: [5],
  }

  txMetadataChainId?: string
  txMetadataSrvUrl?: string

  /**
   * Constructs a new PolkadotGenericApp instance.
   * @param transport - The transport instance.
   * @param txMetadataChainId - The chain ID in the transaction metadata service.
   * @param txMetadataSrvUrl - The optional transaction metadata service URL.
   * @throws {Error} - If the transport is not defined.
   */
  constructor(transport: Transport, txMetadataChainId?: string, txMetadataSrvUrl?: string) {
    super(transport, PolkadotGenericApp._params)
    this.txMetadataSrvUrl = txMetadataSrvUrl
    this.txMetadataChainId = txMetadataChainId

    if (!this.transport) {
      throw new Error('Transport has not been defined')
    }
  }

  /**
   * Retrieves transaction metadata from the metadata service.
   * @param txBlob - The transaction blob.
   * @param txMetadataChainId - The optional chain ID for the transaction metadata service. This value temporarily overrides the one set in the constructor.
   * @param txMetadataSrvUrl - The optional URL for the transaction metadata service. This value temporarily overrides the one set in the constructor.
   * @returns The transaction metadata.
   * @throws {ResponseError} - If the txMetadataSrvUrl is not defined.
   */
  async getTxMetadata(txBlob: TransactionBlob, txMetadataChainId?: string, txMetadataSrvUrl?: string): Promise<TransactionMetadataBlob> {
    const txMetadataChainIdVal = txMetadataChainId ?? this.txMetadataChainId
    const txMetadataSrvUrlVal = txMetadataSrvUrl ?? this.txMetadataSrvUrl

    if (!txMetadataChainIdVal) {
      throw new ResponseError(
        LedgerError.GenericError,
        'txMetadataSrvUrl is not defined or is empty. The use of the method requires access to a metadata shortening service.'
      )
    }

    if (!txMetadataSrvUrlVal) {
      throw new ResponseError(
        LedgerError.GenericError,
        'txMetadataChainId is not defined or is empty. These values are configured in the metadata shortening service. Check the corresponding configuration in the service.'
      )
    }

    const resp = await axios.post<TxMetadata>(txMetadataSrvUrlVal, {
      txBlob: txBlob.toString('hex'),
      chain: { id: txMetadataChainIdVal },
    })

    let txMetadata = resp.data.txMetadata
    if (txMetadata.slice(0, 2) === '0x') {
      txMetadata = txMetadata.slice(2)
    }

    return Buffer.from(txMetadata, 'hex')
  }

  /**
   * @deprecated Use getAddressEcdsa or getAddressEd25519 instead. This method will be removed in a future version.
   * Retrieves the address for a given BIP44 path and SS58 prefix.
   * @param bip44Path - The BIP44 path.
   * @param ss58prefix - The SS58 prefix, must be an integer up to 65535.
   * @param showAddrInDevice - Whether to show the address on the device.
   * @param scheme - The scheme to use for the address. Default is ED25519.
   * @returns The address response.
   * @throws {ResponseError} If the response from the device indicates an error.
   */
  async getAddress(
    bip44Path: BIP32Path,
    ss58prefix: SS58Prefix,
    showAddrInDevice = false,
    scheme = SCHEME.ED25519
  ): Promise<GenericeResponseAddress> {
    // needs to be integer, and up to 65535
    if (!Number.isInteger(ss58prefix) || ss58prefix < 0 || ss58prefix >> 16 !== 0) {
      throw new ResponseError(
        LedgerError.ConditionsOfUseNotSatisfied,
        `Unexpected ss58prefix ${ss58prefix}. Needs to be a non-negative integer up to 2^16`
      )
    }

    if (scheme != SCHEME.ECDSA && scheme != SCHEME.ED25519) {
      throw new ResponseError(LedgerError.ConditionsOfUseNotSatisfied, `Unexpected scheme ${scheme}. Needs to be ECDSA (2) or ED25519 (0)`)
    }

    const bip44PathBuffer = this.serializePath(bip44Path)
    const prefixBuffer = Buffer.alloc(2)
    prefixBuffer.writeUInt16LE(ss58prefix)

    let payload = bip44PathBuffer
    if (scheme === SCHEME.ED25519) {
      payload = Buffer.concat([payload, prefixBuffer])
    }

    const p1 = showAddrInDevice ? P1_VALUES.SHOW_ADDRESS_IN_DEVICE : P1_VALUES.ONLY_RETRIEVE
    try {
      const responseBuffer = await this.transport.send(this.CLA, this.INS.GET_ADDR, p1, scheme ?? SCHEME.ED25519, payload)

      const response = processResponse(responseBuffer)

      const currentScheme = (scheme ?? SCHEME.ED25519) as number
      const pubKeyLen = currentScheme === SCHEME.ECDSA ? ECDSA_PUBKEY_LEN : ED25519_PUBKEY_LEN
      const pubKey = response.readBytes(pubKeyLen).toString('hex')

      let address = ''
      if (currentScheme === SCHEME.ECDSA) {
        address = response.readBytes(response.length()).toString('hex')
      } else {
        address = response.readBytes(response.length()).toString('ascii')
      }

      return {
        pubKey,
        address,
      } as GenericeResponseAddress
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  /**
   * Retrieves the address for a given BIP44 path using the ECDSA scheme.
   * @param bip44Path - The BIP44 path.
   * @param showAddrInDevice - Whether to show the address on the device.
   * @returns The address response.
   * @throws {ResponseError} If the response from the device indicates an error.
   */
  async getAddressEcdsa(bip44Path: BIP32Path, showAddrInDevice = false) {
    return this.getAddress(bip44Path, 0, showAddrInDevice, SCHEME.ECDSA)
  }

  /**
   * Retrieves the address for a given BIP44 path and SS58 prefix using the ED25519 scheme.
   * @param bip44Path - The BIP44 path.
   * @param ss58prefix - The SS58 prefix.
   * @param showAddrInDevice - Whether to show the address on the device.
   * @returns The address response.
   * @throws {ResponseError} If the response from the device indicates an error.
   */
  async getAddressEd25519(bip44Path: BIP32Path, ss58prefix: SS58Prefix, showAddrInDevice = false) {
    return this.getAddress(bip44Path, ss58prefix, showAddrInDevice)
  }

  private splitBufferToChunks(message: Buffer, chunkSize: number) {
    const chunks = []
    const buffer = Buffer.from(message)

    for (let i = 0; i < buffer.length; i += chunkSize) {
      let end = i + chunkSize
      if (i > buffer.length) {
        end = buffer.length
      }
      chunks.push(buffer.subarray(i, end))
    }

    return chunks
  }

  private getSignReqChunks(path: BIP32Path, txBlob: TransactionBlob, metadata?: TransactionMetadataBlob) {
    const chunks: Buffer[] = []
    const bip44Path = this.serializePath(path)

    const blobLen = Buffer.alloc(2)
    blobLen.writeUInt16LE(txBlob.length)

    chunks.push(Buffer.concat([bip44Path, blobLen]))

    if (metadata == null) {
      chunks.push(...this.splitBufferToChunks(txBlob, this.CHUNK_SIZE))
    } else {
      chunks.push(...this.splitBufferToChunks(Buffer.concat([txBlob, metadata]), this.CHUNK_SIZE))
    }

    return chunks
  }

  /**
   * Signs a transaction blob.
   * @param path - The BIP44 path.
   * @param ins - The instruction for signing.
   * @param blob - The transaction blob.
   * @param metadata - The optional metadata.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  private async signImplEd25519(
    path: BIP32Path,
    ins: number,
    blob: TransactionBlob,
    metadata?: TransactionMetadataBlob
  ): Promise<GenericResponseSign> {
    const chunks = this.getSignReqChunks(path, blob, metadata)

    try {
      let result = await this.sendGenericChunk(ins, SCHEME.ED25519, 1, chunks.length, chunks[0])

      for (let i = 1; i < chunks.length; i += 1) {
        result = await this.sendGenericChunk(ins, SCHEME.ED25519, 1 + i, chunks.length, chunks[i])
      }

      return {
        signature: result.readBytes(result.length()),
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  /**
   * Signs a transaction blob using the ECDSA scheme.
   * @param path - The BIP44 path.
   * @param ins - The instruction for signing.
   * @param blob - The transaction blob.
   * @param metadata - The optional metadata.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  private async signImplEcdsa(
    path: BIP32Path,
    ins: number,
    blob: TransactionBlob,
    metadata?: TransactionMetadataBlob
  ): Promise<GenericResponseSignEcdsa> {
    const chunks = this.getSignReqChunks(path, blob, metadata)

    try {
      let result = await this.sendGenericChunk(ins, SCHEME.ECDSA, 1, chunks.length, chunks[0])

      for (let i = 1; i < chunks.length; i += 1) {
        result = await this.sendGenericChunk(ins, SCHEME.ECDSA, 1 + i, chunks.length, chunks[i])
      }

      return {
        r: result.readBytes(32),
        s: result.readBytes(32),
        v: result.readBytes(1),
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  /**
   * @deprecated Use signEcdsa or signEd25519 instead. This method will be removed in a future version.
   * Signs a transaction blob retrieving the correct metadata from a metadata service.
   * @param path - The BIP44 path.
   * @param txBlob - The transaction blob.
   * @param scheme - The scheme to use for the signing. Default is ED25519.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  async sign(path: BIP32Path, txBlob: TransactionBlob, scheme = SCHEME.ED25519) {
    if (scheme != SCHEME.ECDSA && scheme != SCHEME.ED25519) {
      throw new ResponseError(LedgerError.ConditionsOfUseNotSatisfied, `Unexpected scheme ${scheme}. Needs to be ECDSA (2) or ED25519 (0)`)
    }
    if (scheme === SCHEME.ECDSA) {
      return await this.signEcdsa(path, txBlob)
    }
    return await this.signEd25519(path, txBlob)
  }

  /**
   * Signs a transaction blob using the ED25519 scheme.
   * @param path - The BIP44 path.
   * @param txBlob - The transaction blob.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  async signEd25519(path: BIP32Path, txBlob: TransactionBlob) {
    if (!this.txMetadataSrvUrl) {
      throw new ResponseError(
        LedgerError.GenericError,
        'txMetadataSrvUrl is not defined or is empty. The use of the method requires access to a metadata shortening service.'
      )
    }

    if (!this.txMetadataChainId) {
      throw new ResponseError(
        LedgerError.GenericError,
        'txMetadataChainId is not defined or is empty. These values are configured in the metadata shortening service. Check the corresponding configuration in the service.'
      )
    }

    const txMetadata = await this.getTxMetadata(txBlob)
    return await this.signImplEd25519(path, this.INS.SIGN, txBlob, txMetadata)
  }

  /**
   * Signs a transaction blob using the ECDSA scheme.
   * @param path - The BIP44 path.
   * @param txBlob - The transaction blob.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  async signEcdsa(path: BIP32Path, txBlob: TransactionBlob) {
    if (!this.txMetadataSrvUrl) {
      throw new ResponseError(
        LedgerError.GenericError,
        'txMetadataSrvUrl is not defined or is empty. The use of the method requires access to a metadata shortening service.'
      )
    }

    if (!this.txMetadataChainId) {
      throw new ResponseError(
        LedgerError.GenericError,
        'txMetadataChainId is not defined or is empty. These values are configured in the metadata shortening service. Check the corresponding configuration in the service.'
      )
    }

    const txMetadata = await this.getTxMetadata(txBlob)
    return await this.signImplEcdsa(path, this.INS.SIGN, txBlob, txMetadata)
  }

  /**
   * Signs a transaction blob with provided metadata.
   * @param path - The BIP44 path.
   * @param txBlob - The transaction blob.
   * @param txMetadataChainId - The optional chain ID for the transaction metadata service. This value temporarily overrides the one set in the constructor.
   * @param txMetadataSrvUrl - The optional URL for the transaction metadata service. This value temporarily overrides the one set in the constructor.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  async signMigration(path: BIP32Path, txBlob: TransactionBlob, txMetadataChainId?: string, txMetadataSrvUrl?: string) {
    if (!this.txMetadataSrvUrl) {
      throw new ResponseError(
        LedgerError.GenericError,
        'txMetadataSrvUrl is not defined or is empty. The use of the method requires access to a metadata shortening service.'
      )
    }

    if (!this.txMetadataChainId) {
      throw new ResponseError(
        LedgerError.GenericError,
        'txMetadataChainId is not defined or is empty. These values are configured in the metadata shortening service. Check the corresponding configuration in the service.'
      )
    }

    const txMetadata = await this.getTxMetadata(txBlob, txMetadataChainId, txMetadataSrvUrl)
    return await this.signImplEd25519(path, this.INS.SIGN, txBlob, txMetadata)
  }
  /**
   * @deprecated Use signRawEcdsa or signRawEd25519 instead. This method will be removed in a future version.
   * Signs a raw transaction blob.
   * @param path - The BIP44 path.
   * @param txBlob - The transaction blob.
   * @param scheme - The scheme to use for the signing. Default is ED25519.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  async signRaw(path: BIP32Path, txBlob: TransactionBlob, scheme = SCHEME.ED25519) {
    if (scheme != SCHEME.ECDSA && scheme != SCHEME.ED25519) {
      throw new ResponseError(LedgerError.ConditionsOfUseNotSatisfied, `Unexpected scheme ${scheme}. Needs to be ECDSA (2) or ED25519 (0)`)
    }
    if (scheme === SCHEME.ECDSA) {
      return await this.signRawEcdsa(path, txBlob)
    }
    return await this.signRawEd25519(path, txBlob)
  }

  /**
   * Signs a raw transaction blob using the ED25519 scheme.
   * @param path - The BIP44 path.
   * @param txBlob - The transaction blob.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  async signRawEd25519(path: BIP32Path, txBlob: TransactionBlob) {
    return await this.signImplEd25519(path, this.INS.SIGN_RAW, txBlob)
  }

  /**
   * Signs a raw transaction blob using the ECDSA scheme.
   * @param path - The BIP44 path.
   * @param txBlob - The transaction blob.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  async signRawEcdsa(path: BIP32Path, txBlob: TransactionBlob) {
    return await this.signImplEcdsa(path, this.INS.SIGN_RAW, txBlob)
  }

  /**
   * @deprecated Use signWithMetadataEd25519 or signWithMetadataEcdsa instead. This method will be removed in a future version.
   * [Expert-only Method] Signs a transaction blob with provided metadata (this could be used also with a migration app)
   * @param path - The BIP44 path.
   * @param txBlob - The transaction blob.
   * @param txMetadata - The transaction metadata.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  async signWithMetadata(path: BIP32Path, txBlob: TransactionBlob, txMetadata: TransactionMetadataBlob, scheme = SCHEME.ED25519) {
    if (scheme != SCHEME.ECDSA && scheme != SCHEME.ED25519) {
      throw new ResponseError(LedgerError.ConditionsOfUseNotSatisfied, `Unexpected scheme ${scheme}. Needs to be ECDSA (2) or ED25519 (0)`)
    }
    if (scheme === SCHEME.ECDSA) {
      return await this.signWithMetadataEcdsa(path, txBlob, txMetadata)
    }
    return await this.signWithMetadataEd25519(path, txBlob, txMetadata)
  }

  /**
   * Signs a transaction blob with provided metadata using the ECDSA scheme.
   * @param path - The BIP44 path.
   * @param txBlob - The transaction blob.
   * @param txMetadata - The transaction metadata.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  async signWithMetadataEcdsa(path: BIP32Path, txBlob: TransactionBlob, txMetadata: TransactionMetadataBlob) {
    return await this.signImplEcdsa(path, this.INS.SIGN, txBlob, txMetadata)
  }

  /**
   * Signs a transaction blob with provided metadata using the ED25519 scheme.
   * @param path - The BIP44 path.
   * @param txBlob - The transaction blob.
   * @param txMetadata - The transaction metadata.
   * @throws {ResponseError} If the response from the device indicates an error.
   * @returns The response containing the signature and status.
   */
  async signWithMetadataEd25519(path: BIP32Path, txBlob: TransactionBlob, txMetadata: TransactionMetadataBlob) {
    return await this.signImplEd25519(path, this.INS.SIGN, txBlob, txMetadata)
  }
}
