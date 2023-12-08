import { queryTradingPairs } from "./ApiService";
import { IChainInfo } from "../types";
import { throwNewError } from "../utils";

export default class ChainsService {
  private static instance: ChainsService;
  private readonly loadingPromise: Promise<void>;
  private chains: IChainInfo[] = [];

  constructor() {
    this.loadingPromise = this.loadAvailableChains();
  }

  private async loadAvailableChains(): Promise<void> {
    try {
      this.chains = (await queryTradingPairs()).chainList;
    } catch (error) {
      throwNewError("chainsService init failed.");
    }
  }

  private async checkLoading() {
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
    if (!this.chains.length) {
      await this.loadAvailableChains();
    }
  }

  public static getInstance(): ChainsService {
    if (!this.instance) {
      this.instance = new ChainsService();
    }

    return this.instance;
  }

  public getChainInfo(chain: number | string): IChainInfo {
    const currentChain = chain.toString();
    const chainInfo = this.chains.find(
      (chainItem) =>
        chainItem.chainId === currentChain ||
        chainItem.internalId === currentChain
    );
    if (!chainInfo) {
      throw new Error(`getChainInfo: Unknown chain passed: ${currentChain}.`);
    }

    return chainInfo;
  }

  public async getChainInfoAsync(chain: number | string): Promise<IChainInfo> {
    await this.checkLoading();

    const currentChain = chain.toString();

    const chainInfo = this.chains.find(
      (chainItem) =>
        chainItem.chainId === currentChain ||
        chainItem.internalId === currentChain
    );
    if (!chainInfo) {
      throw new Error(
        `getChainInfoAsync: Unknown chain passed: ${currentChain}.`
      );
    }

    return chainInfo;
  }

  public getChains(): IChainInfo[] {
    return this.chains;
  }

  public async getChainsAsync(): Promise<IChainInfo[]> {
    await this.checkLoading();

    return this.chains;
  }
}
