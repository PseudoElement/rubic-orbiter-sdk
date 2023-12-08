import {
  Account,
  Contract,
  RpcProvider,
  uint256,
  validateAndParseAddress,
} from "starknet";
import { STARKNET_ERC20_ABI, STARKNET_OB_SOURCE_ABI } from "../constant/abi";
import { CONTRACT_OLD_TYPE, UINT_256_MAX } from "../constant/common";
import { getContractByType, throwNewError } from "../utils";
import { IChainInfo } from "../types";
import BigNumber from "bignumber.js";

export async function sendTransfer(
  account: Account,
  l1Address: string,
  tokenAddress: string,
  makerAddress: string,
  amount: BigNumber,
  fromChainInfo: IChainInfo
) {
  l1Address = l1Address.toLowerCase();
  tokenAddress = tokenAddress.toLowerCase();
  makerAddress = makerAddress.toLowerCase();
  const contractAddress =
    fromChainInfo.contract &&
    getContractByType(fromChainInfo.contract, CONTRACT_OLD_TYPE);

  if (!fromChainInfo.contract || !contractAddress) {
    return throwNewError("Contract not in fromChainInfo.");
  }

  if (!fromChainInfo?.rpc || !fromChainInfo.rpc.length) {
    return throwNewError("starknet rpc not configured");
  }

  const tokenContract = new Contract(STARKNET_ERC20_ABI, tokenAddress, account);
  const allowance = await getAllowance(
    tokenContract,
    contractAddress,
    account.address
  );

  const crossContract = new Contract(
    STARKNET_OB_SOURCE_ABI,
    contractAddress,
    account
  );

  const receiverAddress = makerAddress;
  try {
    let tx;
    if (amount.gt(allowance)) {
      const approveTxCall = tokenContract.populate("approve", [
        contractAddress,
        getUint256CalldataFromBN(String(UINT_256_MAX)),
      ]);
      const transferERC20TxCall = crossContract.populate("transferERC20", [
        tokenAddress,
        receiverAddress,
        getUint256CalldataFromBN(String(amount)),
        l1Address,
      ]);
      tx = await account.execute([approveTxCall, transferERC20TxCall]);
    } else {
      const transferERC20TxCall = crossContract.populate("transferERC20", [
        tokenAddress,
        receiverAddress,
        getUint256CalldataFromBN(String(amount)),
        l1Address,
      ]);
      tx = await account.execute(transferERC20TxCall);
    }
    return tx;
  } catch (e) {
    console.log(e);
    return throwNewError("starknet transfer error", e);
  }
}

export async function getAllowance(
  contractErc20: Contract,
  contractAddress: string,
  address: string
) {
  if (!address) return throwNewError("starknet get address error");
  const allowance = await contractErc20.allowance(address, contractAddress);
  return allowance.remaining.low;
}

function getUint256CalldataFromBN(bn: string) {
  return { type: "struct", ...uint256.bnToUint256(bn) };
}

export function starknetHashFormat(txHash: string) {
  if (txHash.length < 66) {
    const end = txHash.substring(2, txHash.length);
    const add = 64 - end.length;
    let addStr = "";
    for (let i = 0; i < add; i++) {
      addStr += "0";
    }
    txHash = "0x" + addStr + end;
  }
  return txHash;
}

export function getAccountAddressError(address: string, isStarknet: boolean) {
  if (isStarknet) {
    try {
      validateAndParseAddress(starknetHashFormat(address));
      return null;
    } catch (e: any) {
      return e.message;
    }
  } else {
    if (new RegExp(/^0x[a-fA-F0-9]{40}$/).test(address)) {
      return null;
    } else {
      return "Invalid evm address";
    }
  }
}
