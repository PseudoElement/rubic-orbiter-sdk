import { Wallet, ethers, formatUnits } from "ethers-6";
import { Account, RpcProvider } from "starknet";
import BigNumber from "bignumber.js";
import HDWalletProvider from "@truffle/hdwallet-provider";
import Web3 from "web3";
import ChainsService from "../services/ChainsService";
import CrossRulesService from "../services/RoutersService";
import TokenService from "../services/TokensService";
import HistoryService from "../services/HistoryService";
import RefundService from "../services/RefundService";
import CrossControl from "../crossControl";
import {
  IChainInfo,
  ICrossRule,
  TEvmConfig,
  IGlobalState,
  TLoopringConfig,
  IOBridgeConfig,
  ISearchTxResponse,
  TStarknetConfig,
  IToken,
  ITokensByChain,
  ITransactionInfo,
  ITransferConfig,
  TAddress,
  TBridgeResponse,
  TSymbol,
  SIGNER_TYPES,
  TTokenName,
  TRefundResponse,
} from "../types";
import {
  changeActiveSignerType,
  getActiveSigner,
  throwNewError,
} from "../utils";
import { getTransferValue, isFromChainIdMatchProvider } from "./utils";
import { getGlobalState, setGlobalState } from "../globalState";
import { BASE_TRADE_FEE } from "../constant/common";
import { queryRatesByCurrency } from "../services/ApiService";

export class Orbiter {
  private static instance: Orbiter;

  private chainsService: ChainsService;
  private tokensService: TokenService;
  private crossRulesService: CrossRulesService;
  private historyService: HistoryService;
  private refundService: RefundService;

  private crossControl: CrossControl;

  constructor(config?: Partial<IOBridgeConfig>) {
    setGlobalState({
      isMainnet: config?.isMainnet ?? true,
      dealerId: config?.dealerId || "",
      evmSigner: this.generateSigner<TEvmConfig>(
        SIGNER_TYPES.EVM,
        config?.evmConfig
      ),
      loopringSigner: this.generateSigner<TLoopringConfig>(
        SIGNER_TYPES.Loopring,
        config?.loopringConfig
      ),
      starknetSigner: this.generateSigner<TStarknetConfig>(
        SIGNER_TYPES.Starknet,
        config?.starknetConfig
      ),
    });

    this.chainsService = ChainsService.getInstance();
    this.tokensService = TokenService.getInstance();
    this.historyService = HistoryService.getInstance();
    this.crossControl = CrossControl.getInstance();
    this.crossRulesService = CrossRulesService.getInstance();
    this.refundService = RefundService.getInstance();
  }

  private generateSigner = <
    T extends TStarknetConfig | TLoopringConfig | TEvmConfig
  >(
    type: SIGNER_TYPES,
    config?: T
  ): T["signer"] => {
    if (!config || !Object.keys(config).length) return {} as T["signer"];

    const { signer, privateKey, providerUrl, starknetAddress } = config;

    if (signer && Object.keys(signer).length) return signer;

    switch (type) {
      case SIGNER_TYPES.EVM:
        return privateKey && providerUrl
          ? new Wallet(privateKey, new ethers.JsonRpcProvider(providerUrl))
          : ({} as T["signer"]);

      case SIGNER_TYPES.Loopring:
        Web3.providers.HttpProvider.prototype.sendAsync =
          Web3.providers.HttpProvider.prototype.send;
        const hdSigner: any =
          privateKey &&
          providerUrl &&
          new HDWalletProvider({
            privateKeys: [privateKey],
            providerOrUrl: providerUrl,
          });
        return new Web3(hdSigner);

      case SIGNER_TYPES.Starknet:
        const provider = new RpcProvider({ nodeUrl: providerUrl || "" });
        return privateKey && starknetAddress
          ? new Account(provider, starknetAddress, privateKey)
          : ({} as T["signer"]);

      default:
        return {} as T["signer"];
    }
  };

  public static getInstance(): Orbiter {
    if (!this.instance) {
      this.instance = new Orbiter();
    }

    return this.instance;
  }

  updateConfig = (config: Partial<IOBridgeConfig>): void => {
    const { isMainnet, dealerId, evmSigner, starknetSigner, loopringSigner } =
      getGlobalState();
    setGlobalState({
      isMainnet: config.isMainnet ?? isMainnet,
      dealerId: config?.dealerId || dealerId,
      evmSigner: config?.evmConfig
        ? this.generateSigner<TEvmConfig>(SIGNER_TYPES.EVM, config?.evmConfig)
        : evmSigner,
      loopringSigner: config?.loopringConfig
        ? this.generateSigner<TLoopringConfig>(
            SIGNER_TYPES.Loopring,
            config?.loopringConfig
          )
        : loopringSigner,
      starknetSigner: config?.starknetConfig
        ? this.generateSigner<TStarknetConfig>(
            SIGNER_TYPES.Starknet,
            config?.starknetConfig
          )
        : starknetSigner,
    });

    this.chainsService.updateConfig();
    this.tokensService.updateConfig();
    this.crossRulesService.updateConfig();
  };

  getGlobalState = (): IGlobalState => {
    return getGlobalState();
  };

  setGlobalState = (newState: IGlobalState): void => {
    return setGlobalState(newState);
  };

  queryChains = async (): Promise<IChainInfo[]> => {
    return await this.chainsService.queryChains();
  };

  queryChainInfo = async (chainId: string | number): Promise<IChainInfo> => {
    return await this.chainsService.queryChainInfo(chainId);
  };

