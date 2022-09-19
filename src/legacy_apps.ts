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
import { newSubstrateApp } from './supported_apps'

// Legacy code
export function newKusamaApp(transport: any) {
  return newSubstrateApp(transport, 'Kusama')
}

export function newPolkadotApp(transport: any) {
  return newSubstrateApp(transport, 'Polkadot')
}

export function newPolymeshApp(transport: any) {
  return newSubstrateApp(transport, 'Polymesh')
}

export function newDockApp(transport: any) {
  return newSubstrateApp(transport, 'Dock')
}

export function newCentrifugeApp(transport: any) {
  return newSubstrateApp(transport, 'Centrifuge')
}

export function newEdgewareApp(transport: any) {
  return newSubstrateApp(transport, 'Edgeware')
}

export function newEquilibriumApp(transport: any) {
  return newSubstrateApp(transport, 'Equilibrium')
}

export function newGenshiroApp(transport: any) {
  return newSubstrateApp(transport, 'Genshiro')
}

export function newStatemintApp(transport: any) {
  return newSubstrateApp(transport, 'Statemint')
}

export function newStatemineApp(transport: any) {
  return newSubstrateApp(transport, 'Statemine')
}

export function newNodleApp(transport: any) {
  return newSubstrateApp(transport, 'Nodle')
}

export function newSoraApp(transport: any) {
  return newSubstrateApp(transport, 'Sora')
}

export function newPolkadexApp(transport: any) {
  return newSubstrateApp(transport, 'Polkadex')
}

export function newBifrostApp(transport: any) {
  return newSubstrateApp(transport, 'Bifrost')
}

export function newKaruraApp(transport: any) {
  return newSubstrateApp(transport, 'Karura')
}

export function newReefApp(transport: any) {
  return newSubstrateApp(transport, 'Reef')
}

export function newAcalaApp(transport: any) {
  return newSubstrateApp(transport, 'Acala')
}

export function newXXNetworkApp(transport: any) {
  return newSubstrateApp(transport, 'XXNetwork')
}

export function newParallelApp(transport: any) {
  return newSubstrateApp(transport, 'Parallel')
}

export function newAstarApp(transport: any) {
  return newSubstrateApp(transport, 'Astar')
}

export function newComposableApp(transport: any) {
  return newSubstrateApp(transport, 'Composable')
}

export function newStafiApp(transport: any) {
  return newSubstrateApp(transport, 'Stafi')
}

export function newAlephZeroApp(transport: any) {
  return newSubstrateApp(transport, 'AlephZero')
}

export function newInterlayApp(transport: any) {
  return newSubstrateApp(transport, 'Interlay')
}

export function newUniqueApp(transport: any) {
  return newSubstrateApp(transport, 'Unique')
}

export function newBifrostKusamaApp(transport: any) {
  return newSubstrateApp(transport, 'BifrostKusama')
}

export function newVTBApp(transport: any) {
  return newSubstrateApp(transport, 'VTB')
}
