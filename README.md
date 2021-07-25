# ledger-substrate (JS Integration)

[![Main](https://github.com/Zondax/ledger-substrate-js/workflows/Main/badge.svg)](https://github.com/Zondax/ledger-substrate-gen/actions?query=workflow%3AMain)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://badge.fury.io/js/%40zondax%2Fledger-substrate.svg)](https://badge.fury.io/js/%40zondax%2Fledger-substrate)


This package provides a basic client library to communicate with Substrate Apps running in a Ledger Nano S/X devices

Additionally, it provides a hd_key_derivation function to retrieve the keys that Ledger apps generate with
BIP32-ED25519. Warning: the hd_key_derivation function is not audited and depends on external pacakges. We recommend
using the official Substrate Ledger apps in recovery mode.

# Run Tests

- Prepare your Ledger device (for instance, use https://github.com/zondax/ledger-kusama)

  - Prepare as development device:

  - Build & load the Kusama app

    - Load the Kusama App

- Install all dependencies and run tests

```shell script
yarn install
yarn test:integration
```
