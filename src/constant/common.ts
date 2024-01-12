export * from "./abi";

export const CHAIN_ID_MAINNET = {
  zksync: "zksync",
  starknet: "SN_MAIN",
  loopring: "loopring",
  zkspace: "ZKSpace",
  dydx: "dydx",
  imx: "immutableX",
  mainnet: "1",
  ar: "42161",
  po: "137",
  op: "10",
  zksync2: "324",
  nova: "42170",
  base: "8453",
  zora: "7777777",
  metis: "1088",
  boba: "288",
  linea: "59144",
  pozkevm: "1101",
  bsc: "56",
  opbnb: "204",
  manta: "169",
  scroll: "534352",
};

export const CHAIN_ID_TESTNET = {
  zksync_test: "zksync_test",
  starknet_test: "SN_GOERLI",
  loopring_test: "loopring_test",
  zkspace_test: "ZKSpace_test",
  dydx_test: "dydx_test",
  imx_test: "immutableX_test",
  goerli: "5",
  ar_test: "421613",
  po_test: "80001",
  op_test: "420",
  zksync2_test: "280",
  base_test: "84531",
  zora_test: "999",
  linea_test: "59140",
  pozkevm_test: "1442",
  bsc_test: "97",
  opbnb_test: "5611",
  manta_test: "3441005",
  scroll_test: "534353",
};

export const SIZE_OP = {
  P_NUMBER: 4,
};

export const MAX_BITS = {
  [CHAIN_ID_MAINNET.zksync]: 35,
  [CHAIN_ID_MAINNET.imx]: 28,
  [CHAIN_ID_MAINNET.dydx]: 28,
  [CHAIN_ID_MAINNET.zkspace]: 35,
  [CHAIN_ID_TESTNET.zksync_test]: 35,
  [CHAIN_ID_TESTNET.imx_test]: 28,
  [CHAIN_ID_TESTNET.dydx_test]: 28,
  [CHAIN_ID_TESTNET.zkspace_test]: 35,
};

export const IMX_CONTRACTS = {
  ropsten: {
    starkContractAddress: "0x7917eDb51ecD6CdB3F9854c3cc593F33de10c623",
    registrationContractAddress: "0x1C97Ada273C9A52253f463042f29117090Cd7D83",
  },
  mainnet: {
    starkContractAddress: "0x5FDCCA53617f4d2b9134B29090C87D01058e27e9",
    registrationContractAddress: "0x72a06bf2a1CE5e39cBA06c0CAb824960B587d64c",
  },
};

export const DYDX_MAKERS = {
  "0x694434EC84b7A8Ad8eFc57327ddD0A428e23f8D5": {
    starkKey:
      "04e69175389829db733f41ae75e7ba59ea2b2849690c734fcd291c94d6ec6017",
    positionId: "60620",
  },
};

export const UINT_256_MAX = (1n << 256n) - 1n;

export const L1_TO_L2_ADDRESSES = {
  "0x095d2918b03b2e86d68551dcf11302121fb626c9": {
    "mainnet-alpha":
      "0x0411c2a2a4dc7b4d3a33424af3ede7e2e3b66691e22632803e37e2e0de450940",
    "goerli-alpha":
      "0x050e5ba067562e87b47d87542159e16a627e85b00de331a53b471cee1a4e5a4f",
  },
  "0x0043d60e87c5dd08c86c3123340705a1556c4719": {
    "mainnet-alpha": "",
    "goerli-alpha":
      "0x050e5ba067562e87b47d87542159e16a627e85b00de331a53b471cee1a4e5a4f",
  },
  "0x80c67432656d59144ceff962e8faf8926599bcf8": {
    "mainnet-alpha":
      "0x07b393627bd514d2aa4c83e9f0c468939df15ea3c29980cd8e7be3ec847795f0",
    "goerli-alpha":
      "0x050e5ba067562e87b47d87542159e16a627e85b00de331a53b471cee1a4e5a4f",
  },
};

export const GAS_ADDRESS = {
  "mainnet-alpha": {
    address:
      "0x07a4ef69a3d7c647d8d99da0aa0f296c84a22148fa8665e9a52179418b8de54e",
    privateKey:
      "0x53ea9a5da3c9c1232dddf771b4660d07ebea36bfba1ce3619f3e867cb1c49b0",
  },
  "goerli-alpha": {
    address:
      "0x07a4ef69a3d7c647d8d99da0aa0f296c84a22148fa8665e9a52179418b8de54e",
    privateKey:
      "0x53ea9a5da3c9c1232dddf771b4660d07ebea36bfba1ce3619f3e867cb1c49b0",
  },
};

export const CONTRACT_TYPE_SOURCE = "OBSource";
export const CONTRACT_TYPE_ROUTER_V3 = "OrbiterRouterV3";

export const BASE_TRADE_FEE = 1000000;
