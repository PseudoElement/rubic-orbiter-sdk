import { equalsIgnoreCase, getContract, throwNewError } from "../utils";
import { Signer, ethers } from "ethers-6";
import { Account } from "starknet";
import ChainsService from "./ChainsService";
import TokensService from "./TokensService";
import { IChainInfo, IToken, TAddress, TSymbol, TTokenName } from "../types";

export default class RefundService {
  private signer: Account | Signer;
  private chainsService: ChainsService;
  private tokensService: TokensService;

  constructor(signer: Account | Signer) {
    this.signer = signer;
    this.chainsService = ChainsService.getInstance();
    this.tokensService = TokensService.getInstance();
  }

  public updateConfig(config: { signer: Account | Signer }) {
    this.signer = config.signer;
  }

  public async toSend(params: {
    to: string;
    amount: number | string;
    token: TTokenName | TAddress | TSymbol;
    fromChainId: string | number;
  }): Promise<any> {
    if (!Object.keys(this.signer).length)
      return throwNewError("can not send transfer without signer.");
    const { to, amount, token, fromChainId } = params;
    if (!to || !amount || !token) return throwNewError("toSend params error.");
    let account: string | Promise<string>;
    const tokenInfo = await this.tokensService.getTokenAsync(
      fromChainId,
      token
    );
    if (!tokenInfo) return throwNewError("Without tokenInfo.");

    const fromChainInfo = await this.chainsService.getChainInfoAsync(
      fromChainId
    );
    if ("getAddress" in this.signer) {
      account = await this.signer.getAddress();
      return await this.sendToEvm({
        to,
        amount,
        token,
        account,
        fromChainId,
        tokenInfo,
        fromChainInfo,
      });
    } else {
      account = this.signer.address;
    }
    try {
    } catch (error: any) {
      throwNewError(error.message);
    }
  }

  private async sendToEvm(options: {
    account: string;
    to: string;
    amount: number | string;
    token: TTokenName | TAddress | TSymbol;
    fromChainId: string | number;
    tokenInfo: IToken;
    fromChainInfo: IChainInfo;
  }) {
    const currentSigner = this.signer as Signer;
    const {
      account,
      to,
      amount,
      token,
      fromChainId,
      fromChainInfo,
      tokenInfo,
    } = options;
    let gasLimit: bigint;

    const value = ethers.parseUnits(String(amount), tokenInfo.decimals);

    if (
      equalsIgnoreCase(fromChainInfo.nativeCurrency.address, tokenInfo.address)
    ) {
      gasLimit = await (this.signer as Signer).estimateGas({
        from: account,
        to,
        value,
      });
      if (String(fromChainId) === "2" && gasLimit < 21000n) {
        gasLimit = 21000n;
      }
      return await currentSigner.sendTransaction({
        from: account,
        to,
        value,
        gasLimit,
      });
    } else {
      const transferContract = getContract({
        contractAddress: token,
        localChainID: fromChainId,
        signer: currentSigner,
      });
      if (!transferContract) {
        return throwNewError(
          "Failed to obtain contract information, please try again."
        );
      }

      gasLimit = await transferContract.transfer.estimateGas(to, value);
      if (String(fromChainId) === "42161" && gasLimit < 21000n) {
        gasLimit = 21000n;
      }

      return await transferContract.transfer(to, value, {
        gasLimit,
      });
    }
  }
}
