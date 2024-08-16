import type Transport from '@ledgerhq/hw-transport'

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

export type TransactionMetadataBlob = Buffer
export type TransactionBlob = Buffer
export type SS58Prefix = number

/**
 * @deprecated Moved to @zondax/ledger-js
 */
export const CHUNK_SIZE = 250

export const enum INS {
  GET_VERSION = 0x00,
  GET_ADDR = 0x01,
  SIGN = 0x02,
  SIGN_RAW = 0x03,

  // Allow list related commands
  /**
   * @deprecated
   */
  ALLOWLIST_GET_PUBKEY = 0x90,
  /**
   * @deprecated
   */
  ALLOWLIST_SET_PUBKEY = 0x91,
  /**
   * @deprecated
   */
  ALLOWLIST_GET_HASH = 0x92,
  /**
   * @deprecated
   */
  ALLOWLIST_UPLOAD = 0x93,
}

export type INS_SIGN = INS.SIGN | INS.SIGN_RAW

/**
 * @deprecated Moved to @zondax/ledger-js
 */
export const enum PAYLOAD_TYPE {
  INIT = 0x00,
  ADD = 0x01,
  LAST = 0x02,
}

export const enum P1_VALUES {
  ONLY_RETRIEVE = 0x00,
  SHOW_ADDRESS_IN_DEVICE = 0x01,
}

export const enum SCHEME {
  ED25519 = 0x00,
  /**
   * @deprecated This is deprecated and will be removed in future versions.
   */
  SR25519 = 0x01,
  ECDSA = 0x02,
}

export const enum ERROR_CODE {
  NoError = 0x9000,
  InvalidData = 0x6984,
}

/**
 * @deprecated Moved to @zondax/ledger-js
 */
export const ERROR_DESCRIPTION: Record<number, string> = {
  1: 'U2F: Unknown',
  2: 'U2F: Bad request',
  3: 'U2F: Configuration unsupported',
  4: 'U2F: Device Ineligible',
  5: 'U2F: Timeout',
  14: 'Timeout',
  0x9000: 'No errors',
  0x9001: 'Device is busy',
  0x6802: 'Error deriving keys',
  0x6400: 'Execution Error',
  0x6700: 'Wrong Length',
  0x6982: 'Empty Buffer',
  0x6983: 'Output buffer too small',
  0x6984: 'Data is invalid',
  0x6985: 'Conditions not satisfied',
  0x6986: 'Transaction rejected',
  0x6a80: 'Bad key handle',
  0x6b00: 'Invalid P1/P2',
  0x6d00: 'Instruction not supported',
  0x6e01: 'App does not seem to be open',
  0x6f00: 'Unknown error',
  0x6f01: 'Sign/verify error',
}

/**
 * @deprecated
 */
export interface SubstrateAppParams {
  name: string
  cla: number
  slip0044: number
  ss58_addr_type: number
}

/**
 * @deprecated
 */
export interface ResponseBase {
  error_message: string
  return_code: number
}

/**
 * @deprecated
 */
export interface ResponseAddress extends ResponseBase {
  address: string
  pubKey: string
}

export interface GenericeResponseAddress {
  address: string
  pubKey: string
}

/**
 * @deprecated
 */
export interface ResponseVersion extends ResponseBase {
  device_locked: boolean
  major: number
  minor: number
  patch: number
  test_mode: boolean
}

/**
 * @deprecated
 */
export interface ResponseAllowlistPubKey extends ResponseBase {
  pubKey: string
}

/**
 * @deprecated
 */
export interface ResponseAllowlistHash extends ResponseBase {
  hash: Buffer
}

/**
 * @deprecated
 */
export interface ResponseSign extends ResponseBase {
  signature: Buffer
}

export interface GenericResponseSign {
  signature: Buffer
}

/**
 * @deprecated Moved to @zondax/ledger-js
 */
export function errorCodeToString(statusCode: number) {
  if (statusCode in ERROR_DESCRIPTION) return ERROR_DESCRIPTION[statusCode]
  return `Unknown Status Code: ${statusCode}`
}

