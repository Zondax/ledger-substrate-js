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
import Transport from '@ledgerhq/hw-transport'
import { LedgerError, ResponseError, numbersToBip32Path } from '@zondax/ledger-js'

import { ISubstrateAppLegacy, ResponseAddress, ResponseBase, ResponseSign, ResponseVersion, SCHEME } from './common'
import { PolkadotGenericApp } from './generic_app'

export class PolkadotGenericAppLegacy implements ISubstrateAppLegacy {
  genericApp: PolkadotGenericApp
  ss58prefix: number

  constructor(transport: Transport, ss58prefix: number, txMetadataChainId: string, txMetadataSrvUrl: string | undefined) {
    this.genericApp = new PolkadotGenericApp(transport, txMetadataChainId, txMetadataSrvUrl)
    this.ss58prefix = ss58prefix
  }

  private convertToLegacyError(e: ResponseError): ResponseBase {
    return {
      error_message: e.errorMessage,
      return_code: e.returnCode,
    }
  }

  private convertLegacyPath(account: number, change: number, addressIndex: number) {
    return numbersToBip32Path([0x8000002c, 0x80000162, account, change, addressIndex])
  }

  async getVersion(): Promise<ResponseVersion> {
    try {
      const version = await this.genericApp.getVersion()
      const legacyError = this.convertToLegacyError(ResponseError.fromReturnCode(LedgerError.NoErrors))

      return {
        ...legacyError,
        major: version.major ?? 0,
        minor: version.minor ?? 0,
        patch: version.patch ?? 0,
        device_locked: version.deviceLocked ?? false,
        test_mode: version.testMode ?? false,
      }
    } catch (e) {
      const legacyError = this.convertToLegacyError(e as ResponseError)

      return {
        device_locked: false,
        major: 0,
        minor: 0,
        patch: 0,
        test_mode: false,
        ...legacyError,
      }
    }
  }

  async appInfo(): Promise<any> {
    try {
      const info = await this.genericApp.appInfo()
      const legacyError = this.convertToLegacyError(ResponseError.fromReturnCode(LedgerError.NoErrors))

      return {
        ...legacyError,
        ...info,
      }
    } catch (e) {
      const legacyError = this.convertToLegacyError(e as ResponseError)
      return {
        ...legacyError,
      }
    }
  }

  async getAddress(
    account: number,
    change: number,
    addressIndex: number,
    requireConfirmation?: boolean,
    scheme?: SCHEME
  ): Promise<ResponseAddress> {
    if (scheme !== SCHEME.ED25519) {
      throw ResponseError.fromReturnCode(LedgerError.AlgorithmNotSupported)
    }

    try {
      const bip44Path = this.convertLegacyPath(account, change, addressIndex)
      const address = await this.genericApp.getAddress(bip44Path, this.ss58prefix, requireConfirmation)
      const legacyError = this.convertToLegacyError(ResponseError.fromReturnCode(LedgerError.NoErrors))

      return {
        ...legacyError,
        ...address,
      }
    } catch (e) {
      const legacyError = this.convertToLegacyError(e as ResponseError)
      return {
        address: 'ERROR',
        pubKey: 'ERROR',
        ...legacyError,
      }
    }
  }

  async sign(account: number, change: number, addressIndex: number, message: Buffer, scheme?: SCHEME): Promise<ResponseSign> {
    try {
      if (scheme !== SCHEME.ED25519) {
        throw ResponseError.fromReturnCode(LedgerError.AlgorithmNotSupported)
      }

      const bip44Path = this.convertLegacyPath(account, change, addressIndex)
      const signature = await this.genericApp.sign(bip44Path, message)
      const legacyError = this.convertToLegacyError(ResponseError.fromReturnCode(LedgerError.NoErrors))

      return {
        ...legacyError,
        ...signature,
      }
    } catch (e) {
      const legacyError = this.convertToLegacyError(e as ResponseError)
      return {
        signature: Buffer.alloc(0),
        ...legacyError,
      }
    }
  }

  async signRaw(account: number, change: number, addressIndex: number, message: Buffer, scheme?: SCHEME): Promise<ResponseSign> {
    try {
      if (scheme !== SCHEME.ED25519) {
        throw ResponseError.fromReturnCode(LedgerError.AlgorithmNotSupported)
      }

      const bip44Path = this.convertLegacyPath(account, change, addressIndex)
      const signature = await this.genericApp.signRaw(bip44Path, message)
      const legacyError = this.convertToLegacyError(ResponseError.fromReturnCode(LedgerError.NoErrors))

      return {
        ...legacyError,
        ...signature,
      }
    } catch (e) {
      const legacyError = this.convertToLegacyError(e as ResponseError)
      return {
        signature: Buffer.alloc(0),
        ...legacyError,
      }
    }
  }
}
