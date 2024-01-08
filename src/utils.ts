import BigNumber from "bignumber.js";
import { Signer, Contract, ethers } from "ethers-6";
import { Coin_ABI } from "./constant/common";
import {
  IChainInfo,
  ICrossRule,
  IToken,
  SIGNER_TYPES,
  STARKNET_CHAIN_ID,
} from "./types";
import { queryRatesByCurrency } from "./services/ApiService";
import { getGlobalState, setGlobalState } from "./globalState";
import { CHAIN_ID_MAINNET } from "./constant/common";
import { CHAIN_ID_TESTNET } from "./constant/common";

export const approveAndAllowanceCheck = async (params: {
  contractInstance: Contract;
  account: string;
  contractAddress: string;
  targetValue: BigInt;
}): Promise<void> => {
  const { contractInstance, account, contractAddress, targetValue } = params;
  const allowance: BigInt = await contractInstance.allowance(
    account,
    contractAddress
  );
  if (targetValue > allowance) {
    await contractInstance.approve(contractAddress, targetValue);
    for (let index = 0; index < 5000; index++) {
      const newAllowance: BigInt = await contractInstance.allowance(
        account,
        contractAddress
      );
      if (allowance !== newAllowance) {
        if (targetValue > newAllowance) {
          throwNewError(`Approval amount is insufficient`);
        }
        break;
      }
      await sleep(2000);
    }
  }
};

export function equalsIgnoreCase(value1: string, value2: string): boolean {
  if (typeof value1 !== "string" || typeof value2 !== "string") {
    return false;
  }
  return value1.toUpperCase() === value2.toUpperCase();
}

export function getContract(params: {
  contractAddress: string;
  localChainID?: number | string;
  ABI?: any[];
  signer?: Signer;
}) {
  const { localChainID, ABI, signer, contractAddress } = params;
  if (localChainID === 3 || localChainID === 33) {
    return;
  }
  if (localChainID === 4 || localChainID === 44) {
    return;
  }
  return new ethers.Contract(contractAddress, ABI ? ABI : Coin_ABI, signer);
}

export function isEthTokenAddress(
  tokenAddress: string,
  chainInfo: IChainInfo,
  tokens: IToken[]
) {
  if (chainInfo) {
    // main coin
    if (equalsIgnoreCase(chainInfo.nativeCurrency?.address, tokenAddress)) {
      return true;
    }
    // ERC20
    if (tokens.find((item) => equalsIgnoreCase(item.address, tokenAddress))) {
      return false;
    }
  }
  return /^0x0+$/i.test(tokenAddress);
}

