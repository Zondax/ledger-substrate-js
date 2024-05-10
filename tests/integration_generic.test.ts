/** ******************************************************************************
 *  (c) 2018 - 2022 Zondax AG
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

import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { blake2bFinal, blake2bInit, blake2bUpdate } from "blakejs";

const ed25519 = require("ed25519-supercop");

import { newPolkadotGenericApp } from "../src/generic_app";
import { supportedApps } from "../src/supported_apps";
import Transport from "@ledgerhq/hw-transport";

const TX_METADATA_SRV_URL = "https://api.zondax.ch/polkadot/transaction/metadata";
const CHAIN_NAME = "Polkadot";
const CHAIN_TICKER = "dot";
const YOUR_PUBKEY = "d280b24dface41f31006e5a2783971fc5a66c862dd7d08f97603d2902b75e47a";
const YOUR_ADDRESS = "HLKocKgeGjpXkGJU6VACtTYJK4ApTCfcGRw51E5jWntcsXv";
const YOUR_BLOB =
  "0000d050f0c8c0a9706b7c0c4e439245a347627901c89d4791239533d1d2c961f1a72ad615c8530de078e565ba644b38b01bcad249e8c0a80aceb4befe330990a59f74ed976c933db269c64dda40104a0f001900000091b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3a071db11cdbfd29285f25d402f1aee7a1c0384269c9c2edb476688d35e346998";

let transport: Transport;

jest.setTimeout(60000);

beforeAll(async () => {
  transport = await TransportNodeHid.create(1000);
});

describe("Integration", function () {
  test("get version", async () => {
    const app = newPolkadotGenericApp(transport, CHAIN_TICKER, TX_METADATA_SRV_URL);
    const resp = await app.getVersion();
    console.log(resp);

    expect(resp.return_code).toEqual(0x9000);
    expect(resp.error_message).toEqual("No errors");
    expect(resp).toHaveProperty("test_mode");
    expect(resp).toHaveProperty("major");
    expect(resp).toHaveProperty("minor");
    expect(resp).toHaveProperty("patch");
    expect(resp.test_mode).toEqual(false);
  });

  test("get address", async () => {
    const { ss58_addr_type: ss58prefix } = supportedApps.find((app) => app.name == CHAIN_NAME) || {};
    expect(ss58prefix).toBeDefined();
    if (ss58prefix === undefined) {
      return;
    }

    const app = newPolkadotGenericApp(transport, CHAIN_TICKER, TX_METADATA_SRV_URL);

    const pathAccount = 0x80000000;
    const pathChange = 0x80000000;
    const pathIndex = 0x80000005;

    const response = await app.getAddress(pathAccount, pathChange, pathIndex, ss58prefix);
    console.log(response);

    expect(response.return_code).toEqual(0x9000);
    expect(response.error_message).toEqual("No errors");
    expect(response).toHaveProperty("pubKey");
    expect(response.pubKey).toEqual(YOUR_PUBKEY);
    expect(response.address).toEqual(YOUR_ADDRESS);
  });

  test("show address", async () => {
    const { ss58_addr_type: ss58prefix } = supportedApps.find((app) => app.name == CHAIN_NAME) || {};
    expect(ss58prefix).toBeDefined();
    if (ss58prefix === undefined) {
      return;
    }

    const app = newPolkadotGenericApp(transport, CHAIN_TICKER, TX_METADATA_SRV_URL);

    const pathAccount = 0x80000000;
    const pathChange = 0x80000000;
    const pathIndex = 0x80000005;
    const response = await app.getAddress(pathAccount, pathChange, pathIndex, ss58prefix, true);

    console.log(response);

    expect(response.return_code).toEqual(0x9000);
    expect(response.error_message).toEqual("No errors");

    expect(response).toHaveProperty("address");
    expect(response).toHaveProperty("pubKey");

    expect(response.pubKey).toEqual(YOUR_PUBKEY);
    expect(response.address).toEqual(YOUR_ADDRESS);
  });

  describe("Tx Metadata", () => {
    test("Success", async () => {
      const app = newPolkadotGenericApp(transport, CHAIN_TICKER, TX_METADATA_SRV_URL);

      const txBlob = Buffer.from(YOUR_BLOB, "hex");
      const resp = await app.getTxMetadata(txBlob);

      expect(resp).toBeDefined();
    });

    test("Wrong/Invalid ticker", async () => {
      const app = newPolkadotGenericApp(transport, "xxx", TX_METADATA_SRV_URL);

      const txBlob = Buffer.from(YOUR_BLOB, "hex");
      try {
        await app.getTxMetadata(txBlob);
      } catch (e: any) {
        expect(e.response.status).toBe(404);
      }
    });

    test("Empty/Wrong service url", async () => {
      const app = newPolkadotGenericApp(transport, "ksm", "");

      const txBlob = Buffer.from(YOUR_BLOB, "hex");
      try {
        await app.getTxMetadata(txBlob);
      } catch (e: any) {
        expect(e.code).toBe("ECONNREFUSED");
      }
    });
  });

  test("sign2_and_verify", async () => {
    const { ss58_addr_type: ss58prefix } = supportedApps.find((app) => app.name == CHAIN_NAME) || {};
    expect(ss58prefix).toBeDefined();
    if (ss58prefix === undefined) {
      return;
    }

    const txBlob = Buffer.from(YOUR_BLOB, "hex");

    const app = newPolkadotGenericApp(transport, CHAIN_TICKER, TX_METADATA_SRV_URL);

    const pathAccount = 0x80000000;
    const pathChange = 0x80000000;
    const pathIndex = 0x80000000;

    const responseAddr = await app.getAddress(pathAccount, pathChange, pathIndex, ss58prefix);
    const responseSign = await app.sign(pathAccount, pathChange, pathIndex, txBlob);

    const pubkey = responseAddr.pubKey;

    console.log(responseAddr);
    console.log(responseSign);

    // Check signature is valid
    let prehash = txBlob;
    if (txBlob.length > 256) {
      const context = blake2bInit(32);
      blake2bUpdate(context, txBlob);
      prehash = Buffer.from(blake2bFinal(context));
    }
    const valid = ed25519.verify(responseSign.signature.slice(1), prehash, pubkey);
    expect(valid).toEqual(true);
  });
});
