/** ******************************************************************************
 *  (c) 2019 ZondaX GmbH
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

import { CHUNK_SIZE, ERROR_CODE, errorCodeToString, getVersion, PAYLOAD_TYPE, processErrorResponse, SCHEME } from './common'

import { CLA, SLIP0044 } from './config'

const bip39 = require('bip39')
const hash = require('hash.js')
const bip32ed25519 = require('bip32-ed25519')
const bs58 = require('bs58')
const blake = require('blakejs')

const HDPATH_0_DEFAULT = 0x8000002c

const INS = {
  GET_VERSION: 0x00,
  GET_ADDR: 0x01,
  SIGN: 0x02,

  // Allow list related commands
  ALLOWLIST_GET_PUBKEY: 0x90,
  ALLOWLIST_SET_PUBKEY: 0x91,
  ALLOWLIST_GET_HASH: 0x92,
  ALLOWLIST_UPLOAD: 0x93,
}

class SubstrateApp {
  constructor(transport, cla, slip0044) {
    if (!transport) {
      throw new Error('Transport has not been defined')
    }
    this.transport = transport
    this.cla = cla
    this.slip0044 = slip0044
  }

  static serializePath(slip0044, account, change, addressIndex) {
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

  static GetChunks(message) {
    const chunks = []
    const buffer = Buffer.from(message)

    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      let end = i + CHUNK_SIZE
      if (i > buffer.length) {
        end = buffer.length
      }
      chunks.push(buffer.slice(i, end))
    }

    return chunks
  }

  static signGetChunks(slip0044, account, change, addressIndex, message) {
    const chunks = []
    const bip44Path = SubstrateApp.serializePath(slip0044, account, change, addressIndex)
    chunks.push(bip44Path)
    chunks.push(...SubstrateApp.GetChunks(message))
    return chunks
  }

  async getVersion() {
    try {
      return await getVersion(this.transport, this.cla)
    } catch (e) {
      return processErrorResponse(e)
    }
  }

  async appInfo() {
    return this.transport.send(0xb0, 0x01, 0, 0).then(response => {
      const errorCodeData = response.slice(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

      const result = {}

      let appName = 'err'
      let appVersion = 'err'
      let flagLen = 0
      let flagsValue = 0

      if (response[0] !== 1) {
        // Ledger responds with format ID 1. There is no spec for any format != 1
        result.error_message = 'response format ID not recognized'
        result.return_code = 0x9001
      } else {
        const appNameLen = response[1]
        appName = response.slice(2, 2 + appNameLen).toString('ascii')
        let idx = 2 + appNameLen
        const appVersionLen = response[idx]
        idx += 1
        appVersion = response.slice(idx, idx + appVersionLen).toString('ascii')
        idx += appVersionLen
        const appFlagsLen = response[idx]
        idx += 1
        flagLen = appFlagsLen
        flagsValue = response[idx]
      }

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
        // //
        appName,
        appVersion,
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
      }
    }, processErrorResponse)
  }

  async getAddress(account, change, addressIndex, requireConfirmation = false, scheme = SCHEME.ED25519) {
    const bip44Path = SubstrateApp.serializePath(this.slip0044, account, change, addressIndex)

    let p1 = 0
    if (requireConfirmation) p1 = 1

    let p2 = 0
    if (!isNaN(scheme)) p2 = scheme

    return this.transport.send(this.cla, INS.GET_ADDR, p1, p2, bip44Path).then(response => {
      const errorCodeData = response.slice(-2)
      const errorCode = errorCodeData[0] * 256 + errorCodeData[1]

      return {
        pubKey: response.slice(0, 32).toString('hex'),
        address: response.slice(32, response.length - 2).toString('ascii'),
        return_code: errorCode,
        error_message: errorCodeToString(errorCode),
      }
    }, processErrorResponse)
  }

  async signSendChunk(chunkIdx, chunkNum, chunk, scheme = SCHEME.ED25519) {
    let payloadType = PAYLOAD_TYPE.ADD
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST
    }

    let p2 = 0
    if (!isNaN(scheme)) p2 = scheme

    return this.transport.send(this.cla, INS.SIGN, payloadType, p2, chunk, [ERROR_CODE.NoError, 0x6984, 0x6a80]).then(response => {
      const errorCodeData = response.slice(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]
      let errorMessage = errorCodeToString(returnCode)
      let signature = null

      if (returnCode === 0x6a80 || returnCode === 0x6984) {
        errorMessage = response.slice(0, response.length - 2).toString('ascii')
      } else if (response.length > 2) {
        signature = response.slice(0, response.length - 2)
      }

      return {
        signature,
        return_code: returnCode,
        error_message: errorMessage,
      }
    }, processErrorResponse)
  }

  async sign(account, change, addressIndex, message, scheme = SCHEME.ED25519) {
    const chunks = SubstrateApp.signGetChunks(this.slip0044, account, change, addressIndex, message)
    return this.signSendChunk(1, chunks.length, chunks[0], scheme).then(async result => {
      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop,no-param-reassign
        result = await this.signSendChunk(1 + i, chunks.length, chunks[i], scheme)
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

  /// Allow list related commands. They are NOT available on all apps

  async getAllowlistPubKey() {
    return this.transport.send(this.cla, INS.ALLOWLIST_GET_PUBKEY, 0, 0).then(response => {
      const errorCodeData = response.slice(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

      console.log(response)

      const pubkey = response.slice(0, 32)
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

  async setAllowlistPubKey(pk) {
    return this.transport.send(this.cla, INS.ALLOWLIST_SET_PUBKEY, 0, 0, pk).then(response => {
      const errorCodeData = response.slice(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
      }
    }, processErrorResponse)
  }

  async getAllowlistHash() {
    return this.transport.send(this.cla, INS.ALLOWLIST_GET_HASH, 0, 0).then(response => {
      const errorCodeData = response.slice(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

      console.log(response)

      const hash = response.slice(0, 32)
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

  async uploadSendChunk(chunkIdx, chunkNum, chunk) {
    let payloadType = PAYLOAD_TYPE.ADD
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST
    }

    return this.transport.send(this.cla, INS.ALLOWLIST_UPLOAD, payloadType, 0, chunk, [ERROR_CODE.NoError]).then(response => {
      const errorCodeData = response.slice(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]
      let errorMessage = errorCodeToString(returnCode)

      return {
        return_code: returnCode,
        error_message: errorMessage,
      }
    }, processErrorResponse)
  }

  async uploadAllowlist(message) {
    const chunks = []
    chunks.push(Buffer.from([0]))
    chunks.push(...SubstrateApp.GetChunks(message))

    return this.uploadSendChunk(1, chunks.length, chunks[0]).then(async result => {
      if (result.return_code !== ERROR_CODE.NoError) {
        return {
          return_code: result.return_code,
          error_message: result.error_message,
        }
      }

      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop,no-param-reassign
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

function newKusamaApp(transport) {
  return new SubstrateApp(transport, CLA.KUSAMA, SLIP0044.KUSAMA)
}

function newPolkadotApp(transport) {
  return new SubstrateApp(transport, CLA.POLKADOT, SLIP0044.POLKADOT)
}

function newPolymeshApp(transport) {
  return new SubstrateApp(transport, CLA.POLYMESH, SLIP0044.POLYMESH)
}

function newDockApp(transport) {
  return new SubstrateApp(transport, CLA.DOCK, SLIP0044.DOCK)
}

function newCentrifugeApp(transport) {
  return new SubstrateApp(transport, CLA.CENTRIFUGE, SLIP0044.CENTRIFUGE)
}

function newEdgewareApp(transport) {
  return new SubstrateApp(transport, CLA.EDGEWARE, SLIP0044.EDGEWARE)
}

function newEquilibriumApp(transport) {
  return new SubstrateApp(transport, CLA.EQUILIBRIUM, SLIP0044.EQUILIBRIUM)
}

function newGenshiroApp(transport) {
  return new SubstrateApp(transport, CLA.GENSHIRO, SLIP0044.GENSHIRO)
}

function newStatemintApp(transport) {
  return new SubstrateApp(transport, CLA.STATEMINT, SLIP0044.STATEMINT)
}

function newStatemineApp(transport) {
  return new SubstrateApp(transport, CLA.STATEMINE, SLIP0044.STATEMINE)
}

function newNodleApp(transport) {
  return new SubstrateApp(transport, CLA.NODLE, SLIP0044.NODLE)
}

function newSoraApp(transport) {
  return new SubstrateApp(transport, CLA.SORA, SLIP0044.SORA)
}

function sha512(data) {
  var digest = hash.sha512().update(data).digest()
  return Buffer.from(digest)
}

function hmac256(key, data) {
  var digest = hash.hmac(hash.sha256, key).update(data).digest()
  return Buffer.from(digest)
}

function hmac512(key, data) {
  var digest = hash.hmac(hash.sha512, key).update(data).digest()
  return Buffer.from(digest)
}

function ss58hash(data) {
  var hash = blake.blake2bInit(64, null)
  blake.blake2bUpdate(hash, Buffer.from('SS58PRE'))
  blake.blake2bUpdate(hash, data)
  return blake.blake2bFinal(hash)
}

function ss58_encode(prefix, pubkey) {
  if (pubkey.byteLength !== 32) {
    return null
  }

  let data = Buffer.alloc(35)
  data[0] = prefix
  pubkey.copy(data, 1)
  let hash = ss58hash(data.slice(0, 33))
  data[33] = hash[0]
  data[34] = hash[1]

  return bs58.encode(data)
}

function root_node_slip10(master_seed) {
  var data = Buffer.alloc(1 + 64)
  data[0] = 0x01
  master_seed.copy(data, 1)
  var c = hmac256('ed25519 seed', data)
  var I = hmac512('ed25519 seed', data.slice(1))
  let kL = I.slice(0, 32)
  let kR = I.slice(32)
  while ((kL[31] & 32) !== 0) {
    I.copy(data, 1)
    I = hmac512('ed25519 seed', data.slice(1))
    kL = I.slice(0, 32)
    kR = I.slice(32)
  }
  kL[0] &= 248
  kL[31] &= 127
  kL[31] |= 64

  return Buffer.concat([kL, kR, c])
}

function hdKeyDerivation(mnemonic, password, slip0044, accountIndex, changeIndex, addressIndex, ss58prefix) {
  if (!bip39.validateMnemonic(mnemonic)) {
    console.log('Invalid mnemonic')
    return null
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic, password)
  var node = root_node_slip10(seed)
  node = bip32ed25519.derivePrivate(node, HDPATH_0_DEFAULT)
  node = bip32ed25519.derivePrivate(node, slip0044)
  node = bip32ed25519.derivePrivate(node, accountIndex)
  node = bip32ed25519.derivePrivate(node, changeIndex)
  node = bip32ed25519.derivePrivate(node, addressIndex)

  let kL = node.slice(0, 32)
  let sk = sha512(kL).slice(0, 32)
  sk[0] &= 248
  sk[31] &= 127
  sk[31] |= 64

  let pk = bip32ed25519.toPublic(sk)
  let address = ss58_encode(ss58prefix, pk)
  return {
    sk: kL,
    pk: pk,
    address: address,
  }
}

module.exports = {
  hdKeyDerivation,
  newKusamaApp,
  newPolkadotApp,
  newPolymeshApp,
  newDockApp,
  newCentrifugeApp,
  newEdgewareApp,
  newEquilibriumApp,
  newGenshiroApp,
  newStatemintApp,
  newStatemineApp,
  newNodleApp,
  newSoraApp,
}