  queryTokensDecimals = async (
    chainId: string | number,
    token:
      | TTokenName
      | TAddress
      | TSymbol
      | Array<TTokenName | TAddress | TSymbol>
  ) => {
    return await this.tokensService.queryTokensDecimals(chainId, token);
  };

  queryToken = async (
    chainId: string | number,
    token: TTokenName | TAddress | TSymbol
  ) => {
    return await this.tokensService.queryToken(chainId, token);
  };

  queryTokensAllChain = async (): Promise<ITokensByChain> => {
    return await this.tokensService.queryTokensAllChain();
  };

  queryTokensByChainId = async (
    chainId: string | number
  ): Promise<IToken[] | []> => {
    return await this.tokensService.queryTokensByChainId(chainId);
  };

  queryRouters = async (): Promise<ICrossRule[]> => {
    return await this.crossRulesService.queryRouters();
  };

  queryRouter = async (params: {
    fromChainInfo: IChainInfo;
    toChainInfo: IChainInfo;
    fromCurrency: string;
    toCurrency: string;
  }): Promise<ICrossRule> => {
    return await this.crossRulesService.queryRouter(params);
  };

  queryHistoryList = async (params: {
    account: string;
    pageNum: number;
    pageSize: number;
  }): Promise<{
    transactions: ITransactionInfo[];
    count: number;
  }> => {
    return await this.historyService.queryHistoryList(params);
  };

  searchTransaction = async (txHash: string): Promise<ISearchTxResponse> => {
    return await this.historyService.searchTransaction(txHash);
  };

  queryRealSendAmount = async (options: {
    ruleConfig: ICrossRule;
    transferValue: string | number;
  }) => {
    const { ruleConfig, transferValue } = options;
    if (!Object.keys(ruleConfig).length || !transferValue)
      return throwNewError(
        "queryRealSendAmount params error, please check it!"
      );
    const { srcChain, srcToken } = ruleConfig;
    const fromChainToken = await this.tokensService.queryToken(
      srcChain,
      srcToken
    );
    const tValue = getTransferValue({
      transferValue,
      decimals: fromChainToken.decimals,
      selectMakerConfig: ruleConfig,
    });
    if (!tValue.state) return throwNewError("queryRealSendAmount error.");
    return {
      sendAmount: tValue.tAmount,
      decimals: fromChainToken.decimals,
      formatSendAmount: formatUnits(tValue.tAmount, fromChainToken.decimals),
    };
  };

  queryReceiveAmount = async (
    transferValue: number,
    ruleConfig: ICrossRule
  ) => {
    const { srcChain, tgtChain, srcToken, tgtToken, tradeFee } = ruleConfig;
    const fromChainToken = await this.tokensService.queryToken(
      srcChain,
      srcToken
    );
    const toChainToken = await this.tokensService.queryToken(
      tgtChain,
      tgtToken
    );
    const fromTokenSymbol = fromChainToken.symbol;
    const toTokenSymbol = toChainToken.symbol;
    if (fromTokenSymbol === toTokenSymbol) {
      const digit = fromChainToken.decimals === 18 ? 8 : 5;
      const gasFee_fix = new BigNumber(transferValue)
        .multipliedBy(tradeFee)
        .dividedBy(BASE_TRADE_FEE)
        .decimalPlaces(digit, BigNumber.ROUND_UP);
      return new BigNumber(transferValue).minus(gasFee_fix).toString();
    } else {
      const exchangeRates = await queryRatesByCurrency("ETH");
      if (!exchangeRates) return throwNewError("get rate fail");
      const fromRate = exchangeRates[fromTokenSymbol];
      const toRate = exchangeRates[toTokenSymbol];
      const slippage = ruleConfig?.slippage || 0;
      if (!fromRate || !toRate || !slippage) {
        return throwNewError("get rate fail");
      }
      // TODO: add cross token
      return 0;
    }
  };

  toRefund = async <T extends TRefundResponse>(sendOptions: {
    to: string;
    amount: number | string;
    token: TTokenName | TAddress | TSymbol;
    fromChainId: string | number;
  }): Promise<T> => {
    changeActiveSignerType(sendOptions.fromChainId);
    try {
      const fromChainInfo = await this.queryChainInfo(sendOptions.fromChainId);

      await isFromChainIdMatchProvider(fromChainInfo);
      return await this.refundService.toSend<T>(sendOptions);
    } catch (error: any) {
      console.log(error);
      return throwNewError(error.message);
    }
  };

  toBridge = async <T extends TBridgeResponse>(
    transferConfig: ITransferConfig
  ): Promise<T> => {
    const { fromChainID, fromCurrency, toChainID, toCurrency, transferValue } =
      transferConfig;
    changeActiveSignerType(fromChainID);
    if (!getActiveSigner())
      throw new Error("Can not find signer, please check it!");
    const fromChainInfo = await this.queryChainInfo(fromChainID);

    await isFromChainIdMatchProvider(fromChainInfo);

    const toChainInfo = await this.queryChainInfo(toChainID);
    if (!fromChainInfo || !toChainInfo)
      throw new Error("Cant get ChainInfo by fromChainId or to toChainId.");

    const selectMakerConfig = await this.queryRouter({
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
      return await this.crossControl.getCrossFunction<T>(getActiveSigner(), {
        ...transferConfig,
        fromChainInfo,
        toChainInfo,
        selectMakerConfig,
      });
    } catch (error) {
      return throwNewError("Bridge getCrossFunction error", error);
    }
  };
}
