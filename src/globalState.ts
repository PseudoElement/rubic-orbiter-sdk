import { IGlobalState } from "./types";
import Web3 from "web3";

let globalState: IGlobalState = {
  isMainnet: false,
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
