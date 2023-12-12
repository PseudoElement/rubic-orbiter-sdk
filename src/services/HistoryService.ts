import {
  collectUserTransaction,
  queryTransactionByAddress,
  queryTransactionByHash,
} from "./ApiService";
import { ISearchTxData, ITransactionInfo } from "../types";
import { formatDate, getChainTokenList, throwNewError } from "../utils";
import { Signer, isHexString } from "ethers-6";
import { Account } from "starknet";
import { CHAIN_ID_MAINNET, CHAIN_ID_TESTNET } from "../constant/common";
import { starknetHashFormat } from "../crossControl/starknet_helper";
import BigNumber from "bignumber.js";
import ChainsService from "./ChainsService";

export default class HistoryService {
  private signer: Account | Signer;
  private chainsService: ChainsService;

  constructor(signer: Account | Signer) {
    this.signer = signer;
    this.chainsService = ChainsService.getInstance();
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
    txHash: string,
    fromChainID: number | string
  ): Promise<ISearchTxData | undefined> {
    try {
      if (!txHash || !fromChainID)
        return throwNewError("searchTransaction param error.");

      const currentFromChainID = String(fromChainID);
      let currentHash = txHash;

      switch (currentFromChainID) {
        case CHAIN_ID_MAINNET.starknet:
        case CHAIN_ID_TESTNET.starknet_test:
          currentHash = starknetHashFormat(currentHash);
          break;
        case CHAIN_ID_MAINNET.imx:
        case CHAIN_ID_TESTNET.imx_test:
          if (!Number(currentFromChainID))
            return throwNewError("searchTransaction ImmutableX hash error.");
          break;
        default:
          if (!isHexString(currentHash) || currentHash?.length !== 66) {
            return throwNewError("searchTransaction param [txHash] error.");
          }
          break;
      }
      let { status, txList } = await queryTransactionByHash([
        currentFromChainID,
      ]);

      if (status === -1) {
        const v2Res = await queryTransactionByHash([txHash], false);
        if (!v2Res) {
          return throwNewError("queryTransactionByHash frequent");
        }
        status = v2Res.status;
        txList = v2Res.txList;
      }
      const fromChainInfo = await this.chainsService.getChainInfoAsync(
        fromChainID
      );
      if (status === 99) {
        const data: ISearchTxData = {} as ISearchTxData;
        for (const tx of txList) {
          const tokenList = getChainTokenList(fromChainInfo);
          const token = tokenList.find((item) => item.symbol === tx.symbol);
          if (tx.side === 0) {
            const date = new Date(tx.timestamp);
            data.fromHash = tx.hash;
            data.fromChainId = tx.chainId;
            data.fromTime = tx.timestamp;
            data.fromAmount = tx.value;
            data.fromSymbol = tx.symbol;
            data.fromTimeStampShow = formatDate(date);
            data.fromAmountValue = token?.decimals
              ? new BigNumber(tx.value)
                  .dividedBy(10 ** token?.decimals)
                  .toFixed(8)
              : tx.value;
          }
          if (tx.side === 1) {
            const date = new Date(tx.timestamp);
            data.toHash = tx.hash;
            data.toChainId = tx.chainId;
            data.toTime = tx.timestamp;
            data.toAmount = tx.value;
            data.toSymbol = tx.symbol;
            data.toTimeStampShow = formatDate(date);
            data.toAmountValue = token?.decimals
              ? new BigNumber(tx.value)
                  .dividedBy(10 ** token?.decimals)
                  .toFixed(8)
              : tx.value;
          }
        }
        return data;
      }
      await collectUserTransaction([
        txHash,
        fromChainInfo.internalId ? Number(fromChainInfo.internalId) : null,
      ]);
    } catch (error: any) {
      throwNewError(error.message);
    }
  }
}
