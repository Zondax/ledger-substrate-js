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
import type Transport from "@ledgerhq/hw-transport";
import {
  CHUNK_SIZE,
  errorCodeToString,
  ERROR_CODE,
  getVersion,
  INS,
  PAYLOAD_TYPE,
  processErrorResponse,
  type ResponseAddress,
  type ResponseAllowlistHash,
  type ResponseAllowlistPubKey,
  type ResponseSign,
  type ResponseVersion,
  SCHEME,
} from "./common";

export class SubstrateApp {
  transport: Transport;
  cla: number;
  slip0044: number;

  constructor(transport: Transport, cla: number, slip0044: number) {
    if (transport == null) {
      throw new Error("Transport has not been defined");
    }
    this.transport = transport;
    this.cla = cla;
    this.slip0044 = slip0044;
  }

  static serializePath(slip0044: number, account: number, change: number, addressIndex: number) {
    if (!Number.isInteger(account)) throw new Error("Input must be an integer");
    if (!Number.isInteger(change)) throw new Error("Input must be an integer");
    if (!Number.isInteger(addressIndex)) throw new Error("Input must be an integer");

    const buf = Buffer.alloc(20);
    buf.writeUInt32LE(0x8000002c, 0);
    buf.writeUInt32LE(slip0044, 4);
    buf.writeUInt32LE(account, 8);
    buf.writeUInt32LE(change, 12);
    buf.writeUInt32LE(addressIndex, 16);
    return buf;
  }

  static GetChunks(message: Buffer) {
    const chunks = [];
    const buffer = Buffer.from(message);

    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      let end = i + CHUNK_SIZE;
      if (i > buffer.length) {
        end = buffer.length;
      }
      chunks.push(buffer.subarray(i, end));
    }

