import { Signer } from "ethers-6";
import { ethers } from "ethers";
import Web3 from "web3";
import { Account } from "starknet";
import BigNumber from "bignumber.js";
import { ERC20TokenType, ETHTokenType } from "@imtbl/imx-sdk";
import { CrossAddress } from "../crossAddress/crossAddress";
import loopring from "./loopring";
import { getTransferValue, isExecuteOrbiterRouterV3 } from "../orbiter/utils";
import {
  getActiveAccount,
  getContract,
  getContractAddressByType,
  getRealTransferValue,
  isEthTokenAddress,
  throwNewError,
} from "../utils";
import { ICrossFunctionParams, TBridgeResponse, TCrossConfig } from "../types";
import {
  CHAIN_ID_MAINNET,
  CHAIN_ID_TESTNET,
  CONTRACT_TYPE_ROUTER_V3,
  CONTRACT_TYPE_SOURCE,
} from "../constant/common";
import { IMXHelper } from "./imx_helper";
import {
  getAccountAddressError,
  sendTransfer,
  starknetHashFormat,
} from "./starknet_helper";
import { OrbiterRouterType, orbiterRouterTransfer } from "./orbiterRouter";
import TokenService from "../services/TokensService";
import { getGlobalState } from "../globalState";

export default class CrossControl {
  private static instance: CrossControl;
  private crossConfig: TCrossConfig = {} as TCrossConfig;
  private signer: Signer | Account | Web3 | any = null as unknown as
    | Signer
    | Account
    | Web3
    | any;

  constructor() {}

  public static getInstance(): CrossControl {
    if (!this.instance) {
      this.instance = new CrossControl();
    }

    return this.instance;
  }

  private async initCrossFunctionConfig(
    signer: Signer | Account | Web3,
    crossParams: ICrossFunctionParams
  ) {
    this.signer = signer;
    const {
      fromChainID,
      toChainID,
      selectMakerConfig,
      fromChainInfo,
      transferValue,
    } = crossParams;
    const tokenAddress = selectMakerConfig.srcToken;
    const to = selectMakerConfig.endpoint;
    const fromChainTokens =
      await TokenService.getInstance().queryTokensByChainId(fromChainID);
    const toChainTokens = await TokenService.getInstance().queryTokensByChainId(
      toChainID
    );
    const fromTokenInfo = fromChainTokens.find(
      (item) => item.address === selectMakerConfig.srcToken
    );
    const toTokenInfo = toChainTokens.find(
      (item) => item.address === selectMakerConfig.tgtToken
    );
    if (!fromTokenInfo || !toTokenInfo)
      return throwNewError("fromToken or toToken is empty.");
    const isETH = isEthTokenAddress(
      tokenAddress,
      fromChainInfo,
      fromChainTokens
    );
    const tradeFee = (
      BigInt(selectMakerConfig!.tradeFee) / 1000000n
    ).toString();
    try {
      const tValue = getTransferValue({
        transferValue,
        decimals: fromTokenInfo.decimals,
        selectMakerConfig,
      });

      if (!tValue.state) throwNewError("get transfer value error.");
      this.crossConfig = {
        ...crossParams,
        tokenAddress,
        isETH,
        fromChainTokens,
        fromTokenInfo,
        toTokenInfo,
        to,
        tradeFee,
        tValue,
        account: await getActiveAccount(),
      };
    } catch (error) {
      throwNewError("init cross config error.", error);
    }
  }

