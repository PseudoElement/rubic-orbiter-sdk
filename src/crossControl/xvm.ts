import { XVM_ABI } from "../constant/abi";
import { isEthTokenAddress, getExpectValue } from "../bridge/utils";
import RLP from "rlp";
import { Signer, ethers } from "ethers-6";
import { ICrossRule } from "../types";
import ChainsService from "../services/ChainsService";

export async function XVMSwap(
  signer: Signer,
  contractAddress: string,
  account: string,
  selectMakerConfig: ICrossRule,
  value: BigInt,
  toWalletAddress: string,
  fromChainID: string,
  transferValue: string | number
) {
  const { fromChain, toChain } = selectMakerConfig;
  const t1Address = fromChain.tokenAddress;
  const fromCurrency = fromChain.symbol;
  const toChainId = toChain.id;
  const toCurrency = toChain.symbol;
  const t2Address = toChain.tokenAddress;
  const slippage = selectMakerConfig.slippage;
  const expectValue = await getExpectValue(
    selectMakerConfig,
    transferValue,
    fromCurrency,
    toCurrency
  );
  const sourceData =
    fromCurrency === toCurrency
      ? [toChainId, t2Address, toWalletAddress]
      : [toChainId, t2Address, toWalletAddress, expectValue, slippage];
  const data = RLP.encode(sourceData);
  const contractInstance = new ethers.Contract(
    contractAddress,
    XVM_ABI,
    signer
  );
  const chainsInstance = ChainsService.getInstance();
  const fromChainsInfo = chainsInstance.getChainInfo(fromChainID);
  if (isEthTokenAddress(t1Address, fromChainsInfo)) {
    return await contractInstance.swap(
      selectMakerConfig.recipient,
      t1Address,
      value,
      data,
      {
        value,
      }
    );
  } else {
    const gasLimit = await contractInstance.swap.estimateGas({
      from: account,
      gas: 5000000,
    });
    const swapTx = await contractInstance.swap(
      selectMakerConfig.recipient,
      t1Address,
      value,
      data
    );
    await swapTx.wait();
    return await contractInstance.send({
      from: account,
      gas: gasLimit,
    });
  }
}
