import {
  CHAIN_ID_MAINNET,
  CHAIN_ID_TESTNET,
  CHAIN_INDEX,
  MAX_BITS,
  SIZE_OP,
} from "../constant/common";
import { IChainInfo, ICrossRule } from "../types";
import BigNumber from "bignumber.js";
import { equalsIgnoreCase, throwNewError } from "../utils";
import Axios from "axios";
import * as zksync from "zksync";
import { queryRatesByCurrency } from "../services/ApiService";

export const isExecuteXVMContract = (sendInfo: {
  fromChainID: number | string;
  fromChainInfo: IChainInfo;
  toChainID: number | string;
  fromCurrency: string;
  toCurrency: string;
  crossAddressReceipt?: string;
}) => {
  const {
    fromChainID,
    fromChainInfo,
    toChainID,
    fromCurrency,
    toCurrency,
    crossAddressReceipt,
  } = sendInfo;
  if (
    fromChainID === 4 ||
    fromChainID === 44 ||
    toChainID === 4 ||
    toChainID === 44
  ) {
    return false;
  }
  return (
    fromChainInfo?.xvmList?.length &&
    (fromCurrency !== toCurrency || !!crossAddressReceipt)
  );
};

const safeCode = (codeParams: {
  toChain: ICrossRule["toChain"];
  dealerId?: ICrossRule["dealerId"];
  ebcId?: ICrossRule["ebcId"];
  toChainInfo: IChainInfo;
}) => {
  const { toChain, dealerId, ebcId, toChainInfo } = codeParams;
  const internalId =
    String(toChain?.id).length < 2 ? "0" + toChain.id : toChain.id;
  const currentDealerId =
    String(dealerId || 0).length < 2 ? "0" + dealerId : dealerId;
  return ebcId
    ? currentDealerId + ebcId + internalId
    : 9000 + Number(toChainInfo.internalId) + "";
};

export const getTransferValue = (transferInfo: {
  toChainID: string;
  fromChainID: string | number;
  fromChainInfo: IChainInfo;
  toChainInfo: IChainInfo;
  transferValue: number;
  tradingFee: string;
  decimals: number;
  selectMakerConfig: ICrossRule;
}) => {
  const {
    fromChainID,
    transferValue,
    tradingFee,
    fromChainInfo,
    toChainInfo,
    decimals,
    selectMakerConfig,
  } = transferInfo;
  const rAmount = new BigNumber(transferValue)
    .plus(new BigNumber(tradingFee))
    .multipliedBy(new BigNumber(10 ** decimals));
  const rAmountValue = rAmount.toFixed();
  const p_text = safeCode({
    toChain: selectMakerConfig.toChain,
    dealerId: selectMakerConfig?.dealerId,
    ebcId: selectMakerConfig?.ebcId,
    toChainInfo,
  });
  return getTAmountFromRAmount(
    fromChainID,
    rAmountValue,
    p_text,
    fromChainInfo
  );
};

function getTAmountFromRAmount(
  chain: string | number,
  amount: string,
  pText: string,
  fromChainInfo: IChainInfo
) {
  if (!fromChainInfo) {
    throw new Error("The chain did not support");
  }
  if (BigInt(amount) < 1) {
    throw new Error(`the token doesn't support that many decimal digits`);
  }
  if (pText.length > SIZE_OP.P_NUMBER) {
    throw new Error("the pText size invalid");
  }

  let validDigit = AmountValidDigits(chain, amount); // 10 11
  var amountLength = amount.toString().length;
  if (amountLength < SIZE_OP.P_NUMBER) {
    throw new Error("Amount size must be greater than pNumberSize");
  }
  if (isLimitNumber(chain) && amountLength > validDigit) {
    let tAmount =
      amount.toString().slice(0, validDigit - pText.length) +
      pText +
      amount.toString().slice(validDigit);
    return {
      state: true,
      tAmount,
    };
  } else if (isLPChain(chain)) {
    return {
      state: true,
      tAmount: amount,
    };
  } else {
    let tAmount =
      amount.toString().slice(0, amountLength - pText.length) + pText;
    return {
      state: true,
      tAmount,
    };
  }
}
function isLPChain(chain: string | number) {
  if (
    chain === CHAIN_ID_MAINNET.loopring ||
    chain === CHAIN_ID_TESTNET.loopring_test ||
    chain === "loopring"
  ) {
    return true;
  }
}

