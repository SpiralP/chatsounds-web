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

export const WasmContext = React.createContext<Wasm | null>(null);

export default function useWasm() {
  const wasm = React.useContext(WasmContext);
  if (!wasm) {
    throw new Error("!wasm");
  }
  return wasm;
}

export class Wasm {
  public static async load(): Promise<Wasm> {
    await loadWasm();

    return new Wasm();
  }

  public fetchGithubApi = fetchGithubApi;

  public fetchGithubMsgpack = fetchGithubMsgpack;

  public loadGithubApi = loadGithubApi;

  public loadGithubMsgpack = loadGithubMsgpack;

  public play = play;

  public search = search;

  public setup = setup;
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
      wasm: Wasm;
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
    Wasm.load().then(
      (wasm) => {
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
