import { queryChains } from "./ApiService";
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
      this.chains = await queryChains();
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

  public async getChainInfoAsync(chain: number | string): Promise<IChainInfo> {
    await this.checkLoading();

    const currentChain = chain.toString();

    const chainInfo = this.chains.find(
      (chainItem) =>
        chainItem.chainId === currentChain ||
        chainItem.internalId === currentChain ||
        chainItem.networkId === currentChain
    );

    return chainInfo ?? ({} as IChainInfo);
  }

  public async getChainsAsync(): Promise<IChainInfo[]> {
    await this.checkLoading();

    return this.chains;
  }
}