  public async getCrossFunction<T extends TBridgeResponse>(
    signer: Signer | Account | Web3,
    crossParams: ICrossFunctionParams
  ): Promise<T> {
    await this.initCrossFunctionConfig(signer, crossParams);
    const {
      fromChainID,
      toChainID,
      fromChainInfo,
      fromCurrency,
      toCurrency,
      crossAddressReceipt,
      selectMakerConfig,
    } = this.crossConfig;
    if (
      isExecuteOrbiterRouterV3({
        fromChainID,
        fromChainInfo,
        toChainID,
        fromCurrency,
        toCurrency,
        crossAddressReceipt,
        selectMakerConfig,
      })
    ) {
      return await this.xvmTransfer();
    }
    switch (fromChainID) {
      case CHAIN_ID_MAINNET.zksync:
      case CHAIN_ID_TESTNET.zksync_test:
        return throwNewError(
          "zksync lite has some questions to be resolved and will be opened after they are fixed"
        );
      case CHAIN_ID_MAINNET.loopring:
      case CHAIN_ID_TESTNET.loopring_test:
        return await this.loopringTransfer();
      case CHAIN_ID_MAINNET.starknet:
      case CHAIN_ID_TESTNET.starknet_test:
        return await this.starknetTransfer();
      case CHAIN_ID_MAINNET.imx:
      case CHAIN_ID_TESTNET.imx_test:
        return await this.imxTransfer();

      default: {
        if (
          toChainID === CHAIN_ID_MAINNET.starknet ||
          toChainID === CHAIN_ID_TESTNET.starknet_test
        ) {
          return await this.transferToStarkNet();
        }
        return await this.evmTransfer();
      }
    }
  }

  private async xvmTransfer<T>(): Promise<T> {
    const {
      fromChainInfo,
      crossAddressReceipt,
      transferValue,
      selectMakerConfig,
      account,
      isETH,
      fromTokenInfo,
      toTokenInfo,
      tradeFee,
    } = this.crossConfig;

    const amount = getRealTransferValue(
      selectMakerConfig,
      transferValue,
      fromTokenInfo.decimals
    );
    const contractAddress =
      fromChainInfo.contract &&
      getContractAddressByType(fromChainInfo.contract, CONTRACT_TYPE_ROUTER_V3);
    const tokenAddress = selectMakerConfig.srcToken;
    if (!contractAddress || !tokenAddress)
      return throwNewError(
        "xvmTransfer error [contractAddress or tokenAddress] is empty."
      );
    if (!isETH) {
      const crossAddress = new CrossAddress(
        this.signer,
        fromChainInfo,
        contractAddress
      );
      await crossAddress.contractApprove(tokenAddress, amount, contractAddress);
    }
    try {
      const type =
        fromTokenInfo.symbol === toTokenInfo.symbol
          ? OrbiterRouterType.CrossAddress
          : OrbiterRouterType.CrossAddressCurrency;
      return (await orbiterRouterTransfer({
        signer: this.signer,
        type,
        value: amount,
        transferValue,
        fromChainInfo,
        toWalletAddress: crossAddressReceipt ?? account,
        selectMakerConfig,
        isETH,
        fromTokenInfo,
        toTokenInfo,
        tradeFee,
      })) as T;
    } catch (error) {
      return throwNewError("XVM transfer error", error);
    }
  }

  private async evmTransfer<T>(): Promise<T> {
    const {
      fromChainID,
      selectMakerConfig,
      tokenAddress,
      account,
      tValue,
      isETH,
    } = this.crossConfig;
    if (isETH) {
      const tx: T = await this.signer.sendTransaction({
        from: account,
        to: selectMakerConfig.endpoint,
        value: tValue?.tAmount,
      });
      return tx;
    } else {
      const transferContract = getContract({
        contractAddress: tokenAddress,
        localChainID: fromChainID,
        signer: this.signer,
      });
      if (!transferContract) {
        return throwNewError(
          "Failed to obtain contract information, please refresh and try again."
        );
      }
      try {
        return (await transferContract.transfer(
          selectMakerConfig.endpoint,
          tValue?.tAmount
        )) as T;
      } catch (error) {
        return throwNewError("evm transfer error", error);
      }
    }
  }