export function getRealTransferValue(
  selectMakerConfig: ICrossRule,
  transferValue: number | string,
  fromTokenDecimals: number
): BigInt {
  if (!Object.keys(selectMakerConfig).length) {
    throw new Error(
      "get real transfer value failed, selectMakerConfig can not be empty!"
    );
  }
  return BigInt(
    new BigNumber(transferValue)
      .plus(new BigNumber(selectMakerConfig.withholdingFee))
      .multipliedBy(new BigNumber(10 ** fromTokenDecimals))
      .toFixed()
  );
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

export const getContractAddressByType = (
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

export const formatDate = (date: Date | string, isShort?: boolean): string => {
  date = new Date(date);
  const year = date.getFullYear();
  const mon =
    date.getMonth() + 1 < 10
      ? "0" + (date.getMonth() + 1)
      : date.getMonth() + 1;
  const data = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
  const hour = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
  const min =
    date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
  const seon =
    date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();

  if (isShort) return mon + "-" + data + " " + hour + ":" + min;
  const toYear = new Date().getFullYear();
  if (toYear === year) {
    return mon + "-" + data + " " + hour + ":" + min + ":" + seon;
  } else {
    return year + "-" + mon + "-" + data + " " + hour + ":" + min;
  }
};

export const getActiveSigner = <T>(): T => {
  const { activeSignerType, evmSigner, loopringSigner, starknetSigner } =
    getGlobalState();
  switch (activeSignerType) {
    case "EVM":
      if (!Object.keys(evmSigner).length)
        return throwNewError("Evm signer is empty by getActiveSigner.");
      return evmSigner as T;

    case "Loopring":
      if (!Object.keys(loopringSigner).length)
        return throwNewError("Loopring signer is empty.");
      return loopringSigner as T;

    case "Starknet":
      if (!Object.keys(starknetSigner).length)
        return throwNewError("Starknet signer is empty.");
      return starknetSigner as T;

    default:
      return throwNewError("Can not find signer, please check it!");
  }
};

export const getActiveAccount = async () => {
  const { activeSignerType, evmSigner, loopringSigner, starknetSigner } =
    getGlobalState();
  switch (activeSignerType) {
    case "EVM":
      if (!Object.keys(evmSigner).length)
        return throwNewError("Evm signer is empty by getActiveAccount.");
      return await evmSigner.getAddress();

    case "Loopring":
      if (!Object.keys(loopringSigner).length)
        return throwNewError("Loopring signer is empty.");
      const accounts = await loopringSigner.eth.getAccounts();
      if (!accounts.length)
        return throwNewError("Loopring`s accounts is empty.");
      return accounts[0];

    case "Starknet":
      if (!Object.keys(starknetSigner).length)
        return throwNewError("Starknet signer is empty.");
      return starknetSigner.address;

    default:
      return throwNewError("Can not find signer, please check it!");
  }
};

export const getActiveChainId = async () => {
  const { activeSignerType, evmSigner, loopringSigner, isMainnet } =
    getGlobalState();
  switch (activeSignerType) {
    case "EVM":
      if (!Object.keys(evmSigner).length)
        return throwNewError("Evm signer is empty by getActiveChainId.");
      const currentNetwork = await evmSigner.provider?.getNetwork();
      return currentNetwork?.chainId || 0n;

    case "Loopring":
      if (!Object.keys(loopringSigner).length)
        return throwNewError("Loopring signer is empty.");
      return BigInt(await loopringSigner.eth.net.getId());

    case "Starknet":
      return isMainnet
        ? STARKNET_CHAIN_ID.mainnetId
        : STARKNET_CHAIN_ID.testnetId;

    default:
      return throwNewError("Can not find signer, please check it!");
  }
};

export const changeActiveSignerType = (fromChainID: string | number) => {
  const currentFromChainID = String(fromChainID);
  const { activeSignerType } = getGlobalState();
  switch (currentFromChainID) {
    case CHAIN_ID_MAINNET.loopring:
    case CHAIN_ID_TESTNET.loopring_test:
      activeSignerType !== SIGNER_TYPES.Loopring &&
        setGlobalState({
          activeSignerType: SIGNER_TYPES.Loopring,
        });
      break;
    case CHAIN_ID_MAINNET.starknet:
    case CHAIN_ID_TESTNET.starknet_test:
      activeSignerType !== SIGNER_TYPES.Starknet &&
        setGlobalState({
          activeSignerType: SIGNER_TYPES.Starknet,
        });
      break;

    default:
      activeSignerType !== SIGNER_TYPES.EVM &&
        setGlobalState({
          activeSignerType: SIGNER_TYPES.EVM,
        });
      break;
  }
};

export const isLoopring = (chainId: string | number) => {
  const currentChainId = String(chainId);
  return (
    currentChainId === CHAIN_ID_MAINNET.loopring ||
    currentChainId === CHAIN_ID_TESTNET.loopring_test
  );
};
export const isStarknet = (chainId: string | number) => {
  const currentChainId = String(chainId);
  return (
    currentChainId === CHAIN_ID_MAINNET.starknet ||
    currentChainId === CHAIN_ID_TESTNET.starknet_test
  );
};
