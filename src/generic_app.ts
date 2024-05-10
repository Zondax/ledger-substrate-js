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
import axios from "axios";

import {
  errorCodeToString,
  ERROR_CODE,
  getVersion,
  INS,
  PAYLOAD_TYPE,
  processErrorResponse,
  type ResponseAddress,
  type ResponseSign,
  type ResponseVersion,
  type INS_SIGN,
  serializePath,
  getSignReqChunks,
  P1_VALUES,
} from "./common";

const PolkadotCLA = 0x90;
const PolkadotSlip0044 = 0x80000162;

interface TxMetadata {
  txMetadata: string;
}

export function newGenericApp(transport: Transport, chainId: string, txMetadataSrvUrl: string): GenericApp {
  return GenericApp.new(transport, chainId, txMetadataSrvUrl);
}
export function newMigrationApp(
  transport: Transport,
  chainId: string,
  cla: number,
  sip0044: number,
  txMetadataSrvUrl: string,
): GenericApp {
  return GenericApp.newMigrationApp(transport, cla, sip0044, chainId, txMetadataSrvUrl);
}

export class GenericApp {
  transport: Transport;
  cla: number;
  slip0044: number;
  txMetadataSrvUrl: string;
  chainId: string;

  static new(transport: Transport, chainId: string, txMetadataSrvUrl: string): GenericApp {
    return new GenericApp(transport, PolkadotCLA, PolkadotSlip0044, chainId, txMetadataSrvUrl);
  }

  static newApp(transport: Transport, chainId: string, txMetadataSrvUrl: string): GenericApp {
    return new GenericApp(transport, PolkadotCLA, PolkadotSlip0044, chainId, txMetadataSrvUrl);
  }

  static newMigrationApp(
    transport: Transport,
    cla: number,
    slip0044: number,
    chainId: string,
    txMetadataSrvUrl: string,
  ): GenericApp {
    return new GenericApp(transport, cla, slip0044, chainId, txMetadataSrvUrl);
  }

  private constructor(transport: Transport, cla: number, slip0044: number, chainId: string, txMetadataSrvUrl: string) {
    if (transport == null) {
      throw new Error("Transport has not been defined");
    }
    this.transport = transport;
    this.cla = cla;
    this.slip0044 = slip0044;
    this.txMetadataSrvUrl = txMetadataSrvUrl;
    this.chainId = chainId;
  }

  async getTxMetadata(txBlob: Buffer): Promise<Buffer> {
    const resp = await axios.post<TxMetadata>(this.txMetadataSrvUrl, {
      txBlob: txBlob.toString("hex"),
      chain: { id: this.chainId },
    });

    let txMetadata = resp.data.txMetadata;
    if (txMetadata.slice(0, 2) === "0x") {
      txMetadata = txMetadata.slice(2);
    }

    return Buffer.from(txMetadata, "hex");
  }

  async getVersion(): Promise<ResponseVersion> {
    return await getVersion(this.transport, this.cla);
  }

  async appInfo() {
    try {
      const response = await this.transport.send(0xb0, 0x01, 0, 0);
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
      }

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
        flag_issuer_trusted: (flagsValue & 8) !== 0,
        // eslint-disable-next-line no-bitwise
        flag_custom_ca_trusted: (flagsValue & 16) !== 0,
        // eslint-disable-next-line no-bitwise
        flag_hsm_initialized: (flagsValue & 32) !== 0,
        // eslint-disable-next-line no-bitwise
        flag_factory_filled: (flagsValue & 64) !== 0,
        // eslint-disable-next-line no-bitwise
        flag_pin_validated: (flagsValue & 128) !== 0,
      };
    } catch (e) {
      return processErrorResponse(e);
    }
  }

  async getAddress(
    account: number,
    change: number,
    addressIndex: number,
    ss58prefix: number,
    showAddrInDevice = false,
  ): Promise<ResponseAddress> {
    // needs to be integer, and up to 65535
    if (!Number.isInteger(ss58prefix) && ss58prefix >> 16 !== 0) {
      throw new Error(`Unexpected ss58prefix ${ss58prefix}. Needs to be up to 2^16`);
    }

    const bip44Path = serializePath(this.slip0044, account, change, addressIndex);
    const payload = Buffer.alloc(bip44Path.length + 2);
    bip44Path.copy(payload);
    payload.writeUInt16LE(ss58prefix, payload.length - 2);

    const p1 = showAddrInDevice ? P1_VALUES.SHOW_ADDRESS_IN_DEVICE : P1_VALUES.ONLY_RETRIEVE;

    try {
      const response = await this.transport.send(this.cla, INS.GET_ADDR, p1, 0, payload);
      const errorCodeData = response.subarray(-2);
      const errorCode = errorCodeData[0] * 256 + errorCodeData[1];

      return {
        pubKey: response.subarray(0, 32).toString("hex"),
        address: response.subarray(32, response.length - 2).toString("ascii"),
        return_code: errorCode,
        error_message: errorCodeToString(errorCode),
      };
    } catch (e) {
      return processErrorResponse(e);
    }
  }

  private async signSendChunk(chunkIdx: number, chunkNum: number, chunk: Buffer, ins: INS_SIGN = INS.SIGN) {
    let payloadType = PAYLOAD_TYPE.ADD;
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT;
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST;
    }

    try {
      const response = await this.transport.send(this.cla, ins, payloadType, 0, chunk, [
        ERROR_CODE.NoError,
        ERROR_CODE.InvalidData,
      ]);
      const errorCodeData = response.subarray(-2);
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1];
      let errorMessage = errorCodeToString(returnCode);
      let signature = null;

      if (response.length > 2) {
        if (returnCode === ERROR_CODE.InvalidData) {
          errorMessage = response.subarray(0, response.length - 2).toString("ascii");
        } else if (response.length > 2) {
          signature = response.subarray(0, response.length - 2);
        }
      }

      return {
        signature,
        return_code: returnCode,
        error_message: errorMessage,
      };
    } catch (e) {
      return processErrorResponse(e);
    }
  }

  async signImpl(
    account: number,
    change: number,
    addressIndex: number,
    ins: INS_SIGN,
    blob: Buffer,
    metadata?: Buffer,
  ): Promise<ResponseSign> {
    const chunks = getSignReqChunks(this.slip0044, account, change, addressIndex, blob, metadata);

    try {
      let result = await this.signSendChunk(1, chunks.length, chunks[0], ins);

      for (let i = 1; i < chunks.length; i += 1) {
        result = await this.signSendChunk(1 + i, chunks.length, chunks[i], ins);
        if (result.return_code !== ERROR_CODE.NoError) {
          break;
        }
      }

      return {
        return_code: result.return_code,
        error_message: result.error_message,
        signature: result.signature,
      };
    } catch (e) {
      return processErrorResponse(e);
    }
  }

  async sign(account: number, change: number, addressIndex: number, txBlob: Buffer) {
    const txMetadata = await this.getTxMetadata(txBlob);
    return await this.signImpl(account, change, addressIndex, INS.SIGN, txBlob, txMetadata);
  }

  async signAdvanced(account: number, change: number, addressIndex: number, txBlob: Buffer, txMetadata: Buffer) {
    return await this.signImpl(account, change, addressIndex, INS.SIGN, txBlob, txMetadata);
  }

  async signRaw(account: number, change: number, addressIndex: number, txBlob: Buffer) {
    return await this.signImpl(account, change, addressIndex, INS.SIGN_RAW, txBlob);
  }
}