  private async loopringTransfer<T>(): Promise<T> {
    const {
      selectMakerConfig,
      crossAddressReceipt,
      fromChainID,
      tValue,
      tokenAddress,
      toChainInfo,
      account,
    } = this.crossConfig;
    const p_text = 9000 + Number(toChainInfo.internalId) + "";
    const amount = tValue.tAmount;
    const memo = crossAddressReceipt
      ? `${p_text}_${crossAddressReceipt}`
      : p_text;
    if (memo.length > 128)
      return throwNewError("The sending address is too long");

    const loopringSigner: Web3 = getGlobalState().loopringSigner;
    if (!Object.keys(loopringSigner).length) {
      return throwNewError(
        "should update loopringSigner by [updateConfig] function."
      );
    }
    try {
      return (await loopring.sendTransfer(
        loopringSigner,
        account,
        fromChainID,
        selectMakerConfig.endpoint,
        tokenAddress,
        amount,
        memo
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

  private async starknetTransfer<T>(): Promise<T> {
    const {
      selectMakerConfig,
      account,
      crossAddressReceipt,
      fromChainInfo,
      tValue,
    } = this.crossConfig;
    if (!account || !new RegExp(/^0x[a-fA-F0-9]{64}$/).test(account)) {
      return throwNewError("Please check your starknet address.");
    }
    if (!crossAddressReceipt)
      return throwNewError("crossAddressReceipt can not be empty.");
    if (selectMakerConfig.endpoint.length < 60) {
      return throwNewError("crossAddressReceipt iserror.");
    }
    try {
      const contractAddress = selectMakerConfig.srcToken;
      return (await sendTransfer(
        this.signer,
        crossAddressReceipt,
        contractAddress,
        selectMakerConfig.endpoint,
        new BigNumber(tValue.tAmount.toString()),
        fromChainInfo
      )) as T;
    } catch (error) {
      return throwNewError("starknet transfer error", error);
    }
  }

  private async transferToStarkNet<T>(): Promise<T> {
    const {
      selectMakerConfig,
      tValue,
      crossAddressReceipt,
      fromChainInfo,
      isETH,
      transferValue,
      fromTokenInfo,
      toTokenInfo,
      tradeFee,
    } = this.crossConfig;
    if (
      !crossAddressReceipt ||
      starknetHashFormat(crossAddressReceipt).length !== 66 ||
      starknetHashFormat(crossAddressReceipt) ===
        "0x0000000000000000000000000000000000000000000000000000000000000000"
    ) {
      return throwNewError("please use correct starknet address");
    }
    const error = getAccountAddressError(crossAddressReceipt, "starknet");
    if (error) {
      return throwNewError(`starknet get account address error: ${error}`);
    }
    const contractByType =
      fromChainInfo.contract &&
      getContractAddressByType(fromChainInfo.contract, CONTRACT_TYPE_SOURCE);
    if (!fromChainInfo.contract || !contractByType) {
      return throwNewError("Contract not in fromChainInfo.");
    }
    try {
      return (await orbiterRouterTransfer({
        signer: this.signer,
        type: OrbiterRouterType.CrossAddress,
        value: tValue.tAmount,
        transferValue,
        fromChainInfo,
        toWalletAddress: crossAddressReceipt,
        selectMakerConfig,
        isETH,
        fromTokenInfo,
        toTokenInfo,
        tradeFee,
      })) as T;
    } catch (err) {
      return throwNewError("transfer to starknet error", err);
    }
  }

  private async imxTransfer<T>(): Promise<T> {
    const {
      selectMakerConfig,
      fromChainID,
      account,
      tValue,
      isETH,
      fromTokenInfo,
    } = this.crossConfig;
    try {
      const contractAddress = selectMakerConfig.srcToken;

      const imxHelper = new IMXHelper(fromChainID);
      const imxClient = await imxHelper.getImmutableXClient(
        this.signer,
        account,
        true
      );

      let tokenInfo: {
        type: ETHTokenType | ERC20TokenType | any;
        data: {
          symbol?: string;
          decimals: number;
          tokenAddress?: string;
        };
      } = {
        type: ETHTokenType.ETH,
        data: {
          decimals: fromTokenInfo.decimals,
        },
      };
      if (!isETH) {
        tokenInfo = {
          type: ERC20TokenType.ERC20,
          data: {
            symbol: fromTokenInfo.symbol,
            decimals: fromTokenInfo.decimals,
            tokenAddress: contractAddress,
          },
        };
      }
      return (await imxClient.transfer({
        sender: account,
        token: tokenInfo,
        quantity: ethers.BigNumber.from(tValue.tAmount.toString()),
        receiver: selectMakerConfig.endpoint,
      })) as T;
    } catch (error: any) {
      return throwNewError("Imx transfer error", error);
    }
  }
}
