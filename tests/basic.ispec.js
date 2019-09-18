import LedgerApp from "index.js";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { expect, test } from "jest";
import { blake2bInit, blake2bUpdate, blake2bFinal } from "blakejs";

var ed25519 = require('ed25519');

test("get version", async () => {
  const transport = await TransportNodeHid.create(1000);

  const app = new LedgerApp(transport);
  const version = await app.getVersion();
  console.log(version);
});

test("get address", async () => {
  const transport = await TransportNodeHid.create(1000);

  const app = new LedgerApp(transport);

  const pathAccount = 0x80000000;
  const pathChange = 0x80000000;
  const pathIndex = 0x80000005;

  const response = await app.getAddress(pathAccount, pathChange, pathIndex);
  console.log(response);

  expect(response.pubKey).toEqual("8d16d62802ca55326ec52bf76a8543b90e2aba5bcf6cd195c0d6fc1ef38fa1b3");
  expect(response.address).toEqual("FmK43tjzFGT9F68Sj9EvW6rwBQUAVuA9wNQaYxGLvfcCAxS");
});

test("show address", async () => {
  jest.setTimeout(60000);

  const transport = await TransportNodeHid.create(1000);

  const app = new LedgerApp(transport);

  const pathAccount = 0x80000000;
  const pathChange = 0x80000000;
  const pathIndex = 0x8000000a;
  const response = await app.getAddress(pathAccount, pathChange, pathIndex, true);

  console.log(response);

  // FIXME: Address
  expect(response.pubKey).toEqual("a9fc4cb6f5ad1ae3fbfa69f252eaa495ae658f7af33f24ce195396813641ec4a");
  expect(response.address).toEqual("GRCZNaoU2hS5Zjc3gyy34yyrV2Qbmqem8G6qbbG6Uy7938z");
});

test("sign1", async () => {
  jest.setTimeout(60000);

  const transport = await TransportNodeHid.create(1000);

  const txBlobStr =
    "0400ff8d16d62802ca55326ec52bf76a8543b90e2aba5bcf6cd195c0d6fc1ef38fa1b3000600ae11030000c" +
    "80100003fd7b9eb6a00376e5be61f01abb429ffb0b104be05eaff4d458da48fcd425baf3fd7b9eb6a00376e" +
    "5be61f01abb429ffb0b104be05eaff4d458da48fcd425baf";

  const txBlob = Buffer.from(txBlobStr, "hex");

  const app = new LedgerApp(transport);

  const pathAccount = 0x80000000;
  const pathChange = 0x80000000;
  const pathIndex = 0x80000000;
  const response = await app.sign(pathAccount, pathChange, pathIndex, txBlob);

  console.log(response);
});

test("sign2_and_verify", async () => {
  jest.setTimeout(60000);

  const transport = await TransportNodeHid.create(1000);

  const txBlobStr =
    "0400ff8d16d62802ca55326ec52bf76a8543b90e2aba5bcf6cd195c0d6fc1ef38fa1b3000600ae11030000c" +
    "80100003fd7b9eb6a00376e5be61f01abb429ffb0b104be05eaff4d458da48fcd425baf3fd7b9eb6a00376e" +
    "5be61f01abb429ffb0b104be05eaff4d458da48fcd425baf";

  const txBlob = Buffer.from(txBlobStr, "hex");

  const app = new LedgerApp(transport);
  const pathAccount = 0x80000000;
  const pathChange = 0x80000000;
  const pathIndex = 0x80000000;

  const responseAddr = await app.getAddress(pathAccount, pathChange, pathIndex);
  const responseSign = await app.sign(pathAccount, pathChange, pathIndex, txBlob);

  const pubkey = Buffer.from(responseAddr.pubKey, "hex");

  console.log(responseAddr);
  console.log(responseSign);

  // Check signature is valid
  let prehash = txBlob;
  if (txBlob.length > 256) {
    const context = blake2bInit(64, null);
    blake2bUpdate(context, txBlob);
    prehash = Buffer.from(blake2bFinal(context));
  }

  const valid = ed25519.Verify(prehash, responseSign.signature, pubkey);
  expect(valid).toEqual(true);
});
