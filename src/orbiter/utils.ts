import { isObject } from "lodash";
import BigNumber from "bignumber.js";
import {
  CHAIN_ID_MAINNET,
  CHAIN_ID_TESTNET,
  MAX_BITS,
  SIZE_OP,
} from "../constant/common";
import { IChainInfo, ICrossRule, IRates, IToken } from "../types";
import { equalsIgnoreCase, getActiveChainId, throwNewError } from "../utils";
import { queryRates } from "../services/ApiService";

export const isExecuteOrbiterRouterV3 = (data: {
  fromCurrency: string;
  toCurrency: string;
  selectMakerConfig: ICrossRule;
  fromChainID: string;
  fromChainInfo: IChainInfo;
  toChainID: string;
  crossAddressReceipt?: string;
}) => {
  const {
    fromCurrency,
    toCurrency,
    fromChainID,
    crossAddressReceipt,
    selectMakerConfig,
    fromChainInfo,
    toChainID,
  } = data;
  return !!(
    isSupportOrbiterRouterV3({
      fromChainID,
      selectMakerConfig,
      fromChainInfo,
      toChainID,
    }) &&
    (fromCurrency !== toCurrency || !!crossAddressReceipt)
  );
};

export const isSupportOrbiterRouterV3 = (data: {
  fromChainID: string;
  selectMakerConfig: ICrossRule;
  fromChainInfo: IChainInfo;
  toChainID: string;
}) => {
  const { fromChainID, fromChainInfo, toChainID } = data;
  if (isStarkNet(fromChainID, toChainID)) {
    return false;
  }
  return !!Object.values(fromChainInfo?.contract || {}).find(
    (item) => item === "OrbiterRouterV3"
  );
};

export const isStarkNet = (fromChainID: string, toChainID: string) => {
  return (
    fromChainID === CHAIN_ID_MAINNET.starknet ||
    fromChainID === CHAIN_ID_TESTNET.starknet_test ||
    toChainID === CHAIN_ID_MAINNET.starknet ||
    toChainID === CHAIN_ID_TESTNET.starknet_test
  );
};

export const getTransferValue = (transferInfo: {
  transferValue: number | string;
  decimals: number;
  selectMakerConfig: ICrossRule;
}) => {
  const { transferValue, decimals, selectMakerConfig } = transferInfo;
  const fromChainID = selectMakerConfig.srcChain;
  const rAmount = new BigNumber(transferValue)
    .plus(new BigNumber(selectMakerConfig.withholdingFee))
    .multipliedBy(new BigNumber(10 ** decimals));
  const rAmountValue = rAmount.toFixed();
  const p_text = selectMakerConfig.vc;
  return getTAmountFromRAmount(fromChainID, rAmountValue, p_text);
};

function getTAmountFromRAmount(
  chain: string | number,
  amount: string,
  pText: string
) {
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
    let tAmount = BigInt(
      amount.toString().slice(0, validDigit - pText.length) +
        pText +
        amount.toString().slice(validDigit)
    );
    return {
      state: true,
      tAmount,
    };
  } else if (isLPChain(chain)) {
    return {
      state: true,
      tAmount: BigInt(amount),
    };
  } else {
    let tAmount = BigInt(
      amount.toString().slice(0, amountLength - pText.length) + pText
    );
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

export async function getExpectValue(
  transferValue: number | string,
  fromTokenInfo: IToken,
  toTokenInfo: IToken,
  tradeFee: string
) {
  const value = new BigNumber(transferValue);

  const gasFee = value.multipliedBy(new BigNumber(tradeFee));
  const gasFee_fix = gasFee.decimalPlaces(
    fromTokenInfo.decimals === 18 ? 5 : 2,
    BigNumber.ROUND_UP
  );

  const toAmount = value.minus(gasFee_fix);
  const expectValue = toAmount.multipliedBy(10 ** toTokenInfo.decimals);

  if (fromTokenInfo.symbol !== toTokenInfo.symbol) {
    return (
      await exchangeToCoin(
        expectValue,
        fromTokenInfo.symbol,
        toTokenInfo.symbol
      )
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
  const exchangeRates = rates ?? (await getRates(sourceCurrency));
  const fromRate = isObject(exchangeRates)
    ? exchangeRates[sourceCurrency]
    : exchangeRates;
  const toRate = isObject(exchangeRates)
    ? exchangeRates[toCurrency]
    : exchangeRates;
  if (!fromRate || !toRate) {
    return new BigNumber(0);
  }
  return value.dividedBy(fromRate).multipliedBy(toRate);
}

export async function getRates(currency: string) {
  try {
    const resp = await queryRates(currency);
    const data: { rates: IRates; currency: string } = resp?.data?.data;
    if (!data || !equalsIgnoreCase(data.currency, currency) || !data.rates) {
      return {} as IRates;
    }
    return data.rates;
  } catch (error: any) {
    return throwNewError(error);
  }
}

export async function isFromChainIdMatchProvider(fromChainInfo: IChainInfo) {
  const currentChainId = fromChainInfo.chainId;
  const currentNetworkId = fromChainInfo.networkId;
  const targetId = (await getActiveChainId()).toString();
  if (targetId !== currentNetworkId && targetId !== currentChainId) {
    return throwNewError("current signer is not match with the source chain.");
  }
}