function isLimitNumber(chain: string | number) {
  if (
    chain === CHAIN_ID_MAINNET.zksync ||
    chain === CHAIN_ID_TESTNET.zksync_test ||
    chain === "zksync"
  ) {
    return true;
  }
  if (
    chain === CHAIN_ID_MAINNET.imx ||
    chain === CHAIN_ID_TESTNET.imx_test ||
    chain === "immutablex"
  ) {
    return true;
  }
  if (
    chain === CHAIN_ID_MAINNET.dydx ||
    chain === CHAIN_ID_TESTNET.dydx_test ||
    chain === "dydx"
  ) {
    return true;
  }
  if (
    chain === CHAIN_ID_MAINNET.zkspace ||
    chain === CHAIN_ID_TESTNET.zkspace_test ||
    chain === "zkspace"
  ) {
    return true;
  }
  return false;
}

function AmountValidDigits(chain: string | number, amount: string) {
  let amountMaxDigits = AmountMaxDigits(chain);
  let amountRegion = AmountRegion(chain);

  let ramount = removeSidesZero(amount.toString());

  if (ramount.length > amountMaxDigits) {
    throw new Error("amount is inValid");
  }
  if (ramount > amountRegion.max.toFixed()) {
    return amountMaxDigits - 1;
  } else {
    return amountMaxDigits;
  }
}

function AmountMaxDigits(chain: string | number) {
  let amountRegion = AmountRegion(chain);
  return amountRegion.max.toFixed().length;
}

// 0 ~ (2 ** N - 1)
function AmountRegion(chain: string | number) {
  if (typeof chain === "number") {
    let max = BigNumber(
      2 ** (MAX_BITS[chain as keyof typeof MAX_BITS] || 256) - 1
    );
    return {
      min: BigNumber(0),
      max,
    };
  }
  let max = BigNumber(
    2 ** (MAX_BITS[chain as keyof typeof MAX_BITS] || 256) - 1
  );
  return {
    min: BigNumber(0),
    max,
  };
}
function removeSidesZero(param: string) {
  if (typeof param !== "string") {
    return "param must be string";
  }
  return param.replace(/^0+(\d)|(\d)0+$/gm, "$1$2");
}

/**
 * @param {string} tokenAddress when tokenAddress=/^0x0+$/i,
 * @returns {boolean}
 */
export const isEthTokenAddress = (
  tokenAddress: string,
  fromChainInfo: IChainInfo
): boolean => {
  if (fromChainInfo) {
    const isMainCoin = equalsIgnoreCase(
      fromChainInfo.nativeCurrency.address,
      tokenAddress
    );
    if (isMainCoin) return true;
    const isERC20 = fromChainInfo.tokens.find((item) =>
      equalsIgnoreCase(item.address, tokenAddress)
    );
    if (isERC20) return false;
  }
  return /^0x0+$/i.test(tokenAddress);
};
export async function getExpectValue(
  selectMakerConfig: ICrossRule,
  transferValue: number | string,
  fromCurrency: string,
  toCurrency: string
) {
  const value = new BigNumber(transferValue);

  const gasFee = value
    .multipliedBy(new BigNumber(selectMakerConfig.gasFee))
    .dividedBy(new BigNumber(1000));
  const gasFee_fix = gasFee.decimalPlaces(
    selectMakerConfig.fromChain.decimals === 18 ? 5 : 2,
    BigNumber.ROUND_UP
  );

  const toAmount = value.minus(gasFee_fix);
  const expectValue = toAmount.multipliedBy(
    10 ** selectMakerConfig.toChain.decimals
  );

  if (fromCurrency !== toCurrency) {
    return (
      await exchangeToCoin(expectValue, fromCurrency, toCurrency)
    ).toFixed(0);
  } else {
    return expectValue.toFixed(0);
  }
}

export async function exchangeToCoin(
  value: any,
  sourceCurrency = "ETH",
  toCurrency: string,
  rates?: string
) {
  if (!(value instanceof BigNumber)) {
    value = new BigNumber(value);
  }
  const exchangeRates = rates || (await getRates(sourceCurrency));
  const fromRate = exchangeRates[sourceCurrency];
  const toRate = exchangeRates[toCurrency];
  if (!fromRate || !toRate) {
    return new BigNumber(0);
  }
  return value.dividedBy(fromRate).multipliedBy(toRate);
}

export async function getRates(currency: string) {
  try {
    const resp = await Axios.get(
      `https://api.coinbase.com/v2/exchange-rates?currency=${currency}`
    );
    console.log(resp);
    const data = resp.data?.data;
    if (!data || !equalsIgnoreCase(data.currency, currency) || !data.rates) {
      return undefined;
    }
    return data.rates;
  } catch (error: any) {
    console.log(error);
    throwNewError(error);
  }
}

export async function getZkSyncProvider(chainId: string) {
  switch (chainId) {
    case CHAIN_ID_TESTNET.zksync_test:
      return await zksync.Provider.newHttpProvider(
        "https://goerli-api.zksync.io/jsrpc"
      );
    case CHAIN_ID_MAINNET.zksync:
      return await zksync.getDefaultProvider("mainnet");
    default:
      throw new Error(`chainId ${chainId} not supported yet!`);
  }
}
