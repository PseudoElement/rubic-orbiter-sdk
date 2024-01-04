import { queryRouter } from "./ApiService";
import { IChainInfo, ICrossRule } from "../types";
import { throwNewError } from "../utils";
import { HexString } from "ethers-6/lib.commonjs/utils/data";

export default class CrossRulesService {
  private static instance: CrossRulesService;
  private dealerId: string | HexString;
  private crossRouters: ICrossRule[] = [];

  constructor(dealerId?: string | HexString) {
    this.dealerId = dealerId || "";
  }

  private async loadRoutersRule(): Promise<void> {
    try {
      this.crossRouters = await queryRouter(this.dealerId);
    } catch (error: any) {
      throwNewError("crossRouters init failed.", error.message);
    }
  }

  private async checkLoading() {
    if (!this.crossRouters.length) {
      await this.loadRoutersRule();
    }
  }

  public updateConfig(config: { dealerId: string | HexString }) {
    this.crossRouters = [];
    this.dealerId = config.dealerId;
  }

  public static getInstance(): CrossRulesService {
    if (!this.instance) {
      this.instance = new CrossRulesService();
    }

    return this.instance;
  }

  public async queryRouters(): Promise<ICrossRule[]> {
    await this.checkLoading();

    return this.crossRouters;
  }

  public async queryRouter(pairInfo: {
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
      this.crossRouters.find((item) => {
        return item.line === filterPairId;
      }) || ({} as ICrossRule);
    return targetRule;
  }
}
