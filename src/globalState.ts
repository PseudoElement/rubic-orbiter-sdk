import { IGlobalState } from "./types";

let globalState: IGlobalState = {
  isMainnet: false,
};

function setGlobalState(newState?: Partial<IGlobalState>) {
  globalState.isMainnet = newState?.isMainnet ?? false;
}

function getGlobalState(): IGlobalState {
  return globalState;
}

export { setGlobalState, getGlobalState };
