# ledger-substrate (JS Integration)

![zondax](docs/zondax_light.png)

[![Main](https://github.com/Zondax/ledger-substrate-js/workflows/Main/badge.svg)](https://github.com/Zondax/ledger-substrate-js/actions?query=workflow%3AMain)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://badge.fury.io/js/%40zondax%2Fledger-substrate.svg)](https://badge.fury.io/js/%40zondax%2Fledger-substrate)

This package provides a basic client library to communicate with Substrate Apps running in a Ledger Nano S+/X, Flex, Stax and Apex P devices
Additionally, it provides a hd_key_derivation function to retrieve the keys that Ledger apps generate with
BIP32-ED25519. Warning: the hd_key_derivation function is not audited and depends on external packages. We recommend
using the official Substrate Ledger apps in recovery mode.

# Generic app Available commands

## Address Operations

| Operation         | Response                            | Command                                           | Notes                                  |
| ----------------- | ----------------------------------- | ------------------------------------------------- | -------------------------------------- |
| getAddress        | { pubKey: string, address: string } | path + ss58prefix + (showAddrInDevice) + (scheme) | Deprecated, use specific methods below |
| getAddressEd25519 | { pubKey: string, address: string } | path + ss58prefix + (showAddrInDevice)            | Uses ED25519 scheme                    |
| getAddressEcdsa   | { pubKey: string, address: string } | path + (showAddrInDevice)                         | Uses ECDSA scheme                      |

## Signing Operations

| Operation   | Response              | Command                          | Notes                                                                                   |
| ----------- | --------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| sign        | { signature: Buffer } | path + txBlob + Optional(scheme) | Deprecated, use specific methods below                                                  |
| signEd25519 | { signature: Buffer } | path + txBlob                    | Uses ED25519 scheme                                                                     |
| signEcdsa   | { signature: Buffer } | path + txBlob                    | Uses ECDSA scheme. Signature is in RSV format: R (32 bytes) + S (32 bytes) + V (1 byte) |

## Raw Signing Operations

| Operation      | Response              | Command                          | Notes                                                                                        |
| -------------- | --------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| signRaw        | { signature: Buffer } | path + txBlob + Optional(scheme) | Deprecated, use specific methods below                                                       |
| signRawEd25519 | { signature: Buffer } | path + txBlob                    | Raw signing with ED25519                                                                     |
| signRawEcdsa   | { signature: Buffer } | path + txBlob                    | Raw signing with ECDSA. Signature is in RSV format: R (32 bytes) + S (32 bytes) + V (1 byte) |

## Metadata Signing Operations

| Operation               | Response              | Command                                                  | Notes                                                                                             |
| ----------------------- | --------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| signWithMetadata        | { signature: Buffer } | path + txBlob + txMetadata + Optional(scheme)            | Deprecated, use specific methods below                                                            |
| signWithMetadataEd25519 | { signature: Buffer } | path + txBlob + txMetadata                               | Metadata signing with ED25519                                                                     |
| signWithMetadataEcdsa   | { signature: Buffer } | path + txBlob + txMetadata                               | Metadata signing with ECDSA. Signature is in RSV format: R (32 bytes) + S (32 bytes) + V (1 byte) |
| signMigration           | { signature: Buffer } | path + txBlob + (txMetadataChainId) + (txMetadataSrvUrl) | Migration-specific signing                                                                        |

## Utility Functions

| Operation           | Response                            | Input             | Notes                                                                                   |
| ------------------- | ----------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| parseEcdsaSignature | { r: string, s: string, v: string } | signature: Buffer | Utility to parse ECDSA signatures into R, S, V components. Input must be 65 bytes long. |

# Substrate apps Available commands

| Operation  | Response                                                                                                                                | Command                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| getVersion | { device_locked: boolean, major: number, minor: number, patch: number, test_mode: boolean, error_message: string, return_code: number } |
| appInfo    | { error_message: string, return_code: number, ...appInfo }                                                                              |
| getAddress | { address: string, pubKey: string, error_message: string, return_code: number }                                                         | account + change + addressIndex + (requireConfirmation) + (scheme) |
| sign       | { signature: Buffer, error_message: string, return_code: number }                                                                       | account + change + addressIndex + message + (scheme)               |
| signRaw    | { signature: Buffer, error_message: string, return_code: number }                                                                       | account + change + addressIndex + message + (scheme)               |

getAddress command requires that you set the derivation path (account, change, index) and has an option parameter to
display the address on the device. By default, it will retrieve the information without confirmation from the user.

# Migrating to the Generic App

### Steps to Migrate

1. **Update the Package**: Ensure you are using the latest version of the package (version 0.44.0 or higher).
2. **Create a Generic App**:

- Import the `PolkadotGenericAppLegacy` class.
- Provide the following new arguments:
  - **txMetadataChainId**: This is the id of the chain where you intend to sign transactions. This should match the chain id configured at the generic app API service.
  - **txMetadataSrvUrl**: This is the URL for the generic app API service, which generates the transaction metadata needed for signing transactions on the device. Zondax provides a live demo of this service. The url is:
    - <https://api.zondax.ch/polkadot/transaction/metadata>

3. **Configure Address Retrieval**:

- When using the `getAddress` method, include the new required argument:
  - **ss58prefix**: This is the ss58 prefix for the chain for which you want to retrieve or display addresses.

### Additional Resources

- The generic app API service repository is available on [Github](https://github.com/Zondax/ledger-polkadot-generic-api).

# Add new chain

If you are using Generic App, there is no need to add your chain in the supported apps.

If you want to add support for your chain, you just need to create a PR in this repository adding the parameters that
belong to the chain. Go to [supported APPs](./src/supported_apps.ts) and add a new entry at the end of the file.

```
{
  name: 'ChainName',
  cla: 0xFF,
  slip0044: 0x80000162,
  ss58_addr_type: 7391,
},
```

Take the last used CLA and pick the following number. This is just an ID for the app that is used in APDU protocol. This
is probably the easiest way to get a free CLA.

For Slip0044 parameter, you might want to [register here](https://github.com/satoshilabs/slips/blob/master/slip-0044.md)
as well.

SS58 prefix have no limitation whatsoever, you just have to set an uint16 number that is used in your chain.

# Testing with real devices

It is possible to test this package with a real Ledger Nano device. To accomplish that, you will need to follow these
steps:

- Install the application in the Ledger device
- Install the dependencies from this project
- Run tests

```shell script
yarn install
yarn test
```

## Example

Visit and download the [latest release](https://github.com/Zondax/ledger-kusama/releases/latest) from repository (in
this case Kusama).

Download the installer script for your device but bear in mind that NanoX does not allow side loading applications. Give
execution permission and run the script.

```shell script
chmod +x installer_nano_device.sh
./installer_nano_device.sh load
```

Modify these values from [testing script](./tests/integration.test.ts) before running the tests:

```shell script
const CHAIN = 'Kusama'
const YOUR_PUBKEY = 'd280b24dface41f31006e5a2783971fc5a66c862dd7d08f97603d2902b75e47a'
const YOUR_ADDRESS = 'HLKocKgeGjpXkGJU6VACtTYJK4ApTCfcGRw51E5jWntcsXv'
const YOUR_BLOB = '0400ffbc10f71d63e0da1b9e7ee2eb4037466551dc32b9d4641aafd73a65970fae4202286beed502000022040000b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe280b332587f46c556aa806781884284f50d90b8c1b02488a059700673c93f41c'
```

Run tests and you will see how this module communicates with your device.

# Who we are?

We are Zondax, a company pioneering blockchain services. If you want to know more about us, please visit us at
[zondax.ch](https://zondax.ch)
