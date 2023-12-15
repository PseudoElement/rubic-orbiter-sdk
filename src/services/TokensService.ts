import {
  IToken,
  ITokensByChain,
  TAddress,
  TSymbol,
  TTokenName,
} from "../types";
import { throwNewError } from "../utils";
import { queryTokens } from "./ApiService";
import { isArray } from "lodash";

export default class TokensService {
  private static instance: TokensService;
  private tokens: ITokensByChain = {};
  private readonly loadingPromise: Promise<void>;

  constructor() {
    this.loadingPromise = this.loadTokens();
  }

  public static getInstance(): TokensService {
    if (!this.instance) {
      this.instance = new TokensService();
    }

    return this.instance;
  }

  private async loadTokens() {
    try {
      this.tokens = (await queryTokens()) || {};
    } catch (error) {
      throwNewError("TokensService init failed.");
    }
  }

  private async checkLoading() {
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
    if (!this.tokens.length) {
      this.loadTokens();
    }
  }

  public async getTokensAllChainAsync() {
    await this.checkLoading();
    return this.tokens;
  }

  public async getTokensByChainIdAsync(chainId: string | number) {
    await this.checkLoading();
    return this.tokens[String(chainId)] || [];
  }

  public async getTokensDecimalsAsync(
    chainId: string | number,
    token:
      | TTokenName
      | TAddress
      | TSymbol
      | Array<TTokenName | TAddress | TSymbol>
  ) {
    await this.checkLoading();
    const targetChainTokensInfo = this.tokens[String(chainId)] || [];
    if (!targetChainTokensInfo.length) return void 0;
    const findDecimals = (token: TTokenName | TAddress | TSymbol) => {
      return (
        targetChainTokensInfo.find((item: IToken) => {
          return (
            item.name === token ||
            item.symbol === token ||
            item.address === token
          );
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

  public async getTokenAsync(
    chainId: string | number,
    token: TTokenName | TAddress | TSymbol
  ) {
    await this.checkLoading();
    const targetChainTokensInfo = this.tokens[String(chainId)] || [];
    if (!targetChainTokensInfo.length) return void 0;

    const findToken = (token: TTokenName | TAddress | TSymbol) => {
      return (
        targetChainTokensInfo.find((item: IToken) => {
          return (
            item.name === token ||
            item.symbol === token ||
            item.address === token
          );
        }) || void 0
      );
    };
    return findToken(token);
  }
}
