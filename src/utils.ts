import {
  AbiCoder,
  AbstractProvider,
  AddressLike,
  BigNumberish,
  PerformActionRequest,
  Provider,
  Signer,
  ethers,
} from "ethers-6";
import { Coin_ABI } from "./constant/common";
import { IChainInfo, ICrossRule } from "./types";
import BigNumber from "bignumber.js";
import { queryRatesByCurrency } from "./services/ApiService";

export function equalsIgnoreCase(value1: string, value2: string): boolean {
  if (typeof value1 !== "string" || typeof value2 !== "string") {
    return false;
  }
  return value1.toUpperCase() === value2.toUpperCase();
}
export async function getRpcList(chainInfo: IChainInfo) {
  const rpcList = (chainInfo?.rpc || []).sort(function () {
    return 0.5 - Math.random();
  });
  return rpcList;
}

export async function translatePerform(
  provider: AbstractProvider,
  req: PerformActionRequest
): Promise<any> {
  switch (req.method) {
    case "broadcastTransaction":
      return await provider.broadcastTransaction(req.signedTransaction);
    case "call":
      return await provider.call(
        Object.assign({}, req.transaction, { blockTag: req.blockTag })
      );
    case "chainId":
      return (await provider.getNetwork()).chainId;
    case "estimateGas":
      return await provider.estimateGas(req.transaction);
    case "getBalance":
      return await provider.getBalance(req.address, req.blockTag);
    case "getBlock": {
      const block = "blockHash" in req ? req.blockHash : req.blockTag;
      return await provider.getBlock(block, req.includeTransactions);
    }
    case "getBlockNumber":
      return await provider.getBlockNumber();
    case "getCode":
      return await provider.getCode(req.address, req.blockTag);
    case "getGasPrice":
      return (await provider.getFeeData()).gasPrice;
    case "getLogs":
      return await provider.getLogs(req.filter);
    case "getStorage":
      return await provider.getStorage(req.address, req.position, req.blockTag);
    case "getTransaction":
      return await provider.getTransaction(req.hash);
    case "getTransactionCount":
      return await provider.getTransactionCount(req.address, req?.blockTag);
    case "getTransactionReceipt":
      return await provider.getTransactionReceipt(req.hash);
    case "getTransactionResult":
      return await provider.getTransactionResult(req.hash);
  }
}

export async function requestWeb3(
  chainInfo: IChainInfo,
  params: PerformActionRequest
): Promise<any> {
  const rpcList = await getRpcList(chainInfo);
  return new Promise(async (resolve, reject) => {
    let result;
    if (rpcList && rpcList.length > 0) {
      for (const url of rpcList) {
        if (!url || url === "") {
          continue;
        }
        try {
          const provider = new ethers.AbstractProvider(url);
          result = await translatePerform(provider, params);
          resolve(result);
          break;
        } catch (error) {
          throwNewError("request rpc error:", error);
        }
      }
    }
    if (!result) {
      reject(
        `Reuqest RPC ERROR：${chainInfo.chainId}-${
          params.method
        }-${JSON.stringify(params)}`
      );
    }
  });
}

export function getContract(
  contractAddress: string,
  localChainID?: number | string,
  ABI?: any[]
) {
  if (localChainID === 3 || localChainID === 33) {
    return;
  }
  if (localChainID === 4 || localChainID === 44) {
    return;
  }
  return new ethers.Contract(contractAddress, ABI ? ABI : Coin_ABI);
}

export function isEthTokenAddress(tokenAddress: string, chainInfo: IChainInfo) {
  if (chainInfo) {
    // main coin
    if (equalsIgnoreCase(chainInfo.nativeCurrency?.address, tokenAddress)) {
      return true;
    }
    // ERC20
    if (
      chainInfo.tokens.find((item) =>
        equalsIgnoreCase(item.address, tokenAddress)
      )
    ) {
      return false;
    }
  }
  return /^0x0+$/i.test(tokenAddress);
}

