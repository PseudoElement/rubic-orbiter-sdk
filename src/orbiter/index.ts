import {
  ContractTransactionResponse,
  Signer,
  TransactionResponse,
} from "ethers-6";
import { Account } from "starknet";
import BigNumber from "bignumber.js";
import { HexString } from "ethers-6/lib.commonjs/utils/data";
import ChainsService from "../services/ChainsService";
import CrossRulesService from "../services/CrossRulesService";
import TokenService from "../services/TokensService";
import HistoryService from "../services/HistoryService";
import RefundService from "../services/RefundService";
import CrossControl from "../crossControl";
import {
  IChainInfo,
  ICrossRule,
  IGlobalState,
  IOBridgeConfig,
  ISearchTxResponse,
  IToken,
  ITokensByChain,
  ITransactionInfo,
  ITransferConfig,
  TAddress,
  TBridgeResponse,
  TSymbol,
  TTokenName,
} from "../types";
import { throwNewError } from "../utils";
import { isFromChainIdMatchProvider } from "./utils";
import { getGlobalState, setGlobalState } from "../globalState";
import HDWalletProvider from "@truffle/hdwallet-provider";
import { isArray } from "lodash";
import { CHAIN_ID_MAINNET, CHAIN_ID_TESTNET } from "../constant/common";
import Web3 from "web3";

export default class Orbiter {
  private static instance: Orbiter;
  private signer: Signer | Account;
  private dealerId: string | HexString;

  private chainsService: ChainsService;
  private tokensService: TokenService;
  private crossRulesService: CrossRulesService;
  private historyService: HistoryService;
  private refundService: RefundService;

  private crossControl: CrossControl;

  constructor(config?: IOBridgeConfig) {
    this.signer = config?.signer || ({} as Signer | Account);
    this.dealerId = config?.dealerId || "";

    setGlobalState({ isMainnet: config?.isMainnet || false });

    this.chainsService = ChainsService.getInstance();
    this.tokensService = TokenService.getInstance();
    this.crossRulesService = new CrossRulesService(this.dealerId);
    this.historyService = new HistoryService(this.signer);
    this.refundService = new RefundService(this.signer);

    this.crossControl = CrossControl.getInstance();
  }

  public static getInstance(): Orbiter {
    if (!this.instance) {
      this.instance = new Orbiter();
    }

    return this.instance;
  }

  updateConfig = (config: Partial<IOBridgeConfig>): void => {
    this.signer = config.signer ?? this.signer;
    this.dealerId = config.dealerId ?? this.dealerId;

    if (config.hasOwnProperty("isMainnet")) {
      setGlobalState({
        isMainnet: config.isMainnet ?? getGlobalState().isMainnet,
      });
      this.chainsService.updateConfig();
      this.tokensService.updateConfig();
    }

    this.historyService.updateConfig({ signer: this.signer });
    this.refundService.updateConfig({ signer: this.signer });
    this.crossRulesService.updateConfig({ dealerId: this.dealerId });
  };

  generateLoopringSignerAndSetGlobalState = (
    privateKeys: string | string[],
    web3ProviderOrURL: any | string
  ): void => {
    Web3.providers.HttpProvider.prototype.sendAsync =
      Web3.providers.HttpProvider.prototype.send;

    const hdSigner: any = new HDWalletProvider({
      privateKeys: isArray(privateKeys) ? privateKeys : [privateKeys],
      providerOrUrl: web3ProviderOrURL,
    });

    setGlobalState({
      loopringSigner: new Web3(hdSigner),
    });
  };

  getGlobalState = (): IGlobalState => {
    return getGlobalState();
  };

  setGlobalState = (newState: IGlobalState): void => {
    return setGlobalState(newState);
  };

  getChainsAsync = async (): Promise<IChainInfo[]> => {
    return await this.chainsService.getChainsAsync();
  };

  getChainInfoAsync = async (chainId: string | number): Promise<IChainInfo> => {
    return await this.chainsService.getChainInfoAsync(chainId);
  };

