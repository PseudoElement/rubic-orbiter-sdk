import ChainsService from "../services/ChainsService";
import CrossRulesService from "../services/CrossRulesService";
import TokenService from "../services/TokenService";
import HistoryService from "../services/HistoryService";
import CrossControl from "../crossControl";
import { IChainInfo, IOBridgeConfig, ITransferConfig } from "../types";
import { Signer } from "ethers-6";
import { throwNewError } from "../utils";
import { Account } from "starknet";

export default class Orbiter {
  private signer: Signer | Account | any;

  private chainsService: ChainsService;
  private tokensService: TokenService;
  private crossRulesService: CrossRulesService;
  private historyService: HistoryService;

  private crossControl: CrossControl;

  constructor(config?: IOBridgeConfig) {
    this.signer = config?.signer || ({} as Signer);

    this.chainsService = ChainsService.getInstance();
    this.tokensService = TokenService.getInstance();
    this.crossRulesService = CrossRulesService.getInstance();
    this.historyService = new HistoryService(config?.signer || ({} as Signer));

    this.crossControl = CrossControl.getInstance();
  }

  public updateSigner(signer: Signer | Account): void {
    this.signer = signer;
    this.historyService.updateSigner(signer);
  }

  getChainsAsync = async () => {
    return await this.chainsService.getChainsAsync();
  };

  getChainInfoAsync = async (chainId: string | number) => {
    return await this.chainsService.getChainInfoAsync(chainId);
  };

  public getTokensService() {
    return this.tokensService;
  }

  getRulesAsync = async () => {
    return await this.crossRulesService.getRulesAsync();
  };

  getRuleByPairId = async (params: {
    fromChainInfo: IChainInfo;
    toChainInfo: IChainInfo;
    fromCurrency: string;
    toCurrency: string;
  }) => {
    return await this.crossRulesService.getRuleByPairId(params);
  };

  getHistoryListAsync = async (params: {
    pageNum: number;
    pageSize: number;
  }) => {
    return await this.historyService.queryHistoryList(params);
  };

  searchTransaction = async (txHash: string, fromChainID: number | string) => {
    return this.historyService.searchTransaction(txHash, fromChainID);
  };

  public async toBridge(transferConfig: ITransferConfig) {
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
    const toChainInfo = await this.getChainInfoAsync(toChainID);
    if (!fromChainInfo || !toChainInfo)
      throw new Error("Cant get ChainInfo by fromChainId or to toChainId.");
    const selectMakerConfig = await this.getRuleByPairId({
      fromChainInfo,
      toChainInfo,
      fromCurrency,
      toCurrency,
    });
    if (selectMakerConfig && !Object.keys(selectMakerConfig).length)
      throw new Error("has no rule match, pls check your params!");
    if (
      transferValue > selectMakerConfig.fromChain.maxPrice ||
      transferValue < selectMakerConfig.fromChain.minPrice
    )
      throw new Error(
        "Not in the correct price range, please check your value"
      );
    try {
      return await this.crossControl.getCrossFunction(this.signer, {
        ...transferConfig,
        fromChainInfo,
        toChainInfo,
        selectMakerConfig,
        transferExt,
      });
    } catch (error) {
      throwNewError("Bridge getCrossFunction error", error);
    }
  }
}
