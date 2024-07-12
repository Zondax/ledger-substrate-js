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
import type Transport from '@ledgerhq/hw-transport'

import {
  CHUNK_SIZE,
  ERROR_CODE,
  INS,
  type INS_SIGN,
  ISubstrateAppLegacy,
  PAYLOAD_TYPE,
  type ResponseAddress,
  type ResponseAllowlistHash,
  type ResponseAllowlistPubKey,
  type ResponseSign,
  type ResponseVersion,
  SCHEME,
  errorCodeToString,
  getVersion,
  processErrorResponse,
} from './common'

/**
 * Class representing a Substrate application.
 */
export class SubstrateApp implements ISubstrateAppLegacy {
  transport: Transport
  cla: number
  slip0044: number

  /**
   * Create a SubstrateApp instance.
   * @param transport - The transport instance.
   * @param cla - The CLA value.
   * @param slip0044 - The SLIP-0044 value.
   */
  constructor(transport: Transport, cla: number, slip0044: number) {
    if (transport == null) {
      throw new Error('Transport has not been defined')
    }
    this.transport = transport
    this.cla = cla
    this.slip0044 = slip0044
  }

  /**
   * Serialize the BIP44 path.
   * @param slip0044 - The SLIP-0044 value.
   * @param account - The account index.
   * @param change - The change index.
   * @param addressIndex - The address index.
   * @returns The serialized path.
   */
  static serializePath(slip0044: number, account: number, change: number, addressIndex: number) {
    if (!Number.isInteger(account)) throw new Error('Input must be an integer')
    if (!Number.isInteger(change)) throw new Error('Input must be an integer')
    if (!Number.isInteger(addressIndex)) throw new Error('Input must be an integer')

    const buf = Buffer.alloc(20)
    buf.writeUInt32LE(0x8000002c, 0)
    buf.writeUInt32LE(slip0044, 4)
    buf.writeUInt32LE(account, 8)
    buf.writeUInt32LE(change, 12)
    buf.writeUInt32LE(addressIndex, 16)
    return buf
  }

  /**
   * Split a message into chunks.
   * @param message - The message to split.
   * @returns The message chunks.
   */
  static GetChunks(message: Buffer) {
    const chunks = []
    const buffer = Buffer.from(message)

    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      let end = i + CHUNK_SIZE
      if (i > buffer.length) {
        end = buffer.length
      }
      chunks.push(buffer.subarray(i, end))
    }

