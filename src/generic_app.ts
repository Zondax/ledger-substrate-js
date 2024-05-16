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
import axios from 'axios'

import type Transport from '@ledgerhq/hw-transport'
import BaseApp, { INSGeneric, LedgerError, numbersToBip32Path, processErrorResponse, processResponse } from '@zondax/ledger-js'
import { ResponseError } from '@zondax/ledger-js/dist/responseError'

import { GenericResponseSign, GenericeResponseAddress, P1_VALUES, TxMetadata } from './common'

const GenericAppName = 'Polkadot'

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

  txMetadataSrvUrl?: string
  txMetadataChainId: string

  /**
   * Constructs a new PolkadotGenericApp instance.
   * @param {Transport} transport - The transport instance.
   * @param {string} txMetadataChainId - The chain ID in the transaction metadata service.
   * @param {string} [txMetadataSrvUrl] - The optional transaction metadata service URL.
   * @throws {Error} - If the transport is not defined.
   */
  constructor(transport: Transport, txMetadataChainId: string, txMetadataSrvUrl?: string) {
    super(transport, PolkadotGenericApp._params)
    this.txMetadataSrvUrl = txMetadataSrvUrl
    this.txMetadataChainId = txMetadataChainId

    if (!this.transport) {
      throw new Error('Transport has not been defined')
    }
  }

  /**
   * Retrieves transaction metadata from the metadata service.
   * @param {Buffer} txBlob - The transaction blob.
   * @returns {Promise<Buffer>} - The transaction metadata.
   * @throws {Error} - If the txMetadataSrvUrl is not defined.
   */
  async getTxMetadata(txBlob: Buffer): Promise<Buffer> {
    if (this.txMetadataSrvUrl === undefined) {
      throw new Error('txMetadataSrvUrl is not defined')
    }

    const resp = await axios.post<TxMetadata>(this.txMetadataSrvUrl, {
      txBlob: txBlob.toString('hex'),
      chain: { id: this.txMetadataChainId },
    })

    let txMetadata = resp.data.txMetadata
    if (txMetadata.slice(0, 2) === '0x') {
      txMetadata = txMetadata.slice(2)
    }

    return Buffer.from(txMetadata, 'hex')
  }

  /**
   * Retrieves the address for a given BIP44 path and SS58 prefix.
   * @param {string} bip44Path - The BIP44 path.
   * @param {number} ss58prefix - The SS58 prefix, must be an integer up to 65535.
   * @param {boolean} [showAddrInDevice=false] - Whether to show the address on the device.
   * @returns {Promise<GenericeResponseAddress>} - The address response.
   * @throws {ResponseError} If the response from the device indicates an error.
   */
  async getAddress(bip44Path: string, ss58prefix: number, showAddrInDevice = false): Promise<GenericeResponseAddress> {
    // needs to be integer, and up to 65535
    if (!Number.isInteger(ss58prefix) || ss58prefix < 0 || ss58prefix >> 16 !== 0) {
      throw new ResponseError(
        LedgerError.ConditionsOfUseNotSatisfied,
        `Unexpected ss58prefix ${ss58prefix}. Needs to be a non-negative integer up to 2^16`
      )
    }

    const bip44PathBuffer = this.serializePath(bip44Path)
    const prefixBuffer = Buffer.alloc(2)
    prefixBuffer.writeUInt16LE(ss58prefix)
    const payload = Buffer.concat([bip44PathBuffer, prefixBuffer])

    const p1 = showAddrInDevice ? P1_VALUES.SHOW_ADDRESS_IN_DEVICE : P1_VALUES.ONLY_RETRIEVE
    try {
      const responseBuffer = await this.transport.send(this.CLA, this.INS.GET_ADDR, p1, 0, payload)

      const response = processResponse(responseBuffer)

      const pubKey = response.readBytes(32).toString('hex')
      const address = response.readBytes(response.length()).toString('ascii')

      return {
        pubKey,
        address,
      } as GenericeResponseAddress
    } catch (e) {
      throw processErrorResponse(e)
    }
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

  private getSignReqChunks(path: string, txBlob: Buffer, metadata?: Buffer) {
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
   * @param {string} path - The BIP44 path.
   * @param {number} ins - The instruction for signing.
   * @param {Buffer} blob - The transaction blob.
   * @param {Buffer} [metadata] - The optional metadata.
   * @returns {Promise<GenericResponseSign>} - The response containing the signature and status.
   */
  private async signImpl(path: string, ins: number, blob: Buffer, metadata?: Buffer): Promise<GenericResponseSign> {
    const chunks = this.getSignReqChunks(path, blob, metadata)

    try {
      let result = await this.signSendChunk(ins, 1, chunks.length, chunks[0])

      for (let i = 1; i < chunks.length; i += 1) {
        result = await this.signSendChunk(ins, 1 + i, chunks.length, chunks[i])
      }

      return {
        signature: result.readBytes(result.length()),
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  /**
   * Signs a transaction blob and retrieves the metadata.
   * @param {string} path - The BIP44 path.
   * @param {Buffer} txBlob - The transaction blob.
   * @returns {Promise<GenericResponseSign>} - The response containing the signature and status.
   */
  async sign(path: string, txBlob: Buffer) {
    const txMetadata = await this.getTxMetadata(txBlob)
    return await this.signImpl(path, this.INS.SIGN, txBlob, txMetadata)
  }

  /**
   * Signs a transaction blob with provided metadata.
   * @param {string} path - The BIP44 path.
   * @param {Buffer} txBlob - The transaction blob.
   * @param {Buffer} txMetadata - The transaction metadata.
   * @returns {Promise<GenericResponseSign>} - The response containing the signature and status.
   */
  async signAdvanced(path: string, txBlob: Buffer, txMetadata: Buffer) {
    return await this.signImpl(path, this.INS.SIGN, txBlob, txMetadata)
  }

  /**
   * Signs a raw transaction blob.
   * @param {string} path - The BIP44 path.
   * @param {Buffer} txBlob - The transaction blob.
   * @returns {Promise<GenericResponseSign>} - The response containing the signature and status.
   */
  async signRaw(path: string, txBlob: Buffer) {
    return await this.signImpl(path, this.INS.SIGN_RAW, txBlob)
  }
}
