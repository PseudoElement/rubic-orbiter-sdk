import { AxiosResponse } from "axios";
import Axios from "../request";
import {
  QueryRatesData,
  Rates,
  ITransactionInfo,
  ISearchTxResponse,
} from "../types/common.types";
import { equalsIgnoreCase, throwNewError } from "../utils";
import { HexString } from "ethers-6/lib.commonjs/utils/data";

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
      return undefined;
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
    }> = await Axios.post(
      "https://openapi2.orbiter.finance/v3/yj6toqvwh1177e1sexfy0u1pxx5j8o47",
      {
        id: 1,
        jsonrpc: "2.0",
        method: "orbiter_getTransactionByAddress",
        params: [account, pageNum, pageSize],
      }
    );
    const result = res?.data?.result;
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
      `https://openapi2.orbiter.finance/sdk/transaction/cross-chain/${hash}`
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

export async function queryChains(): Promise<any> {
  try {
    const queryChainsResult = await Axios.get(
      "https://openapi2.orbiter.finance/sdk/chains"
    );
    if (
      queryChainsResult.status === 200 &&
      queryChainsResult.data?.status === "success"
    ) {
      return queryChainsResult.data?.result ?? [];
    } else {
      return [];
    }
  } catch (error: any) {
    throwNewError("queryChains error.", error.message);
  }
}

export async function queryTokens(): Promise<any> {
  try {
    const queryTokensResult = await Axios.get(
      "https://openapi2.orbiter.finance/sdk/tokens"
    );
    if (
      queryTokensResult.status === 200 &&
      queryTokensResult.data?.status === "success"
    ) {
      return queryTokensResult.data?.result ?? {};
    } else {
      return {};
    }
  } catch (error: any) {
    throwNewError("queryChains error.", error.message);
  }
}

export async function queryRouters(
  dealerId?: string | HexString
): Promise<any> {
  try {
    const queryTokensResult = await Axios.get(
      `https://openapi2.orbiter.finance/sdk/routers${
        dealerId ? "/dealerId" : ""
      }`
    );
    if (
      queryTokensResult.status === 200 &&
      queryTokensResult.data?.status === "success"
    ) {
      return queryTokensResult.data?.result ?? [];
    } else {
      return [];
    }
  } catch (error: any) {
    throwNewError("queryChains error.", error.message);
  }
}
