import { AxiosResponse } from "axios";
import { HexString } from "ethers-6/lib.commonjs/utils/data";
import {
  QueryRatesData,
  Rates,
  ITransactionInfo,
  ISearchTxResponse,
  TChainsResult,
  IChainItem,
  TTokensResult,
  ITokenItem,
  TRouterResult,
  ICrossRule,
} from "../types/common.types";
import Axios from "../request";
import { equalsIgnoreCase, throwNewError } from "../utils";
import { getGlobalState } from "../globalState";

const QUERY_API_MENU = {
  openApi: {
    mainnet:
      "https://openapi.orbiter.finance/explore/v3/yj6toqvwh1177e1sexfy0u1pxx5j8o47",
    testnet:
      "https://openapi2.orbiter.finance/v3/yj6toqvwh1177e1sexfy0u1pxx5j8o47",
  },
  openApiSdk: {
    mainnet: "https://api.orbiter.finance/sdk",
    testnet: "https://openapi2.orbiter.finance/sdk",
  },
};

const getCurrentQueryUrl = (type: "openApi" | "openApiSdk"): string => {
  const globalState = getGlobalState();
  const currentQueryApi =
    type === "openApi" ? QUERY_API_MENU.openApi : QUERY_API_MENU.openApiSdk;
  return globalState.isMainnet
    ? currentQueryApi.mainnet
    : currentQueryApi.testnet;
};

const COIN_BASE_API_URL = "https://api.coinbase.com";

export async function queryRatesByCurrency(
  currency: string
): Promise<Rates | undefined> {
  try {
    const resp: QueryRatesData = await Axios.get(
      `${COIN_BASE_API_URL}/v2/exchange-rates?currency=${currency}`
    );
    const data = resp.data;
    if (!data || equalsIgnoreCase(data.currency, currency) || !data.rates) {
      return throwNewError("can`t search rates, please retry.");
    }
    return data.rates;
  } catch (error: any) {
    throwNewError(error.message);
  }
}

export async function queryTransactionByAddress(
  account: string,
  pageNum: number,
  pageSize: number
) {
  try {
    const res: AxiosResponse<{
      result: {
        list: ITransactionInfo[];
        count: number;
      };
    }> = await Axios.post(getCurrentQueryUrl("openApi"), {
      id: 1,
      jsonrpc: "2.0",
      method: "orbiter_getTransactionByAddress",
      params: [account, pageNum, pageSize],
    });
    const result = res?.data?.result;
    console.log(result);
    if (result && Object.keys(result).length > 0) {
      return {
        transactions: result.list ?? [],
        count: result.count ?? 0,
      };
    } else {
      return throwNewError("queryTransactionByAddress error.");
    }
  } catch (error: any) {
    return throwNewError(error.message);
  }
}

export async function queryTransactionByHash(
  hash: string
): Promise<ISearchTxResponse> {
  try {
    const res: AxiosResponse<{
      result: ISearchTxResponse;
    }> = await Axios.get(
      `${getCurrentQueryUrl("openApiSdk")}/transaction/cross-chain/${hash}`
    );
    const result = res?.data?.result;
    if (result && Object.keys(result).length > 0) {
      return result;
    } else {
      return {} as ISearchTxResponse;
    }
  } catch (error: any) {
    return throwNewError(error.message);
  }
}

export async function queryRates(currency: string) {
  return await Axios.get(
    `https://api.coinbase.com/v2/exchange-rates?currency=${currency}`
  );
}

export async function queryChains(): Promise<IChainItem[]> {
  try {
    const queryChainsResult: AxiosResponse<TChainsResult> = await Axios.get(
      `${getCurrentQueryUrl("openApiSdk")}/chains`
    );
    if (
      queryChainsResult.status === 200 &&
      queryChainsResult.data?.status === "success"
    ) {
      return queryChainsResult.data?.result ?? [];
    } else {
      return [] as IChainItem[];
    }
  } catch (error: any) {
    return throwNewError("queryChains error.", error.message);
  }
}

export async function queryTokens(): Promise<{ [k: string]: ITokenItem[] }> {
  try {
    const queryTokensResult: AxiosResponse<TTokensResult> = await Axios.get(
      `${getCurrentQueryUrl("openApiSdk")}/tokens`
    );
    if (
      queryTokensResult.status === 200 &&
      queryTokensResult.data?.status === "success"
    ) {
      return (
        queryTokensResult.data?.result ?? ({} as { [k: string]: ITokenItem[] })
      );
    } else {
      return {} as { [k: string]: ITokenItem[] };
    }
  } catch (error: any) {
    return throwNewError("queryChains error.", error.message);
  }
}

export async function queryRouter(
  dealerId?: string | HexString
): Promise<ICrossRule[]> {
  try {
    const queryTokensResult: AxiosResponse<TRouterResult> = await Axios.get(
      `${getCurrentQueryUrl("openApiSdk")}/routers${
        dealerId ? `/${dealerId}` : ""
      }`
    );
    if (
      queryTokensResult.status === 200 &&
      queryTokensResult.data?.status === "success"
    ) {
      return queryTokensResult.data?.result ?? ([] as ICrossRule[]);
    } else {
      return [] as ICrossRule[];
    }
  } catch (error: any) {
    return throwNewError("queryChains error.", error.message);
  }
}
