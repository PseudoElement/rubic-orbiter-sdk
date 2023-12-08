import { IChainInfo, ITokensByChain } from "../types";
import { throwNewError } from "../utils";
import ChainsService from "./ChainsService";

export default class TokenService {
  private static instance: TokenService;
  private tokensByChain: ITokensByChain = {};
  private chainsService: ChainsService;
  private readonly loadingPromise: Promise<IChainInfo[]>;

  constructor() {
    this.chainsService = ChainsService.getInstance();
    this.loadingPromise = this.chainsService.getChainsAsync();
  }

  public static getInstance(): TokenService {
    if (!this.instance) {
      this.instance = new TokenService();
    }

    return this.instance;
  }

  private loadTokensByChain() {
    try {
      const res = this.chainsService.getChains() || [];
      this.tokensByChain = this.getTokensAllChain(res);
    } catch (error) {
      throwNewError("TokenService init failed.");
    }
  }

  private async checkLoading() {
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
    if (!this.tokensByChain.length) {
      this.loadTokensByChain();
    }
  }

  public getTokensAllChain(chains: IChainInfo[]): ITokensByChain {
    if (!!chains.length) return {};
    const chainTokens: ITokensByChain = {};
    chains.forEach((item) => {
      chainTokens[item.chainId] = item.tokens;
    });
    return chainTokens;
  }

  public getTokensByChain() {
    return this.tokensByChain;
  }

  public async getTokensByChainAsync() {
    await this.checkLoading();
    return this.tokensByChain;
  }

  public getTokensByChainId(chainId: string | number) {
    return this.tokensByChain[chainId];
  }

  public async getTokensByChainIdAsync(chainId: string | number) {
    await this.checkLoading();
    return this.tokensByChain[chainId];
  }
}
