import {
  ContractTransactionResponse,
  Signer,
  TransactionResponse,
} from "ethers-6";
import { HexString } from "ethers-6/lib.commonjs/utils/data";
import { Account, InvokeFunctionResponse } from "starknet";
import Web3 from "web3";

export interface ISignerConfig<T> {
  signer?: T;
  privateKey?: string | HexString;
  providerUrl?: string;
  starknetAddress?: string;
}

export type TEvmConfig = ISignerConfig<Signer>;

export type TStarknetConfig = ISignerConfig<Account>;

export type TLoopringConfig = ISignerConfig<Web3>;

export enum SIGNER_TYPES {
  EVM = "EVM",
  Loopring = "Loopring",
  Starknet = "Starknet",
}

export interface IOBridgeConfig {
  dealerId: string | HexString;
  isMainnet: boolean;
  evmConfig: TEvmConfig;
  starknetConfig: TStarknetConfig;
  loopringConfig: TLoopringConfig;
}

export interface Rates {
  [key: string]: string;
}

export interface QueryRatesData {
  success: boolean;
  data: {
    currency: string;
    rates: Rates;
  };
}

export type TTokenName = string;
export type TSymbol = string;
export type TAddress = string | HexString;

export interface IToken {
  name: TTokenName;
  symbol: TSymbol;
  decimals: number;
  address: TAddress;
  id?: number;
}

export type TAmount = string;

export interface IChainInfo {
  chainId: string | number;
  networkId: string | number;
  internalId: string | number;
  name: string;
  targetConfirmation?: number;
  batchLimit?: number;
  bridge?: number;

  contracts?: string[];
  contract?: {
    [k: string]: string;
  };

  nativeCurrency: {
    id: number;
    name: string;
    symbol: string;
    decimals: number;
    address: string;
  };
  infoURL?: string;
}

export interface ITransactionInfo {
  fromChainId: string;
  fromHash: string;
  fromSymbol: string;
  fromTimestamp: string;
  fromValue: string;
  status: number;
  toChainId: string;
  toHash: string;
  toTimestamp: Date;
  toValue: string;
}

export interface ITransferExt {
  contractType: string;
  receiveStarknetAddress: string;
}

export interface ITransferConfig {
  fromChainID: string;
  fromCurrency: string;
  toChainID: string;
  toCurrency: string;
  transferValue: number;
  crossAddressReceipt?: string;
}

export interface ITokensByChain {
  [k: string | number]: IToken[] | undefined;
}

export interface ICrossRule {
  line: string;
  endpoint: string;
  endpointContract?: string;
  srcChain: string;
  tgtChain: string;
  srcToken: string;
  tgtToken: string;
  maxAmt: string;
  minAmt: string;
  tradeFee: string;
  withholdingFee: string;
  vc: string;
  state: string;
  compRatio: number;
  spentTime: number;
  slippage?: number;
}

export interface ICrossFunctionParams {
  fromChainID: string;
  toChainID: string;
  selectMakerConfig: ICrossRule;
  toChainInfo: IChainInfo;
  fromChainInfo: IChainInfo;
  transferValue: number;
  fromCurrency: string;
  toCurrency: string;
  crossAddressReceipt?: string;
}

export type TCrossConfig = ICrossFunctionParams & {
  account: string;
  tokenAddress: string;
  isETH: boolean;
  fromTokenInfo: IToken;
  tradeFee: string;
  toTokenInfo: IToken;
  to: string;
  fromChainTokens: IToken[];
  tValue: {
    state: boolean;
    tAmount: BigInt;
  };
};

export const STARKNET_CHAIN_ID = {
  mainnetId: "SN_MAIN",
  testnetId: "SN_GOERLI",
};

export enum StarknetChainId {
  SN_MAIN = "0x534e5f4d41494e",
  SN_GOERLI = "0x534e5f474f45524c49",
  SN_GOERLI2 = "0x534e5f474f45524c4932",
}
export interface IRates {
  [k: string]: string;
}

export interface ISearchTxResponse {
  sourceId: string;
  targetId: string;
  sourceChain: string;
  targetChain: string;
  sourceAmount: string;
  targetAmount: string;
  sourceMaker: string;
  targetMaker: string;
  sourceAddress: string;
  targetAddress: string;
  sourceSymbol: string;
  targetSymbol: string;
  status: number;
  sourceTime: string;
  targetTime: string;
  ruleId: string;
}

interface IImxTransactionResponse {
  transfer_id: number;
  status: string;
  time: number;
  sent_signature: string;
}

export type TContractTransactionResponse = ContractTransactionResponse;
export type TTransactionResponse = TransactionResponse;
export type TIMXTransactionResponse = IImxTransactionResponse;

export type ILoopringResponse = {
  hash: string;
  status: string;
  isIdempotent: boolean;
  accountId: number;
  tokenId: number;
  storageId: number;
  raw_data: {
    hash: string;
    status: string;
    isIdempotent: boolean;
    accountId: number;
    tokenId: number;
    storageId: number;
  };
};

export type TStarknetResponse = InvokeFunctionResponse;

export type TBridgeResponse =
  | TContractTransactionResponse
  | TTransactionResponse
  | TIMXTransactionResponse
  | ILoopringResponse
  | TStarknetResponse;

export type TRefundResponse =
  | TStarknetResponse
  | TransactionResponse
  | ILoopringResponse
  | ContractTransactionResponse;

export interface IChainItem {
  chainId: string;
  networkId: string;
  internalId: string;
  name: string;
  nativeCurrency: {
    id: number;
    name: string;
    symbol: string;
    decimals: number;
    address: string;
  };
  tokens: [
    {
      id: number;
      name: string;
      symbol: string;
      decimals: number;
      address: string;
    }
  ];
}

export interface IV3Result {
  status: "success" | "false";
  message: string;
  params: {
    url: string;
    method: "GET" | "POST";
    routes?: object;
  };
}

export type TChainsResult = IV3Result & {
  result: IChainItem[];
};

export interface ITokenItem {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
}

export type TTokensResult = IV3Result & {
  result: {
    [k: string]: ITokenItem[];
  };
};

export type TRouterResult = IV3Result & {
  result: ICrossRule[];
};

export interface IGlobalState {
  [k: string]: boolean | Web3 | Signer | Account | string;
  isMainnet: boolean;
  dealerId: string;
  activeSignerType: "EVM" | "Loopring" | "Starknet";
  loopringSigner: Web3;
  evmSigner: Signer;
  starknetSigner: Account;
}
interface PublicKey {
  /**
   * The public keys x part.
   * @type {string}
   * @memberof PublicKey
   */
  x: string;
  /**
   * The public keys y part.
   * @type {string}
   * @memberof PublicKey
   */
  y: string;
}
export interface AccountInfo {
  accountId: number;
  owner: string;
  frozen: boolean;
  publicKey: PublicKey;
  tags?: string;
  nonce: number;
  keyNonce: number;
  keySeed: string;
}
