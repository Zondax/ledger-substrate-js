const CLA = {
  KUSAMA: 0x99,
  POLKADOT: 0x90,
  POLYMESH: 0x91,
  DOCK: 0x92,
  CENTRIFUGE: 0x93,
  EDGEWARE: 0x94,
}

// https://github.com/satoshilabs/slips/blob/master/slip-0044.md
const SLIP0044 = {
  KUSAMA: 0x800001b2,
  POLKADOT: 0x80000162,
  EDGEWARE: 0x8000020b,
  POLYMESH: 0x80000253,
  DOCK: 0x80000252,
  CENTRIFUGE: 0x800002eb,
}

const SS58_ADDR_TYPE = {
  POLKADOT: 0,
  KUSAMA: 2,
  EDGEWARE: 7,
  POLYMESH: 12,
  DOCK: 22, //mainnet
  CENTRIFUGE: 36,
}

module.exports = {
  CLA,
  SLIP0044,
  SS58_ADDR_TYPE,
}
