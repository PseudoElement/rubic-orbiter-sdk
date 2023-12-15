import Web3 from "web3";
import { Coin_ABI, ORBITER_ROUTER_V3_ABI } from "../constant/common";
import RLP from "rlp";
import { Signer, Contract, ContractTransactionResponse } from "ethers-6";
import {
  throwNewError,
  getContractAddressByType,
  approveAndAllowanceCheck,
} from "../utils";
import { getExpectValue } from "../orbiter/utils";
import { IChainInfo, ICrossRule, IToken } from "../types";
import { CONTRACT_TYPE_ROUTER_V3 } from "../constant/common";

// 0x01: cross address
// 0x02: cross address and cross currency
export const OrbiterRouterType = {
  CrossAddress: "0x01",
  CrossAddressCurrency: "0x02",
};

export async function orbiterRouterTransfer(params: {
  signer: Signer;
  type: string;
  fromChainInfo: IChainInfo;
  value: BigInt;
  toWalletAddress?: string;
  selectMakerConfig: ICrossRule;
  transferValue: string | number;
  isETH: boolean;
  fromTokenInfo: IToken;
  toTokenInfo: IToken;
  tradeFee: string;
}): Promise<ContractTransactionResponse> {
  const {
    type,
    toWalletAddress,
    value,
    selectMakerConfig,
    fromChainInfo,
    transferValue,
    signer,
    isETH,
    fromTokenInfo,
    toTokenInfo,
    tradeFee,
  } = params;

  const fromAddress = await signer.getAddress();
  const fromChainID = String(fromChainInfo.chainId);
  const makerAddress = selectMakerConfig.endpoint;
  const t1Address = selectMakerConfig.srcToken;
  const toChainId = selectMakerConfig.tgtChain;
  const t2Address = selectMakerConfig.tgtToken;
  const slippage = "200";

  if (!slippage) return throwNewError("xvm transfer slippage is empty.");
  if (!toWalletAddress)
    return throwNewError("xvm transfer toWalletAddress is empty.");

  const expectValue = await getExpectValue(
    transferValue,
    fromTokenInfo,
    toTokenInfo,
    tradeFee
  );
  const web3 = new Web3();
  let sourceData: string[] = [];

  switch (type) {
    case OrbiterRouterType.CrossAddress: {
      sourceData = [type, toChainId, toWalletAddress];
      break;
    }
    case OrbiterRouterType.CrossAddressCurrency: {
      sourceData =
        fromAddress.toLowerCase() === toWalletAddress?.toLowerCase()
          ? [
              type,
              toChainId,
              t2Address,
              web3.utils.toHex(expectValue),
              slippage,
            ]
          : [
              type,
              toChainId,
              t2Address,
              web3.utils.toHex(expectValue),
              slippage,
              toWalletAddress,
            ];
      break;
    }
  }
  const data = RLP.encode(sourceData);
  return await orbiterRouterSend(
    signer,
    fromChainID,
    fromAddress,
    makerAddress,
    fromChainInfo,
    t1Address,
    data,
    value,
    isETH
  );
}

async function orbiterRouterSend(
  signer: Signer,
  chainId: string,
  fromAddress: string,
  toAddress: string,
  fromChainInfo: IChainInfo,
  tokenAddress: string,
  data: Buffer,
  value: BigInt,
  isETH: boolean
): Promise<ContractTransactionResponse> {
  const contractAddress =
    fromChainInfo.contract &&
    getContractAddressByType(fromChainInfo.contract, CONTRACT_TYPE_ROUTER_V3);
  if (!contractAddress) {
    return throwNewError(
      `Network ${chainId} does not support contract sending`
    );
  }
  const contractInstance = new Contract(
    contractAddress,
    ORBITER_ROUTER_V3_ABI,
    signer
  );
  if (isETH) {
    return contractInstance.transfer(toAddress, data, {
      from: fromAddress,
      value,
    }) as Promise<ContractTransactionResponse>;
  } else {
    const tokenContractInstance = new Contract(tokenAddress, Coin_ABI, signer);
    const account = await signer.getAddress();

    await approveAndAllowanceCheck({
      contractInstance: tokenContractInstance,
      targetValue: value,
      account,
      contractAddress: tokenAddress,
    });

    const gasLimit = await contractInstance.transferToken.estimateGas(
      tokenAddress,
      toAddress,
      value,
      data
    );

    return (await contractInstance.transferToken(
      tokenAddress,
      toAddress,
      value,
      data,
      {
        from: fromAddress,
        gas: gasLimit,
      }
    )) as Promise<ContractTransactionResponse>;
  }
}