    return chunks
  }

  /**
   * Get chunks for signing.
   * @param slip0044 - The SLIP-0044 value.
   * @param account - The account index.
   * @param change - The change index.
   * @param addressIndex - The address index.
   * @param message - The message to sign.
   * @returns The chunks for signing.
   */
  static signGetChunks(slip0044: number, account: number, change: number, addressIndex: number, message: Buffer) {
    const chunks = []
    const bip44Path = SubstrateApp.serializePath(slip0044, account, change, addressIndex)
    chunks.push(bip44Path)
    chunks.push(...SubstrateApp.GetChunks(message))
    return chunks
  }

  /**
   * Get the version of the application.
   * @returns The version response.
   */
  async getVersion(): Promise<ResponseVersion> {
    try {
      return await getVersion(this.transport, this.cla)
    } catch (e) {
      return processErrorResponse(e)
    }
  }

  /**
   * Get application information.
   * @returns The application information.
   */
  async appInfo() {
    return await this.transport.send(0xb0, 0x01, 0, 0).then(response => {
      const errorCodeData = response.subarray(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

      let appName = ''
      let appVersion = ''
      let flagLen = 0
      let flagsValue = 0

      if (response[0] !== 1) {
        // Ledger responds with format ID 1. There is no spec for any format != 1
        return {
          return_code: 0x9001,
          error_message: 'response format ID not recognized',
        }
      } else {
        const appNameLen = response[1]
        appName = response.subarray(2, 2 + appNameLen).toString('ascii')
        let idx = 2 + appNameLen
        const appVersionLen = response[idx]
        idx += 1
        appVersion = response.subarray(idx, idx + appVersionLen).toString('ascii')
        idx += appVersionLen
        const appFlagsLen = response[idx]
        idx += 1
        flagLen = appFlagsLen
        flagsValue = response[idx]
      }

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
        appName: appName === '' || 'err',
        appVersion: appVersion === '' || 'err',
        flagLen,
        flagsValue,
        flag_recovery: (flagsValue & 1) !== 0,
        flag_signed_mcu_code: (flagsValue & 2) !== 0,
        flag_onboarded: (flagsValue & 4) !== 0,
        flag_pin_validated: (flagsValue & 128) !== 0,
      }
    }, processErrorResponse)
  }

  /**
   * Get the address.
   * @param account - The account index.
   * @param change - The change index.
   * @param addressIndex - The address index.
   * @param [requireConfirmation=false] - Whether confirmation is required.
   * @param [scheme=SCHEME.ED25519] - The scheme.
   * @returns The address response.
   */
  async getAddress(
    account: number,
    change: number,
    addressIndex: number,
    requireConfirmation = false,
    scheme = SCHEME.ED25519
  ): Promise<ResponseAddress> {
    const bip44Path = SubstrateApp.serializePath(this.slip0044, account, change, addressIndex)

    let p1 = 0
    if (requireConfirmation) p1 = 1

    let p2 = 0
    if (!isNaN(scheme)) p2 = scheme

    return await this.transport.send(this.cla, INS.GET_ADDR, p1, p2, bip44Path).then(response => {
      const errorCodeData = response.subarray(-2)
      const errorCode = errorCodeData[0] * 256 + errorCodeData[1]

      let pubkeyLen = 32
      if (scheme == SCHEME.ECDSA) {
        pubkeyLen = 33
      }

      return {
        pubKey: response.subarray(0, pubkeyLen).toString('hex'),
        address: response.subarray(pubkeyLen, response.length - 2).toString('ascii'),
        return_code: errorCode,
        error_message: errorCodeToString(errorCode),
      }
    }, processErrorResponse)
  }

  /**
   * Send a chunk for signing.
   * @private
   * @param chunkIdx - The chunk index.
   * @param chunkNum - The total number of chunks.
   * @param chunk - The chunk data.
   * @param [scheme=SCHEME.ED25519] - The scheme.
   * @param [ins=INS.SIGN] - The instruction.
   * @returns The response.
   */
  private async signSendChunk(chunkIdx: number, chunkNum: number, chunk: Buffer, scheme = SCHEME.ED25519, ins: INS_SIGN = INS.SIGN) {
    let payloadType = PAYLOAD_TYPE.ADD
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST
    }

    let p2 = 0
    if (!isNaN(scheme)) p2 = scheme

    return await this.transport.send(this.cla, ins, payloadType, p2, chunk, [ERROR_CODE.NoError, 0x6984, 0x6a80]).then(response => {
      const errorCodeData = response.subarray(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]
      let errorMessage = errorCodeToString(returnCode)
      let signature = null

      if (returnCode === 0x6a80 || returnCode === 0x6984) {
        errorMessage = response.subarray(0, response.length - 2).toString('ascii')
      } else if (response.length > 2) {
        signature = response.subarray(0, response.length - 2)
      }

      return {
        signature,
        return_code: returnCode,
        error_message: errorMessage,
      }
    }, processErrorResponse)
  }

  /**
   * Implementation of the signing process.
   * @private
   * @param account - The account index.
   * @param change - The change index.
   * @param addressIndex - The address index.
   * @param message - The message to sign.
   * @param ins - The instruction.
   * @param [scheme=SCHEME.ED25519] - The scheme.
   * @returns The signing response.
   */
  private async signImpl(
    account: number,
    change: number,
    addressIndex: number,
    message: Buffer,
    ins: INS_SIGN,
    scheme = SCHEME.ED25519
  ): Promise<ResponseSign> {
    const chunks = SubstrateApp.signGetChunks(this.slip0044, account, change, addressIndex, message)
    return await this.signSendChunk(1, chunks.length, chunks[0], scheme, ins).then(async () => {
      let result
      for (let i = 1; i < chunks.length; i += 1) {
        result = await this.signSendChunk(1 + i, chunks.length, chunks[i], scheme, ins)
        if (result.return_code !== ERROR_CODE.NoError) {
          break
        }
      }

      return {
        return_code: result.return_code,
        error_message: result.error_message,
        signature: result.signature,
      }
    }, processErrorResponse)
  }

  /**
   * Sign a message.
   * @param account - The account index.
   * @param change - The change index.
   * @param addressIndex - The address index.
   * @param message - The message to sign.
   * @param [scheme=SCHEME.ED25519] - The scheme.
   * @returns The signing response.
   */
  async sign(account: number, change: number, addressIndex: number, message: Buffer, scheme = SCHEME.ED25519) {
    return await this.signImpl(account, change, addressIndex, message, INS.SIGN, scheme)
  }

  /**
   * Sign a raw message.
   * @param account - The account index.
   * @param change - The change index.
   * @param addressIndex - The address index.
   * @param message - The message to sign.
   * @param [scheme=SCHEME.ED25519] - The scheme.
   * @returns The signing response.
   */
  async signRaw(account: number, change: number, addressIndex: number, message: Buffer, scheme = SCHEME.ED25519) {
    return await this.signImpl(account, change, addressIndex, message, INS.SIGN_RAW, scheme)
  }

  /**
   * @deprecated This function is deprecated and will be removed in future versions.
   * Get the allowlist public key.
   * @returns The allowlist public key response.
   */
  async getAllowlistPubKey(): Promise<ResponseAllowlistPubKey> {
    return await this.transport.send(this.cla, INS.ALLOWLIST_GET_PUBKEY, 0, 0).then(response => {
      const errorCodeData = response.subarray(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

      console.log(response)

      const pubkey = response.subarray(0, 32)
      // 32 bytes + 2 error code
      if (response.length !== 34) {
        return {
          return_code: 0x6984,
          error_message: errorCodeToString(0x6984),
        }
      }

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
        pubkey,
      }
    }, processErrorResponse)
  }

  /**
   * @deprecated This function is deprecated and will be removed in future versions.
   * Set the allowlist public key.
   * @param pk - The public key.
   * @returns The response.
   */
  async setAllowlistPubKey(pk: Buffer) {
    return await this.transport.send(this.cla, INS.ALLOWLIST_SET_PUBKEY, 0, 0, pk).then(response => {
      const errorCodeData = response.subarray(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
      }
    }, processErrorResponse)
  }

  /**
   * @deprecated This function is deprecated and will be removed in future versions.
   * Get the allowlist hash.
   * @returns The allowlist hash response.
   */
  async getAllowlistHash(): Promise<ResponseAllowlistHash> {
    return await this.transport.send(this.cla, INS.ALLOWLIST_GET_HASH, 0, 0).then(response => {
      const errorCodeData = response.subarray(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

      console.log(response)

      const hash = response.subarray(0, 32)
      // 32 bytes + 2 error code
      if (response.length !== 34) {
        return {
          return_code: 0x6984,
          error_message: errorCodeToString(0x6984),
        }
      }

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
        hash,
      }
    }, processErrorResponse)
  }

  /**
   * @deprecated This function is deprecated and will be removed in future versions.
   * Send a chunk for uploading the allowlist.
   * @param chunkIdx - The chunk index.
   * @param chunkNum - The total number of chunks.
   * @param chunk - The chunk data.
   * @returns The response.
   */
  async uploadSendChunk(chunkIdx: number, chunkNum: number, chunk: Buffer) {
    let payloadType = PAYLOAD_TYPE.ADD
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST
    }

    return await this.transport.send(this.cla, INS.ALLOWLIST_UPLOAD, payloadType, 0, chunk, [ERROR_CODE.NoError]).then(response => {
      const errorCodeData = response.subarray(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]
      const errorMessage = errorCodeToString(returnCode)

      return {
        return_code: returnCode,
        error_message: errorMessage,
      }
    }, processErrorResponse)
  }

  /**
   * @deprecated This function is deprecated and will be removed in future versions.
   * Upload the allowlist.
   * @param message - The allowlist message.
   * @returns The response.
   */
  async uploadAllowlist(message: Buffer) {
    const chunks: Buffer[] = []
    chunks.push(Buffer.from([0]))
    chunks.push(...SubstrateApp.GetChunks(message))

    return await this.uploadSendChunk(1, chunks.length, chunks[0]).then(async result => {
      if (result.return_code !== ERROR_CODE.NoError) {
        return {
          return_code: result.return_code,
          error_message: result.error_message,
        }
      }

      for (let i = 1; i < chunks.length; i += 1) {
        result = await this.uploadSendChunk(1 + i, chunks.length, chunks[i])
        if (result.return_code !== ERROR_CODE.NoError) {
          break
        }
      }

      return {
        return_code: result.return_code,
        error_message: result.error_message,
      }
    }, processErrorResponse)
  }
}
