import {
  IChainInfo,
  IToken,
  ITokensByChain,
  TAddress,
  TSymbol,
  TTokenName,
} from "../types";
import { throwNewError } from "../utils";
import ChainsService from "./ChainsService";
import { isArray } from "lodash";

export default class TokenService {
  private static instance: TokenService;
  private tokensByChain: ITokensByChain = {};
  private chainsService: ChainsService;
  private readonly loadingPromise: Promise<void>;

  constructor() {
    this.chainsService = ChainsService.getInstance();
    this.loadingPromise = this.loadTokensByChain();
  }

  public static getInstance(): TokenService {
    if (!this.instance) {
      this.instance = new TokenService();
    }

    return this.instance;
  }

  private async loadTokensByChain() {
    try {
      const res = (await this.chainsService.getChainsAsync()) || [];
      this.tokensByChain = this.getAllChainTokensAsync(res);
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

  private getAllChainTokensAsync(chains: IChainInfo[]): ITokensByChain {
    if (!chains.length) return {};
    const chainTokens: ITokensByChain = {};
    chains.forEach((item) => {
      chainTokens[item.chainId] = item.tokens;
    });
    return chainTokens;
  }

  public async getTokensByChainAsync() {
    await this.checkLoading();
    return this.tokensByChain;
  }

  public async getTokensByChainIdAsync(chainId: string | number) {
    await this.checkLoading();
    return this.tokensByChain[String(chainId)] || [];
  }

  public async getTokensDecimals(
    chainId: string | number,
    token:
      | TTokenName
      | TAddress
      | TSymbol
      | Array<TTokenName | TAddress | TSymbol>
  ) {
    await this.checkLoading();
    const targetChainTokensInfo = this.tokensByChain[String(chainId)] || [];
    if (!targetChainTokensInfo.length) return void 0;
    const findDecimals = (token: TTokenName | TAddress | TSymbol) => {
      return (
        targetChainTokensInfo.find((item: IToken) => {
          return item.name === token || item.symbol === token || item.address;
        })?.decimals || void 0
      );
    };
    if (isArray(token)) {
      const tokensDecimals: { [k: string]: number | undefined } = {};
      token.forEach((v: TTokenName | TAddress | TSymbol) => {
        tokensDecimals[v as keyof typeof tokensDecimals] = findDecimals(v);
      });
      return tokensDecimals;
    }
    return findDecimals(token);
  }
}
