import loadWasm, {
  fetchGithubApi,
  fetchGithubMsgpack,
  loadGithubApi,
  loadGithubMsgpack,
  play,
  search,
  setup,
} from "chatsounds-web";
import React from "react";

const wasm = {
  fetchGithubApi,
  fetchGithubMsgpack,
  loadGithubApi,
  loadGithubMsgpack,
  async play(input: string) {
    const playedUrls = await play(input);
    playedUrls.forEach((url) => {
      console.log(encodeURI(url));
    });
  },
  search,
  setup,
};

export const WasmContext = React.createContext<typeof wasm | null>(null);

export default function useWasm() {
  const wasm = React.useContext(WasmContext);
  if (!wasm) {
    throw new Error("!wasm");
  }
  return wasm;
}

export enum WasmState {
  Loading,
  Loaded,
  Error,
}

export type WasmStateInfo =
  | {
      state: WasmState.Loading;
    }
  | {
      state: WasmState.Loaded;
      wasm: typeof wasm;
    }
  | {
      state: WasmState.Error;
      error: string;
    };

export function useWasmStateInfo(): WasmStateInfo {
  const [stateInfo, setStateInfo] = React.useState<WasmStateInfo>(() => ({
    state: WasmState.Loading,
  }));

  React.useEffect(() => {
    loadWasm().then(
      () => {
        setStateInfo({ state: WasmState.Loaded, wasm });
      },
      (e) => {
        console.error(e);
        setStateInfo({
          state: WasmState.Error,
          error: "Wasm error!",
        });
      },
    );
  }, []);

  return stateInfo;
}
