import Web3 from "web3";
import { Signer, ethers } from "ethers-6";
import { Account, Contract, uint256 } from "starknet";
import { STARKNET_ERC20_ABI } from "../constant/abi";
import { getGlobalState } from "../globalState";
import loopring from "../crossControl/loopring";
import { isStarknet } from "../utils";
import {
  equalsIgnoreCase,
  getActiveAccount,
  getActiveSigner,
  getContract,
  isLoopring,
  throwNewError,
} from "../utils";
import ChainsService from "./ChainsService";
import TokensService from "./TokensService";
import {
  IChainInfo,
  IToken,
  TAddress,
  TRefundResponse,
  TSymbol,
  TTokenName,
} from "../types";

export default class RefundService {
  private chainsService: ChainsService;
  private tokensService: TokensService;
  private static instance: RefundService;

  constructor() {
    this.chainsService = ChainsService.getInstance();
    this.tokensService = TokensService.getInstance();
  }

  public static getInstance(): RefundService {
    if (!this.instance) {
      this.instance = new RefundService();
    }

    return this.instance;
  }

  public async toSend<T extends TRefundResponse>(params: {
    to: string;
    amount: number | string;
    token: TTokenName | TAddress | TSymbol;
    fromChainId: string | number;
  }): Promise<T> {
    const { to, amount, token, fromChainId } = params;
    if (!to || !amount || !token) return throwNewError("toSend params error.");
    const tokenInfo = await this.tokensService.queryToken(fromChainId, token);
    if (!tokenInfo) return throwNewError("Without tokenInfo.");
    const fromChainInfo = await this.chainsService.queryChainInfo(fromChainId);
    const account = await getActiveAccount();

    if (isLoopring(fromChainId)) {
      if (!account) return throwNewError("loopring refund`s account is error.");
      const options = {
        to,
        amount,
        token,
        account,
        fromChainId,
        tokenInfo,
        fromChainInfo,
      };
      return await this.sendToLoopring<T>(options);
    }
    if (!isStarknet(fromChainId)) {
      return await this.sendToEvm<T>({
        to,
        amount,
        token,
        account,
        fromChainId,
        tokenInfo,
        fromChainInfo,
      });
    }
    return await this.sendToStarknet<T>({
      to,
      amount,
      token,
      account,
    });
  }

  private async sendToLoopring<T>(options: {
    account: string;
    to: string;
    amount: number | string;
    token: TTokenName | TAddress | TSymbol;
    fromChainId: string | number;
    tokenInfo: IToken;
    fromChainInfo: IChainInfo;
  }): Promise<T> {
    const { account, to, amount, token, fromChainInfo } = options;
    const loopringSigner: Web3 = getGlobalState().loopringSigner;
    if (!Object.keys(loopringSigner).length) {
      return throwNewError(
        "should update loopringSigner by updateConfig function."
      );
    }
    try {
      return (await loopring.sendTransfer(
        loopringSigner,
        account,
        String(fromChainInfo.chainId),
        to,
        token,
        ethers.parseUnits(String(amount)),
        ""
      )) as T;
    } catch (error: any) {
      const errorEnum = {
        "account is not activated":
          "This Loopring account is not yet activated, please activate it before transferring.",
        "User account is frozen":
          "Your Loopring account is frozen, please check your Loopring account status on Loopring website. Get more details here: https://docs.loopring.io/en/basics/key_mgmt.html?h=frozen",
        default: error.message,
      };
      return throwNewError(
        errorEnum[error.message as keyof typeof errorEnum] ||
          errorEnum.default ||
          "Something was wrong by loopring transfer. please check it all",
        error
      );
    }
  }

  private async sendToStarknet<T>(options: {
    account: string;
    to: string;
    amount: number | string;
    token: TTokenName | TAddress | TSymbol;
  }): Promise<T> {
    const currentSigner = getActiveSigner<Account>();
    const { account, to, amount, token } = options;
    const erc20Contract = new Contract(
      STARKNET_ERC20_ABI,
      token,
      currentSigner
    );
    if (!account) return throwNewError("starknet account error");
    try {
      const transferERC20TxCall = erc20Contract.populate("transfer", [
        to,
        {
          type: "struct",
          ...uint256.bnToUint256(ethers.parseUnits(String(amount))),
        },
      ]);
      return (await currentSigner.execute(transferERC20TxCall)) as T;
    } catch (e) {
      console.log(e);
      return throwNewError("starknet refund error", e);
    }
  }

  private async sendToEvm<T>(options: {
    account: string;
    to: string;
    amount: number | string;
    token: TTokenName | TAddress | TSymbol;
    fromChainId: string | number;
    tokenInfo: IToken;
    fromChainInfo: IChainInfo;
  }): Promise<T> {
    const currentSigner = getActiveSigner<Signer>();
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
      gasLimit = await getActiveSigner<Signer>().estimateGas({
        from: account,
        to,
        value,
      });
      if (String(fromChainId) === "2" && gasLimit < 21000n) {
        gasLimit = 21000n;
      }
      return (await currentSigner.sendTransaction({
        from: account,
        to,
        value,
        gasLimit,
      })) as T;
    } else {
      const transferContract = getContract({
        contractAddress: tokenInfo.address,
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

      return (await transferContract.transfer(to, value, {
        gasLimit,
      })) as T;
    }
  }
}
