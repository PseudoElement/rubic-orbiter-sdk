import { Signer } from "ethers-6";
import { Account } from "starknet";
import BigNumber from "bignumber.js";
import { HexString } from "ethers-6/lib.commonjs/utils/data";
import ChainsService from "../services/ChainsService";
import CrossRulesService from "../services/CrossRulesService";
import TokenService from "../services/TokenService";
import HistoryService from "../services/HistoryService";
import CrossControl from "../crossControl";
import {
  IChainInfo,
  ICrossRule,
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
  starknetChainId,
} from "../types";
import { throwNewError } from "../utils";

export default class Orbiter {
  private static instance: Orbiter;
  private signer: Signer | Account;
  private dealerId: string | HexString;

  private chainsService: ChainsService;
  private tokensService: TokenService;
  private crossRulesService: CrossRulesService;
  private historyService: HistoryService;

  private crossControl: CrossControl;

  constructor(config?: IOBridgeConfig) {
    this.signer = config?.signer || ({} as Signer | Account);
    this.dealerId = config?.dealerId || "";

    this.chainsService = ChainsService.getInstance();
    this.tokensService = TokenService.getInstance();
    this.crossRulesService = new CrossRulesService(this.dealerId);
    this.historyService = new HistoryService(this.signer);

    this.crossControl = CrossControl.getInstance();
  }

  public static getInstance(): Orbiter {
    if (!this.instance) {
      this.instance = new Orbiter();
    }

    return this.instance;
  }

  public updateConfig(config: Partial<IOBridgeConfig>): void {
    this.signer = config.signer ?? this.signer;
    this.dealerId = config.dealerId ?? this.dealerId;

    this.historyService.updateSigner(this.signer);
    this.crossRulesService.updateDealerId(this.dealerId);
  }

  getChainsAsync = async (): Promise<IChainInfo[]> => {
    return await this.chainsService.getChainsAsync();
  };

  getChainInfoAsync = async (chainId: string | number): Promise<IChainInfo> => {
    return await this.chainsService.getChainInfoAsync(chainId);
  };

  getTokensDecimals = async (
    chainId: string | number,
    token:
      | TTokenName
      | TAddress
      | TSymbol
      | Array<TTokenName | TAddress | TSymbol>
  ) => {
    return await this.tokensService.getTokensDecimals(chainId, token);
  };

  getTokensAsync = async (): Promise<ITokensByChain> => {
    return await this.tokensService.getTokensByChainAsync();
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
    const fromChainInfo = await this.getChainInfoAsync(fromChainID);
    let currentChainId: BigInt = 0n;

    if ("getAddress" in this.signer) {
      const currentNetwork = await this.signer.provider?.getNetwork();
      currentChainId = currentNetwork?.chainId || 0n;
      if (currentChainId !== BigInt(fromChainInfo.networkId)) {
        return throwNewError("evm signer is not match with the source chain.");
      }
    } else {
      if (!starknetChainId.includes(fromChainID))
        return throwNewError(
          "starknet account is not match with the source chain."
        );
    }

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
