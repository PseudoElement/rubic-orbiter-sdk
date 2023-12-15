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

  public updateSigner(signer: Account | Signer) {
    this.signer = signer;
  }

  public async queryHistoryList(params: {
    pageNum: number;
    pageSize: number;
  }): Promise<{
    transactions: ITransactionInfo[];
    count: number;
  }> {
    const account =
      "address" in this.signer
        ? this.signer?.address
        : await this.signer?.getAddress();
    if (!account)
      return throwNewError("queryHistoryList has no signer / account.");
    const { pageNum, pageSize } = params;
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
