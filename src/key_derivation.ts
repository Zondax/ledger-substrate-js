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

const bip39 = require("bip39");
const hash = require("hash.js");
const bip32ed25519 = require("bip32-ed25519");
const bs58 = require("bs58");
const blake = require("blakejs");

const HDPATH_0_DEFAULT = 0x8000002c;

function sha512(data: any) {
  const digest = hash.sha512().update(data).digest();
  return Buffer.from(digest);
}

function hmac256(key: any, data: any) {
  const digest = hash.hmac(hash.sha256, key).update(data).digest();
  return Buffer.from(digest);
}

function hmac512(key: any, data: any) {
  const digest = hash.hmac(hash.sha512, key).update(data).digest();
  return Buffer.from(digest);
}

function ss58hash(data: any) {
  const hash = blake.blake2bInit(64, null);
  blake.blake2bUpdate(hash, Buffer.from("SS58PRE"));
  blake.blake2bUpdate(hash, data);
  return blake.blake2bFinal(hash);
}

function ss58_encode(prefix: number, pubkey: any) {
  if (pubkey.byteLength !== 32) {
    return null;
  }

  const data = Buffer.alloc(35);
  data[0] = prefix;
  pubkey.copy(data, 1);
  const hash = ss58hash(data.slice(0, 33));
  data[33] = hash[0];
  data[34] = hash[1];

  return bs58.encode(data);
}

function root_node_slip10(master_seed: any) {
  const data = Buffer.alloc(1 + 64);
  data[0] = 0x01;
  master_seed.copy(data, 1);
  const c = hmac256("ed25519 seed", data);
  let I = hmac512("ed25519 seed", data.slice(1));
  let kL = I.slice(0, 32);
  let kR = I.slice(32);
  while ((kL[31] & 32) !== 0) {
    I.copy(data, 1);
    I = hmac512("ed25519 seed", data.slice(1));
    kL = I.slice(0, 32);
    kR = I.slice(32);
  }
  kL[0] &= 248;
  kL[31] &= 127;
  kL[31] |= 64;

  return Buffer.concat([kL, kR, c]);
}

export function hdKeyDerivation(
  mnemonic: string,
  password: string,
  slip0044: number,
  accountIndex: number,
  changeIndex: number,
  addressIndex: number,
  ss58prefix: number
) {
  if (!bip39.validateMnemonic(mnemonic)) {
    console.log("Invalid mnemonic");
    return null;
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic, password);
  let node = root_node_slip10(seed);
  node = bip32ed25519.derivePrivate(node, HDPATH_0_DEFAULT);
  node = bip32ed25519.derivePrivate(node, slip0044);
  node = bip32ed25519.derivePrivate(node, accountIndex);
  node = bip32ed25519.derivePrivate(node, changeIndex);
  node = bip32ed25519.derivePrivate(node, addressIndex);

  const kL = node.slice(0, 32);
  const sk = sha512(kL).slice(0, 32);
  sk[0] &= 248;
  sk[31] &= 127;
  sk[31] |= 64;

  const pk = bip32ed25519.toPublic(sk);
  const address = ss58_encode(ss58prefix, pk);
  return {
    sk: kL,
    pk: pk,
    address: address,
  };
}