    return chunks;
  }

  static signGetChunks(slip0044: number, account: number, change: number, addressIndex: number, message: Buffer) {
    const chunks = [];
    const bip44Path = SubstrateApp.serializePath(slip0044, account, change, addressIndex);
    chunks.push(bip44Path);
    chunks.push(...SubstrateApp.GetChunks(message));
    return chunks;
  }

  async getVersion(): Promise<ResponseVersion> {
    try {
      return await getVersion(this.transport, this.cla);
    } catch (e) {
      return processErrorResponse(e);
    }
  }

  async appInfo() {
    return await this.transport.send(0xb0, 0x01, 0, 0).then((response) => {
      const errorCodeData = response.subarray(-2);
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

      let appName = "";
      let appVersion = "";
      let flagLen = 0;
      let flagsValue = 0;

      if (response[0] !== 1) {
        // Ledger responds with format ID 1. There is no spec for any format != 1
        return {
          return_code: 0x9001,
          error_message: "response format ID not recognized",
        };
      } else {
        const appNameLen = response[1];
        appName = response.subarray(2, 2 + appNameLen).toString("ascii");
        let idx = 2 + appNameLen;
        const appVersionLen = response[idx];
        idx += 1;
        appVersion = response.subarray(idx, idx + appVersionLen).toString("ascii");
        idx += appVersionLen;
        const appFlagsLen = response[idx];
        idx += 1;
        flagLen = appFlagsLen;
        flagsValue = response[idx];
      }

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
        // //
        appName: appName === "" || "err",
        appVersion: appVersion === "" || "err",
        flagLen,
        flagsValue,
        // eslint-disable-next-line no-bitwise
        flag_recovery: (flagsValue & 1) !== 0,
        // eslint-disable-next-line no-bitwise
        flag_signed_mcu_code: (flagsValue & 2) !== 0,
        // eslint-disable-next-line no-bitwise
        flag_onboarded: (flagsValue & 4) !== 0,
        // eslint-disable-next-line no-bitwise
        flag_pin_validated: (flagsValue & 128) !== 0,
      };
    }, processErrorResponse);
  }

  async getAddress(
    account: number,
    change: number,
    addressIndex: number,
    requireConfirmation = false,
    scheme = SCHEME.ED25519
  ): Promise<ResponseAddress> {
    const bip44Path = SubstrateApp.serializePath(this.slip0044, account, change, addressIndex);

    let p1 = 0;
    if (requireConfirmation) p1 = 1;

    let p2 = 0;
    if (!isNaN(scheme)) p2 = scheme;

    return await this.transport.send(this.cla, INS.GET_ADDR, p1, p2, bip44Path).then((response) => {
      const errorCodeData = response.subarray(-2);
      const errorCode = errorCodeData[0] * 256 + errorCodeData[1];

      return {
        pubKey: response.subarray(0, 32).toString("hex"),
        address: response.subarray(32, response.length - 2).toString("ascii"),
        return_code: errorCode,
        error_message: errorCodeToString(errorCode),
      };
    }, processErrorResponse);
  }

  async signSendChunk(chunkIdx: number, chunkNum: number, chunk: any, scheme = SCHEME.ED25519) {
    let payloadType = PAYLOAD_TYPE.ADD;
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT;
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST;
    }

    let p2 = 0;
    if (!isNaN(scheme)) p2 = scheme;

    return await this.transport
      .send(this.cla, INS.SIGN, payloadType, p2, chunk, [ERROR_CODE.NoError, 0x6984, 0x6a80])
      .then((response) => {
        const errorCodeData = response.subarray(-2);
        const returnCode = errorCodeData[0] * 256 + errorCodeData[1];
        let errorMessage = errorCodeToString(returnCode);
        let signature = null;

        if (returnCode === 0x6a80 || returnCode === 0x6984) {
          errorMessage = response.subarray(0, response.length - 2).toString("ascii");
        } else if (response.length > 2) {
          signature = response.subarray(0, response.length - 2);
        }

        return {
          signature,
          return_code: returnCode,
          error_message: errorMessage,
        };
      }, processErrorResponse);
  }

  async sign(
    account: number,
    change: number,
    addressIndex: number,
    message: Buffer,
    scheme = SCHEME.ED25519
  ): Promise<ResponseSign> {
    const chunks = SubstrateApp.signGetChunks(this.slip0044, account, change, addressIndex, message);
    return await this.signSendChunk(1, chunks.length, chunks[0], scheme).then(async () => {
      let result;
      for (let i = 1; i < chunks.length; i += 1) {
        result = await this.signSendChunk(1 + i, chunks.length, chunks[i], scheme);
        if (result.return_code !== ERROR_CODE.NoError) {
          break;
        }
      }

      return {
        return_code: result.return_code,
        error_message: result.error_message,
        signature: result.signature,
      };
    }, processErrorResponse);
  }

  /// Allow list related commands. They are NOT available on all apps

  async getAllowlistPubKey(): Promise<ResponseAllowlistPubKey> {
    return await this.transport.send(this.cla, INS.ALLOWLIST_GET_PUBKEY, 0, 0).then((response) => {
      const errorCodeData = response.subarray(-2);
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

      console.log(response);

      const pubkey = response.subarray(0, 32);
      // 32 bytes + 2 error code
      if (response.length !== 34) {
        return {
          return_code: 0x6984,
          error_message: errorCodeToString(0x6984),
        };
      }

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
        pubkey,
      };
    }, processErrorResponse);
  }

  async setAllowlistPubKey(pk: Buffer) {
    return await this.transport.send(this.cla, INS.ALLOWLIST_SET_PUBKEY, 0, 0, pk).then((response) => {
      const errorCodeData = response.subarray(-2);
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
      };
    }, processErrorResponse);
  }

  async getAllowlistHash(): Promise<ResponseAllowlistHash> {
    return await this.transport.send(this.cla, INS.ALLOWLIST_GET_HASH, 0, 0).then((response) => {
      const errorCodeData = response.subarray(-2);
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

      console.log(response);

      const hash = response.subarray(0, 32);
      // 32 bytes + 2 error code
      if (response.length !== 34) {
        return {
          return_code: 0x6984,
          error_message: errorCodeToString(0x6984),
        };
      }

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
        hash,
      };
    }, processErrorResponse);
  }

  async uploadSendChunk(chunkIdx: number, chunkNum: number, chunk: any) {
    let payloadType = PAYLOAD_TYPE.ADD;
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT;
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST;
    }

    return await this.transport
      .send(this.cla, INS.ALLOWLIST_UPLOAD, payloadType, 0, chunk, [ERROR_CODE.NoError])
      .then((response) => {
        const errorCodeData = response.subarray(-2);
        const returnCode = errorCodeData[0] * 256 + errorCodeData[1];
        const errorMessage = errorCodeToString(returnCode);

        return {
          return_code: returnCode,
          error_message: errorMessage,
        };
      }, processErrorResponse);
  }

  async uploadAllowlist(message: any) {
    const chunks: any[] = [];
    chunks.push(Buffer.from([0]));
    chunks.push(...SubstrateApp.GetChunks(message));

    return await this.uploadSendChunk(1, chunks.length, chunks[0]).then(async (result) => {
      if (result.return_code !== ERROR_CODE.NoError) {
        return {
          return_code: result.return_code,
          error_message: result.error_message,
        };
      }

      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop,no-param-reassign
        result = await this.uploadSendChunk(1 + i, chunks.length, chunks[i]);
        if (result.return_code !== ERROR_CODE.NoError) {
          break;
        }
      }

      return {
        return_code: result.return_code,
        error_message: result.error_message,
      };
    }, processErrorResponse);
  }
}
