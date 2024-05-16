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
import type Transport from '@ledgerhq/hw-transport'

import { newSubstrateApp } from './supported_apps'

// Legacy code

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newKusamaApp(transport: Transport) {
  return newSubstrateApp(transport, 'Kusama')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newPolkadotApp(transport: Transport) {
  return newSubstrateApp(transport, 'Polkadot')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newPolymeshApp(transport: Transport) {
  return newSubstrateApp(transport, 'Polymesh')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newDockApp(transport: Transport) {
  return newSubstrateApp(transport, 'Dock')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newCentrifugeApp(transport: Transport) {
  return newSubstrateApp(transport, 'Centrifuge')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newEdgewareApp(transport: Transport) {
  return newSubstrateApp(transport, 'Edgeware')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newEquilibriumApp(transport: Transport) {
  return newSubstrateApp(transport, 'Equilibrium')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newGenshiroApp(transport: Transport) {
  return newSubstrateApp(transport, 'Genshiro')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newStatemintApp(transport: Transport) {
  return newSubstrateApp(transport, 'Statemint')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newStatemineApp(transport: Transport) {
  return newSubstrateApp(transport, 'Statemine')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newNodleApp(transport: Transport) {
  return newSubstrateApp(transport, 'Nodle')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newSoraApp(transport: Transport) {
  return newSubstrateApp(transport, 'Sora')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newPolkadexApp(transport: Transport) {
  return newSubstrateApp(transport, 'Polkadex')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newBifrostApp(transport: Transport) {
  return newSubstrateApp(transport, 'Bifrost')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newKaruraApp(transport: Transport) {
  return newSubstrateApp(transport, 'Karura')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newReefApp(transport: Transport) {
  return newSubstrateApp(transport, 'Reef')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newAcalaApp(transport: Transport) {
  return newSubstrateApp(transport, 'Acala')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newXXNetworkApp(transport: Transport) {
  return newSubstrateApp(transport, 'XXNetwork')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newParallelApp(transport: Transport) {
  return newSubstrateApp(transport, 'Parallel')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newAstarApp(transport: Transport) {
  return newSubstrateApp(transport, 'Astar')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newComposableApp(transport: Transport) {
  return newSubstrateApp(transport, 'Composable')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newStafiApp(transport: Transport) {
  return newSubstrateApp(transport, 'Stafi')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newAlephZeroApp(transport: Transport) {
  return newSubstrateApp(transport, 'AlephZero')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newInterlayApp(transport: Transport) {
  return newSubstrateApp(transport, 'Interlay')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newUniqueApp(transport: Transport) {
  return newSubstrateApp(transport, 'Unique')
}

/**
 * @deprecated Chains will progressively migrate to the generic app
 */
export function newBifrostKusamaApp(transport: Transport) {
  return newSubstrateApp(transport, 'BifrostKusama')
}