  getTokensDecimalsAsync = async (
    chainId: string | number,
    token:
      | TTokenName
      | TAddress
      | TSymbol
      | Array<TTokenName | TAddress | TSymbol>
  ) => {
    return await this.tokensService.getTokensDecimalsAsync(chainId, token);
  };

  getTokenAsync = async (
    chainId: string | number,
    token: TTokenName | TAddress | TSymbol
  ) => {
    return await this.tokensService.getTokenAsync(chainId, token);
  };

  getTokensAllChainAsync = async (): Promise<ITokensByChain> => {
    return await this.tokensService.getTokensAllChainAsync();
  };

  getTokensByChainIdAsync = async (
    chainId: string | number
  ): Promise<IToken[] | []> => {
    return await this.tokensService.getTokensByChainIdAsync(chainId);
  };

  queryRulesAsync = async (): Promise<ICrossRule[]> => {
    return await this.crossRulesService.queryRulesAsync();
  };

  queryRouterRule = async (params: {
    dealerId: string | HexString;
    fromChainInfo: IChainInfo;
    toChainInfo: IChainInfo;
    fromCurrency: string;
    toCurrency: string;
  }): Promise<ICrossRule> => {
    return await this.crossRulesService.queryRouterRule(params);
  };

  getHistoryListAsync = async (params: {
    account: string;
    pageNum: number;
    pageSize: number;
  }): Promise<{
    transactions: ITransactionInfo[];
    count: number;
  }> => {
    return await this.historyService.queryHistoryList(params);
  };

  searchTransaction = async (
    txHash: string
  ): Promise<ISearchTxResponse | undefined> => {
    return await this.historyService.searchTransaction(txHash);
  };

  toRefund = async (sendOptions: {
    to: string;
    amount: number | string;
    token: TTokenName | TAddress | TSymbol;
    fromChainId: string | number;
    isLoopring: boolean;
  }): Promise<TransactionResponse | ContractTransactionResponse> => {
    try {
      const fromChainInfo = await this.getChainInfoAsync(
        sendOptions.fromChainId
      );

      await isFromChainIdMatchProvider({ signer: this.signer, fromChainInfo });
      return await this.refundService.toSend(sendOptions);
    } catch (error: any) {
      console.log(error);
      return throwNewError("toRefund function error", error.message);
    }
  };

  toBridge = async <T extends TBridgeResponse>(
    transferConfig: ITransferConfig
  ): Promise<T> => {
    if (!this.signer) throw new Error("Can not find signer, please check it!");
    const {
      fromChainID,
      fromCurrency,
      toChainID,
      toCurrency,
      transferValue,
      transferExt,
    } = transferConfig;
    if (
      (fromChainID === CHAIN_ID_MAINNET.loopring ||
        fromChainID === CHAIN_ID_TESTNET.loopring_test) &&
      !Object.keys(getGlobalState().loopringSigner).length
    ) {
      return throwNewError(
        "should update loopring Signer by [generateLoopringSignerAndSetGlobalState] function."
      );
    }
    const fromChainInfo = await this.getChainInfoAsync(fromChainID);

    await isFromChainIdMatchProvider({ signer: this.signer, fromChainInfo });

    const toChainInfo = await this.getChainInfoAsync(toChainID);
    if (!fromChainInfo || !toChainInfo)
      throw new Error("Cant get ChainInfo by fromChainId or to toChainId.");

    const selectMakerConfig = await this.queryRouterRule({
      dealerId: this.dealerId,
      fromChainInfo,
      toChainInfo,
      fromCurrency,
      toCurrency,
    });

    if (selectMakerConfig && !Object.keys(selectMakerConfig).length)
      throw new Error("has no rule match, pls check your params!");

    if (
      new BigNumber(transferValue).gt(selectMakerConfig.maxAmt) ||
      new BigNumber(transferValue).lt(selectMakerConfig.minAmt)
    )
      throw new Error(
        "Not in the correct price range, please check your value"
      );

    try {
      return await this.crossControl.getCrossFunction<T>(this.signer, {
        ...transferConfig,
        fromChainInfo,
        toChainInfo,
        selectMakerConfig,
        transferExt,
      });
    } catch (error) {
      return throwNewError("Bridge getCrossFunction error", error);
    }
  };
}
