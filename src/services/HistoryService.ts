import {
  queryTransactionByAddress,
  queryTransactionByHash,
} from "./ApiService";
import { ISearchTxResponse, ITransactionInfo } from "../types";
import { throwNewError } from "../utils";

export default class HistoryService {
  private static instance: HistoryService;

  public static getInstance(): HistoryService {
    if (!this.instance) {
      this.instance = new HistoryService();
    }

    return this.instance;
  }
  public async queryHistoryList(params: {
    account: string;
    pageNum: number;
    pageSize: number;
  }): Promise<{
    transactions: ITransactionInfo[];
    count: number;
  }> {
    const { pageNum, pageSize, account } = params;
    if (!pageNum || !pageSize || !account)
      return throwNewError("queryHistoryList params error.");
    return await queryTransactionByAddress(account, pageNum, pageSize);
  }

  public async searchTransaction(txHash: string): Promise<ISearchTxResponse> {
    try {
      if (!txHash) return throwNewError("searchTransaction param no [txHash].");

      return await queryTransactionByHash(txHash);
    } catch (error: any) {
      return throwNewError(error.message);
    }
  }
}
