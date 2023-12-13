import { Signer } from "ethers-6";
import { HexString } from "ethers-6/lib.commonjs/utils/data";

export interface IOBridgeConfig {
  signer: Signer;
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

  api?: {
    url: string;
    key: string;
    intervalTime?: number;
  };
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
  };
  rpc?: string[];
  watch?: string[];
  alchemyApi?: {
    category: string[];
  };
  contracts?: string[];
  contract?: {
    [k: string]: string;
  };
  tokens: IToken[] | [];
  xvmList: string[];
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

export interface ITxList {
  chainId: string;
  hash: string;
  side: number;
  status: number;
  symbol: string;
  timestamp: string;
  value: string;
}

export interface ISearchTxData {
  fromHash: string;
  fromChainId: string;
  fromTime: string;
  fromAmount: string;
  fromSymbol: string;
  fromTimeStampShow: string;
  fromAmountValue: string;
  toHash: string;
  toChainId: string;
  toTime: string;
  toAmount: string;
  toSymbol: string;
  toTimeStampShow: string;
  toAmountValue: string;
}

export interface IQueryChainInfosData {
  data: IChainInfo[];
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
  transferExt?: ITransferExt;
}

export interface IBridgeConfig {
  signer: Signer;
  fromChainID: string;
  fromCurrency: string;
  toChainID: string;
  toCurrency: string;
  transferValue: number;
  gasFee: number;
  ethPrice: number;
  crossAddressReceipt?: string;
}

export interface ITokensByChain {
  [k: string | number]: IToken[] | undefined;
}

export interface ICrossRule {
  slippage?: string;
  fromChain: {
    chainId: string;
    decimals: number;
    id: string;
    maxPrice: number;
    minPrice: number;
    name: string;
    networkId: string;
    symbol: string;
    tokenAddress: string;
  };
  gasFee: string;
  pairId: string;
  dealerId?: string;
  ebcId?: string;
  recipient: string;
  sender: string;
  toChain: {
    chainId: string;
    decimals: number;
    id: string;
    name: string;
    networkId: string;
    symbol: string;
    tokenAddress: string;
  };
  tradingFee: string;
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
  transferExt?: ITransferExt;
}

export type TCrossConfig = ICrossFunctionParams & {
  account: string;
  tokenAddress: string;
  isETH: boolean;
  to: string;
  tValue: {
    state: boolean;
    tAmount: BigInt;
  };
};

export const starknetChainId = ["SN_MAIN", "SN_GOERLI"];
