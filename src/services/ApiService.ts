import { AxiosResponse } from "axios";
import Axios from "../request";
import {
  QueryRatesData,
  Rates,
  IChainInfo,
  ICrossRule,
  ITransactionInfo,
  ITxList,
} from "../types/common.types";
import { equalsIgnoreCase, throwNewError } from "../utils";

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

export async function queryTradingPairs(): Promise<{
  ruleList: ICrossRule[];
  chainList: IChainInfo[];
}> {
  try {
    const res: AxiosResponse<{
      result: {
        chainList: IChainInfo[];
        ruleList: ICrossRule[];
      };
    }> = await Axios.post(
      "https://openapi2.orbiter.finance/v3/yj6toqvwh1177e1sexfy0u1pxx5j8o47",
      {
        id: 1,
        jsonrpc: "2.0",
        method: "orbiter_getTradingPairs",
        params: [],
      }
    );
    const result = res?.data?.result;
    if (result && Object.keys(result).length > 0) {
      return {
        ruleList: result?.ruleList ?? [],
        chainList: result?.chainList ?? [],
      };
    } else {
      return throwNewError("queryTradingPairs error.");
    }
  } catch (error: any) {
    return throwNewError(error.message);
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
  params: string[],
  isV3 = true
): Promise<{
  status: number;
  txList: ITxList[];
}> {
  try {
    const res: AxiosResponse<{
      result: {
        status: number;
        txList: ITxList[];
      };
    }> = await Axios.post(
      `https://openapi2.orbiter.finance/${
        isV3 ? "v3" : "v2"
      }/yj6toqvwh1177e1sexfy0u1pxx5j8o47`,
      {
        id: 1,
        jsonrpc: "2.0",
        method: "orbiter_getTransactionByHash",
        params,
      }
    );
    const result = res?.data?.result;
    if (result && Object.keys(result).length > 0) {
      return {
        status: result.status ?? -1,
        txList: result.txList ?? [],
      };
    } else {
      return throwNewError("queryTransactionByAddress error.");
    }
  } catch (error: any) {
    return throwNewError(error.message);
  }
}

export async function collectUserTransaction(
  params: Array<string | number | null>,
  isV3 = true
): Promise<void> {
  try {
    await Axios.post(
      `https://openapi2.orbiter.finance/${
        isV3 ? "v3" : "v2"
      }/yj6toqvwh1177e1sexfy0u1pxx5j8o47`,
      {
        id: 1,
        jsonrpc: "2.0",
        method: "orbiter_collectUserTransaction",
        params,
      }
    );
  } catch (error: any) {
    return throwNewError(error.message);
  }
}
