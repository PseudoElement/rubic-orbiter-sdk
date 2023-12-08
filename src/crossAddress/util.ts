import {
  BigNumberish,
  BytesLike,
  Signer,
  TransactionResponse,
  hexlify,
  isHexString,
} from "ethers-6";
import { requestWeb3, throwNewError } from "../utils";
import { IChainInfo } from "../types";

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, ms);
  });
}
export function hexConcat(items: ReadonlyArray<BytesLike>): string {
  let result = "0x";
  items.forEach((item) => {
    result += hexlify(item).substring(2);
  });
  return result;
}
export function hexDataSlice(
  data: BytesLike,
  offset: number,
  endOffset?: number
): string {
  if (typeof data !== "string") {
    data = hexlify(data);
  } else if (!isHexString(data) || data.length % 2) {
    throwNewError("hexDataSlice error: invalid hexData");
  }

  offset = 2 + 2 * offset;

  if (endOffset != null) {
    return "0x" + data.substring(offset, 2 + 2 * endOffset);
  }

  return "0x" + data.substring(offset);
}

export async function sendTransaction(
  chainInfo: IChainInfo,
  from: string,
  to: string,
  value: BigNumberish,
  data: string,
  signer: Signer
): Promise<TransactionResponse> {
  const nonce: number = await requestWeb3(chainInfo, {
    method: "getTransactionCount",
    address: from,
    blockTag: "",
  });
  const result = await signer.sendTransaction({
    from,
    to,
    value,
    data,
    nonce,
  });
  await result.wait();
  return result;
}
