import { queryRouters } from "./ApiService";
import { IChainInfo, ICrossRule } from "../types";
import { throwNewError } from "../utils";
import { HexString } from "ethers-6/lib.commonjs/utils/data";

export default class CrossRulesService {
  private static instance: CrossRulesService;
  private dealerId: string | HexString;
  private readonly loadingPromise: Promise<void>;
  private crossRules: ICrossRule[] = [];

  constructor(dealerId?: string | HexString) {
    this.dealerId = dealerId || "";
    this.loadingPromise = this.loadRoutersRule();
  }

  private async loadRoutersRule(): Promise<void> {
    try {
      this.crossRules = await queryRouters(this.dealerId);
    } catch (error: any) {
      throwNewError("crossRules init failed.", error.message);
    }
  }

  private async checkLoading() {
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
    if (!this.crossRules.length) {
      await this.loadRoutersRule();
    }
  }

  public updateDealerId(dealerId: string | HexString) {
    this.dealerId = dealerId;
    this.crossRules = [];
  }

  public static getInstance(): CrossRulesService {
    if (!this.instance) {
      this.instance = new CrossRulesService();
    }

    return this.instance;
  }

  public async queryRulesAsync(): Promise<ICrossRule[]> {
    await this.checkLoading();

    return this.crossRules;
  }

  public async queryRouterRule(pairInfo: {
    dealerId: string | HexString;
    fromChainInfo: IChainInfo;
    toChainInfo: IChainInfo;
    fromCurrency: string;
    toCurrency: string;
  }): Promise<ICrossRule> {
    await this.checkLoading();

    const { fromChainInfo, toChainInfo, fromCurrency, toCurrency } = pairInfo;
    if (!fromChainInfo || !toChainInfo || !fromCurrency || !toCurrency)
      return {} as ICrossRule;
    const filterPairId = `${fromChainInfo.chainId}/${toChainInfo.chainId}-${fromCurrency}/${toCurrency}`;
    const targetRule =
      this.crossRules.find((item) => {
        return item.line === filterPairId;
      }) || ({} as ICrossRule);
    return targetRule;
  }
}
