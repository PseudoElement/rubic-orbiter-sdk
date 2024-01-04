import { Signer } from "ethers-6";
import ethers from "ethers";
import {
  submitSignedTransactionsBatch,
  Transaction,
  utils,
  Wallet,
} from "zksync";
import { CrossAddress } from "../crossAddress/crossAddress";
import loopring from "./loopring";
import {
  getTransferValue,
  getZkSyncProvider,
  isExecuteOrbiterRouterV3,
} from "../orbiter/utils";
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
import BigNumber from "bignumber.js";
import { ERC20TokenType, ETHTokenType } from "@imtbl/imx-sdk";
import { IMXHelper } from "./imx_helper";
import {
  getAccountAddressError,
  sendTransfer,
  starknetHashFormat,
} from "./starknet_helper";
import { Account } from "starknet";
import { OrbiterRouterType, orbiterRouterTransfer } from "./orbiterRouter";
import TokenService from "../services/TokensService";
import { getGlobalState } from "../globalState";
import Web3 from "web3";

export default class CrossControl {
  private static instance: CrossControl;
  private crossConfig: TCrossConfig = {} as TCrossConfig;
  private signer: Signer | Account | any = null as unknown as
    | Signer
    | Account
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
      toChainInfo,
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
        fromChainInfo,
        toChainInfo,
        toChainID,
        fromChainID,
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
        return await this.zkTransfer();
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
    let gasLimit = await this.signer.estimateGas({
      from: account,
      to: selectMakerConfig.endpoint,
      value: tValue?.tAmount,
    });
    if (Number(fromChainID) === 2 && gasLimit < 21000) {
      gasLimit = 21000n;
    }
    if (isETH) {
      const tx: T = await this.signer.sendTransaction({
        from: account,
        to: selectMakerConfig.endpoint,
        value: tValue?.tAmount,
        gasLimit,
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
        gasLimit =
          String(fromChainID) === "42161" && gasLimit < 21000
            ? 21000
            : await transferContract.transfer.estimateGas(
                selectMakerConfig.endpoint,
                tValue?.tAmount
              );
        return (await transferContract.transfer(
          selectMakerConfig.endpoint,
          tValue?.tAmount,
          {
            gasLimit,
          }
        )) as T;
      } catch (error) {
        return throwNewError("evm transfer error", error);
      }
    }
  }
  private async zkTransfer<T>(): Promise<T> {
    const { selectMakerConfig, fromChainID, tValue } = this.crossConfig;
    const tokenAddress = selectMakerConfig.srcToken;
    const syncProvider = await getZkSyncProvider(fromChainID);
    // @ts-ignore
    const syncWallet = await Wallet.fromEthSigner(this.signer, syncProvider);
    if (!syncWallet.signer)
      return throwNewError("zksync get sync wallet signer error.");
    const amount = utils.closestPackableTransactionAmount(
      tValue.tAmount.toString()
    );
    const transferFee = await syncProvider.getTransactionFee(
      "Transfer",
      syncWallet.address() || "",
      tokenAddress
    );
    if (!(await syncWallet.isSigningKeySet())) {
      const nonce = await syncWallet.getNonce("committed");
      const batchBuilder = syncWallet.batchBuilder(nonce);
      if (syncWallet.ethSignerType?.verificationMethod === "ERC-1271") {
        const isOnchainAuthSigningKeySet =
          await syncWallet.isOnchainAuthSigningKeySet();
        if (!isOnchainAuthSigningKeySet) {
          const onchainAuthTransaction =
            await syncWallet.onchainAuthSigningKey();
          await onchainAuthTransaction?.wait();
        }
      }
      const newPubKeyHash = (await syncWallet.signer.pubKeyHash()) || "";
      const accountID = await syncWallet.getAccountId();
      if (typeof accountID !== "number") {
        return throwNewError(
          "It is required to have a history of balances on the account to activate it."
        );
      }
      const changePubKeyMessage = utils.getChangePubkeyLegacyMessage(
        newPubKeyHash,
        nonce,
        accountID
      );
      const ethSignature = (
        await syncWallet.getEthMessageSignature(changePubKeyMessage)
      ).signature;
      const keyFee = await syncProvider.getTransactionFee(
        {
          ChangePubKey: { onchainPubkeyAuth: false },
        },
        syncWallet.address() || "",
        tokenAddress
      );

      const changePubKeyTx = await syncWallet.signer.signSyncChangePubKey({
        accountId: accountID,
        account: syncWallet.address(),
        newPkHash: newPubKeyHash,
        nonce,
        ethSignature,
        validFrom: 0,
        validUntil: utils.MAX_TIMESTAMP,
        fee: keyFee.totalFee,
        feeTokenId: syncWallet.provider.tokenSet.resolveTokenId(tokenAddress),
      });
      batchBuilder.addChangePubKey({
        tx: changePubKeyTx,
        // @ts-ignore
        alreadySigned: true,
      });
      batchBuilder.addTransfer({
        to: selectMakerConfig.endpoint,
        token: tokenAddress,
        amount,
        fee: transferFee.totalFee,
      });
      const batchTransactionData = await batchBuilder.build();
      const transactions: Transaction[] = await submitSignedTransactionsBatch(
        syncWallet.provider,
        batchTransactionData.txs,
        [batchTransactionData.signature]
      );
      let transaction;
      for (const tx of transactions) {
        if (tx.txData.tx.type !== "ChangePubKey") {
          transaction = tx;
          break;
        }
      }
      return transaction as T;
    } else {
      try {
        return (await syncWallet.syncTransfer({
          to: selectMakerConfig.endpoint,
          token: tokenAddress,
          amount,
        })) as T;
      } catch (error) {
        return throwNewError("sync wallet syncTransfer was wrong", error);
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
