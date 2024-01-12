import { isArray } from "lodash";
import {
  IToken,
  ITokensByChain,
  TAddress,
  TSymbol,
  TTokenName,
} from "../types";
import { throwNewError } from "../utils";
import { queryTokens } from "./ApiService";

export default class TokensService {
  private static instance: TokensService;
  private tokens: ITokensByChain = {};

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
      throwNewError("TokensService init failed.", error);
    }
  }

  private async checkLoading() {
    if (!Object.keys(this.tokens).length) {
      await this.loadTokens();
    }
  }

  public updateConfig(): void {
    this.tokens = {};
  }

  public async queryTokensAllChain() {
    await this.checkLoading();
    return this.tokens;
  }

  public async queryTokensByChainId(chainId: string | number) {
    await this.checkLoading();
    return this.tokens[String(chainId)] || [];
  }

  public async queryTokensDecimals(
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

  public async queryToken(
    chainId: string | number,
    token: TTokenName | TAddress | TSymbol
  ): Promise<IToken> {
    await this.checkLoading();
    const targetChainTokensInfo = this.tokens[String(chainId)] || [];
    if (!targetChainTokensInfo.length)
      return throwNewError("queryToken tokens is empry.");

    const findToken = (token: TTokenName | TAddress | TSymbol) => {
      return targetChainTokensInfo.find((item: IToken) => {
        return (
          item.name === token || item.symbol === token || item.address === token
        );
      });
    };
    return findToken(token) || ({} as IToken);
  }
}
