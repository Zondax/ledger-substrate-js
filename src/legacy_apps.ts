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
import { newSubstrateApp } from "./supported_apps";

// Legacy code
export function newKusamaApp(transport: Transport) {
  return newSubstrateApp(transport, "Kusama");
}

export function newPolkadotApp(transport: Transport) {
  return newSubstrateApp(transport, "Polkadot");
}

export function newPolymeshApp(transport: Transport) {
  return newSubstrateApp(transport, "Polymesh");
}

export function newDockApp(transport: Transport) {
  return newSubstrateApp(transport, "Dock");
}

export function newCentrifugeApp(transport: Transport) {
  return newSubstrateApp(transport, "Centrifuge");
}

export function newEdgewareApp(transport: Transport) {
  return newSubstrateApp(transport, "Edgeware");
}

export function newEquilibriumApp(transport: Transport) {
  return newSubstrateApp(transport, "Equilibrium");
}

export function newGenshiroApp(transport: Transport) {
  return newSubstrateApp(transport, "Genshiro");
}

export function newStatemintApp(transport: Transport) {
  return newSubstrateApp(transport, "Statemint");
}

export function newStatemineApp(transport: Transport) {
  return newSubstrateApp(transport, "Statemine");
}

export function newNodleApp(transport: Transport) {
  return newSubstrateApp(transport, "Nodle");
}

export function newSoraApp(transport: Transport) {
  return newSubstrateApp(transport, "Sora");
}

export function newPolkadexApp(transport: Transport) {
  return newSubstrateApp(transport, "Polkadex");
}

export function newBifrostApp(transport: Transport) {
  return newSubstrateApp(transport, "Bifrost");
}

export function newKaruraApp(transport: Transport) {
  return newSubstrateApp(transport, "Karura");
}

export function newReefApp(transport: Transport) {
  return newSubstrateApp(transport, "Reef");
}

export function newAcalaApp(transport: Transport) {
  return newSubstrateApp(transport, "Acala");
}

export function newXXNetworkApp(transport: Transport) {
  return newSubstrateApp(transport, "XXNetwork");
}

export function newParallelApp(transport: Transport) {
  return newSubstrateApp(transport, "Parallel");
}

export function newAstarApp(transport: Transport) {
  return newSubstrateApp(transport, "Astar");
}

export function newComposableApp(transport: Transport) {
  return newSubstrateApp(transport, "Composable");
}

export function newStafiApp(transport: Transport) {
  return newSubstrateApp(transport, "Stafi");
}

export function newAlephZeroApp(transport: Transport) {
  return newSubstrateApp(transport, "AlephZero");
}

export function newInterlayApp(transport: Transport) {
  return newSubstrateApp(transport, "Interlay");
}

export function newUniqueApp(transport: Transport) {
  return newSubstrateApp(transport, "Unique");
}

export function newBifrostKusamaApp(transport: Transport) {
  return newSubstrateApp(transport, "BifrostKusama");
}
