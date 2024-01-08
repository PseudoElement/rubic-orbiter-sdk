import { Signer } from "ethers-6";
import Web3 from "web3";
import { Account } from "starknet";
import { IGlobalState, SIGNER_TYPES } from "./types";

let globalState: IGlobalState = {
  isMainnet: true,
  dealerId: "",
  activeSignerType: SIGNER_TYPES.EVM,
  evmSigner: {} as Signer,
  starknetSigner: {} as Account,
  loopringSigner: {} as Web3,
};

function setGlobalState(newState: Partial<IGlobalState> = {}) {
  const globalStateKeys = Object.keys(newState);
  if (!!globalStateKeys.length) {
    globalStateKeys.forEach((v) => {
      globalState[v] = newState[v] ?? globalState[v];
    });
  }
}

function getGlobalState(): IGlobalState {
  return globalState;
}

export { setGlobalState, getGlobalState };
