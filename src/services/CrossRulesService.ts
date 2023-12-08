import { queryTradingPairs } from "./ApiService";
import { IChainInfo, ICrossRule } from "../types";
import { throwNewError } from "../utils";

export default class CrossRulesService {
  private static instance: CrossRulesService;
  private readonly loadingPromise: Promise<void>;
  private crossRules: ICrossRule[] = [];

  constructor() {
    this.loadingPromise = this.loadAvailableCrossRules();
  }

  private async loadAvailableCrossRules(): Promise<void> {
    try {
      this.crossRules = (await queryTradingPairs()).ruleList;
    } catch (error) {
      throwNewError("crossRules init failed.");
    }
  }

  private async checkLoading() {
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
    if (!this.crossRules.length) {
      await this.loadAvailableCrossRules();
    }
  }

  public static getInstance(): CrossRulesService {
    if (!this.instance) {
      this.instance = new CrossRulesService();
    }

    return this.instance;
  }

  public getRules(): ICrossRule[] {
    return this.crossRules;
  }

  public async getRulesAsync(): Promise<ICrossRule[]> {
    await this.checkLoading();

    return this.crossRules;
  }

  public async getRuleByPairId(pairInfo: {
    fromChainInfo: IChainInfo;
    toChainInfo: IChainInfo;
    fromCurrency: string;
    toCurrency: string;
  }): Promise<ICrossRule> {
    await this.checkLoading();

    const { fromChainInfo, toChainInfo, fromCurrency, toCurrency } = pairInfo;
    if (!fromChainInfo || !toChainInfo || !fromCurrency || !toCurrency)
      return {} as ICrossRule;
    const filterPairId = `${fromChainInfo.chainId}-${toChainInfo.chainId}:${fromCurrency}-${toCurrency}`;
    const targetRule =
      this.crossRules.find((item) => {
        return item.pairId === filterPairId;
      }) || ({} as ICrossRule);
    return targetRule;
  }
}
