import {
  queryTransactionByAddress,
  queryTransactionByHash,
} from "./ApiService";
import { ISearchTxResponse, ITransactionInfo } from "../types";
import { throwNewError } from "../utils";
import { Signer } from "ethers-6";
import { Account } from "starknet";

export default class HistoryService {
  private signer: Account | Signer;

  constructor(signer: Account | Signer) {
    this.signer = signer;
  }

  public updateConfig(config: { signer: Account | Signer }) {
    this.signer = config.signer;
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

  public async searchTransaction(
    txHash: string
  ): Promise<ISearchTxResponse | undefined> {
    try {
      if (!txHash) return throwNewError("searchTransaction param no [txHash].");

      return await queryTransactionByHash(txHash);
    } catch (error: any) {
      throwNewError(error.message);
    }
  }
}