export async function getTransferGasLimit(
  signer: Signer,
  selectMakerConfig: ICrossRule,
  from: AddressLike,
  to: AddressLike,
  chainInfo: IChainInfo,
  value: number | string | BigNumberish
) {
  const tokenAddress = selectMakerConfig?.fromChain?.tokenAddress;
  let gasLimit = 55000n;
  try {
    if (isEthTokenAddress(tokenAddress, chainInfo)) {
      gasLimit = await signer.estimateGas({
        from,
        to: selectMakerConfig?.recipient,
        value,
      });
      return gasLimit;
    } else {
      const ecourseContractInstance = getContract(tokenAddress);
      if (!ecourseContractInstance) {
        return gasLimit;
      }

      gasLimit = await ecourseContractInstance.estimateGas({
        to,
        value,
        from,
      });
      return gasLimit;
    }
  } catch (err) {
    throwNewError("get transfer gasLimit error", err);
  }

  return gasLimit;
}

export function getRealTransferValue(
  selectMakerConfig: ICrossRule,
  transferValue: number | string
) {
  if (!Object.keys(selectMakerConfig).length) {
    throw new Error(
      "get real transfer value failed, selectMakerConfig can not be empty!"
    );
  }
  return new BigNumber(transferValue)
    .plus(new BigNumber(selectMakerConfig.tradingFee))
    .multipliedBy(new BigNumber(10 ** selectMakerConfig.fromChain.decimals))
    .toFixed();
}

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, ms);
  });
}

let exchangeRates: any = null;

async function cacheExchangeRates(currency = "USD") {
  exchangeRates = await queryRatesByCurrency(currency);
  if (exchangeRates) {
    const bnbExchangeRates = await queryRatesByCurrency("bnb");
    if (bnbExchangeRates && bnbExchangeRates.USD) {
      const usdTobnb = 1 / Number(bnbExchangeRates.USD);
      exchangeRates.BNB = String(usdTobnb);
    }
    return exchangeRates;
  } else {
    return undefined;
  }
}

export async function getExchangeToUsdRate(sourceCurrency = "ETH") {
  sourceCurrency = sourceCurrency.toUpperCase();

  const currency = "USD";

  let rate = -1;
  try {
    if (!exchangeRates) {
      exchangeRates = await cacheExchangeRates(currency);
    }
    if (exchangeRates?.[sourceCurrency]) {
      rate = exchangeRates[sourceCurrency];
    }
  } catch (error) {
    throwNewError("getExchangeToUsdRate error", error);
  }

  return new BigNumber(rate);
}

export async function exchangeToUsd(
  value: number | BigNumber = 1,
  sourceCurrency = "ETH"
) {
  if (!BigNumber.isBigNumber(value)) {
    value = new BigNumber(value);
  }

  const rate = await getExchangeToUsdRate(sourceCurrency);
  if (rate.comparedTo(0) !== 1) {
    if (sourceCurrency === "USDT" || sourceCurrency === "USDC") {
      return value;
    }
    return new BigNumber(0);
  }

  return value.dividedBy(rate);
}

export async function getTokenConvertUsd(currency: string) {
  try {
    return (await exchangeToUsd(1, currency)).toNumber();
  } catch (error: any) {
    throw new Error(`get token convert usd failed: ${error.message}`);
  }
}

export const throwNewError = (message: string, error?: any) => {
  const throwMessage = error
    ? `${message} => ${error?.message || error || ""}`
    : message;
  throw new Error(throwMessage);
};

export const getContractByType = (
  targetChainContracts: { [k: string]: string },
  value: string
) => {
  if (!Object.keys(targetChainContracts).length || !value)
    return throwNewError("get contract by type error.");
  let targetContract = "";
  for (const key in targetChainContracts) {
    const element = targetChainContracts[key];
    if (element === value) {
      targetContract = key;
      break;
    }
  }
  return targetContract;
};