/**
 * @deprecated  Moved to @zondax/ledger-js
 */
function isDict(v: any) {
  return typeof v === 'object' && v !== null && !(v instanceof Array) && !(v instanceof Date)
}

/**
 * @deprecated  Moved to @zondax/ledger-js
 */
export function processErrorResponse(response: any) {
  if (response != null) {
    if (isDict(response)) {
      if (Object.prototype.hasOwnProperty.call(response, 'returnCode')) {
        return {
          return_code: response.returnCode,
          error_message: errorCodeToString(response.returnCode),
        }
      }

      if (Object.prototype.hasOwnProperty.call(response, 'statusCode')) {
        return {
          return_code: response.statusCode,
          error_message: errorCodeToString(response.statusCode),
        }
      }

      if (
        Object.prototype.hasOwnProperty.call(response, 'return_code') &&
        Object.prototype.hasOwnProperty.call(response, 'error_message')
      ) {
        return response
      }
    }

    return {
      return_code: 0xffff,
      error_message: response.toString(),
    }
  }

  return {
    return_code: 0xffff,
    error_message: response.toString(),
  }
}

export async function getVersion(transport: Transport, cla: number) {
  try {
    const response = await transport.send(cla, INS.GET_VERSION, 0, 0)
    const errorCodeData = response.subarray(-2)
    const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

    // 12 bytes + 2 error code (2 bytes per value on version)
    // 18 bytes + 2 error code (4 bytes per value on version)
    if (response.length !== 14 && response.length !== 20) {
      return {
        return_code: ERROR_CODE.InvalidData,
        error_message: errorCodeToString(ERROR_CODE.InvalidData),
      }
    }

    let major, minor, patch, deviceLocked, targetId

    if (response.length === 14) {
      // 12 bytes + 2 error code (2 bytes per value on version)
      major = response.readUInt16BE(1)
      minor = response.readUInt16BE(3)
      patch = response.readUInt16BE(5)
      deviceLocked = response[7] === 1
      targetId = (response[8] << 24) + (response[9] << 16) + (response[10] << 8) + (response[11] << 0)
    } else {
      // 18 bytes + 2 error code (4 bytes per value on version)
      major = response.readUInt32BE(1)
      minor = response.readUInt32BE(5)
      patch = response.readUInt32BE(9)
      deviceLocked = response[13] === 1
      targetId = (response[14] << 24) + (response[15] << 16) + (response[16] << 8) + (response[17] << 0)
    }

    // eslint-disable-next-line no-bitwise

    return {
      return_code: returnCode,
      error_message: errorCodeToString(returnCode),
      // ///
      test_mode: response[0] !== 0,
      major,
      minor,
      patch,
      deviceLocked,
      target_id: targetId.toString(16),
    }
  } catch (e) {
    return processErrorResponse(e)
  }
}

/**
 * @deprecated This function is deprecated and will be removed in future versions.
 */
export function serializePath(slip0044: number, account: number, change: number, addressIndex: number) {
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
 * @deprecated This interface has been extracted from the legacy implementation
 * it is to ensure backwards compatibility with the old implementation
 */
export interface ISubstrateAppLegacy {
  // constructor(transport: Transport, cla: number, slip0044: number) {
  //   if (transport == null) {
  //     throw new Error("Transport has not been defined");
  //   }
  //   this.transport = transport;
  //   this.cla = cla;
  //   this.slip0044 = slip0044;
  // }

  getVersion(): Promise<ResponseVersion>
  appInfo(): Promise<any>
  getAddress(
    account: number,
    change: number,
    addressIndex: number,
    requireConfirmation?: boolean,
    scheme?: SCHEME
  ): Promise<ResponseAddress>
  sign(account: number, change: number, addressIndex: number, message: Buffer, scheme?: SCHEME): Promise<ResponseSign>
  signRaw(account: number, change: number, addressIndex: number, message: Buffer, scheme?: SCHEME): Promise<ResponseSign>
}

export interface TxMetadata {
  txMetadata: string
}
