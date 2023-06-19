import type Transport from "@ledgerhq/hw-transport";

/** ******************************************************************************
 *  (c) 2019 - 2022 ZondaX AG
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
export const CHUNK_SIZE = 250;

export const INS = {
  GET_VERSION: 0x00,
  GET_ADDR: 0x01,
  SIGN: 0x02,

  // Allow list related commands
  ALLOWLIST_GET_PUBKEY: 0x90,
  ALLOWLIST_SET_PUBKEY: 0x91,
  ALLOWLIST_GET_HASH: 0x92,
  ALLOWLIST_UPLOAD: 0x93,
};

export const PAYLOAD_TYPE = {
  INIT: 0x00,
  ADD: 0x01,
  LAST: 0x02,
};

export const P1_VALUES = {
  ONLY_RETRIEVE: 0x00,
  SHOW_ADDRESS_IN_DEVICE: 0x01,
};

export const SCHEME = {
  ED25519: 0x00,
  SR25519: 0x01,
};

export const ERROR_CODE = {
  NoError: 0x9000,
};

export const ERROR_DESCRIPTION: any = {
  1: "U2F: Unknown",
  2: "U2F: Bad request",
  3: "U2F: Configuration unsupported",
  4: "U2F: Device Ineligible",
  5: "U2F: Timeout",
  14: "Timeout",
  0x9000: "No errors",
  0x9001: "Device is busy",
  0x6802: "Error deriving keys",
  0x6400: "Execution Error",
  0x6700: "Wrong Length",
  0x6982: "Empty Buffer",
  0x6983: "Output buffer too small",
  0x6984: "Data is invalid",
  0x6985: "Conditions not satisfied",
  0x6986: "Transaction rejected",
  0x6a80: "Bad key handle",
  0x6b00: "Invalid P1/P2",
  0x6d00: "Instruction not supported",
  0x6e01: "App does not seem to be open",
  0x6f00: "Unknown error",
  0x6f01: "Sign/verify error",
};

export interface SubstrateAppParams {
  name: string;
  cla: number;
  slip0044: number;
  ss58_addr_type: number;
}

export interface ResponseBase {
  error_message: string;
  return_code: number;
}

export interface ResponseAddress extends ResponseBase {
  address: string;
  pubKey: string;
}

export interface ResponseVersion extends ResponseBase {
  device_locked: boolean;
  major: number;
  minor: number;
  patch: number;
  test_mode: boolean;
}

export interface ResponseAllowlistPubKey extends ResponseBase {
  pubKey: string;
}

export interface ResponseAllowlistHash extends ResponseBase {
  hash: Buffer;
}

export interface ResponseSign extends ResponseBase {
  signature: Buffer;
}

export function errorCodeToString(statusCode: number) {
  if (statusCode in ERROR_DESCRIPTION) return ERROR_DESCRIPTION[statusCode];
  return `Unknown Status Code: ${statusCode}`;
}

function isDict(v: any) {
  return typeof v === "object" && v !== null && !(v instanceof Array) && !(v instanceof Date);
}

export function processErrorResponse(response: any) {
  if (response != null) {
    if (isDict(response)) {
      if (Object.prototype.hasOwnProperty.call(response, "statusCode")) {
        return {
          return_code: response.statusCode,
          error_message: errorCodeToString(response.statusCode),
        };
      }

      if (
        Object.prototype.hasOwnProperty.call(response, "return_code") &&
        Object.prototype.hasOwnProperty.call(response, "error_message")
      ) {
        return response;
      }
    }
    return {
      return_code: 0xffff,
      error_message: response.toString(),
    };
  }

  return {
    return_code: 0xffff,
    error_message: response.toString(),
  };
}

export async function getVersion(transport: Transport, cla: number) {
  return await transport.send(cla, INS.GET_VERSION, 0, 0).then((response) => {
    const errorCodeData = response.subarray(-2);
    const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

    // 12 bytes + 2 error code
    if (response.length !== 14) {
      return {
        return_code: 0x6984,
        error_message: errorCodeToString(0x6984),
      };
    }

    const major = response[1] * 256 + response[2];
    const minor = response[3] * 256 + response[4];
    const patch = response[5] * 256 + response[6];
    const deviceLocked = response[7] === 1;
    // eslint-disable-next-line no-bitwise
    const targetId = (response[8] << 24) + (response[9] << 16) + (response[10] << 8) + (response[11] << 0);

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
    };
  }, processErrorResponse);
}
