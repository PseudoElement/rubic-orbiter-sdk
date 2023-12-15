import { BytesLike, hexlify, isHexString } from "ethers-6";
import { throwNewError } from "../utils";

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
