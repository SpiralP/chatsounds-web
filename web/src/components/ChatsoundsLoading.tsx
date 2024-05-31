import { Intent, Spinner, SpinnerSize } from "@blueprintjs/core";
import React from "react";
import Chatsounds from "/src/components/Chatsounds";
import useToaster from "/src/hooks/useToaster";
import useWasm from "/src/hooks/useWasm";

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

const SOURCES: Array<["api" | "msgpack", string, string]> = [
  ["msgpack", "PAC3-Server/chatsounds-valve-games", "csgo"],
  ["msgpack", "PAC3-Server/chatsounds-valve-games", "css"],
  ["msgpack", "PAC3-Server/chatsounds-valve-games", "ep1"],
  ["msgpack", "PAC3-Server/chatsounds-valve-games", "ep2"],
  ["msgpack", "PAC3-Server/chatsounds-valve-games", "hl1"],
  ["msgpack", "PAC3-Server/chatsounds-valve-games", "hl2"],
  ["msgpack", "PAC3-Server/chatsounds-valve-games", "l4d"],
  ["msgpack", "PAC3-Server/chatsounds-valve-games", "l4d2"],
  ["msgpack", "PAC3-Server/chatsounds-valve-games", "portal"],
  ["msgpack", "PAC3-Server/chatsounds-valve-games", "tf2"],
  ["api", "NotAwesome2/chatsounds", "sounds"],
  ["api", "PAC3-Server/chatsounds", "sounds/chatsounds"],
  ["api", "Metastruct/garrysmod-chatsounds", "sound/chatsounds/autoadd"],
];

export default function ChatsoundsLoading() {
  const {
    fetchGithubApi,
    fetchGithubMsgpack,
    loadGithubApi,
    loadGithubMsgpack,
  } = useWasm();

  const toaster = useToaster();
  const [done, setDone] = React.useState(false);
  const [amountLoaded, setAmountLoaded] = React.useState(0);

  React.useEffect(() => {
    setAmountLoaded(0);

    (async () => {
      const beforeFetching = Date.now();
      const fetchingPromises = SOURCES.map(async (source) => {
        const [kind, name, path] = source;
        const value = await (async () => {
          if (kind === "api") {
            return [
              kind,
              [name, path],
              await fetchGithubApi(name, path),
            ] as const;
          }
          if (kind === "msgpack") {
            return [
              kind,
              [name, path],
              await fetchGithubMsgpack(name, path),
            ] as const;
          }
          throw new Error("unreachable");
        })().catch((e: Error) => {
          toaster.show({
            intent: Intent.WARNING,
            message: `Failed to fetch ${name} ${path}: ${e?.message}`,
          });
          return null;
        });
        setAmountLoaded((amountLoaded) => amountLoaded + 1);
        return value;
      });

      const datas = await Promise.all(fetchingPromises);
      console.log("fetching took", Date.now() - beforeFetching);

      const beforeLoading = Date.now();
      await Promise.all(
        datas.filter(nonNullable).map(async ([kind, [name, path], data]) => {
          await (async () => {
            if (kind === "api") {
              await loadGithubApi(name, path, data);
            } else if (kind === "msgpack") {
              await loadGithubMsgpack(name, path, data);
            }
          })().catch((e: Error) => {
            toaster.show({
              intent: Intent.WARNING,
              message: `Failed to load ${name} ${path}: ${e?.message}`,
            });
            return null;
          });
        }),
      );
      console.log("loading took", Date.now() - beforeLoading);

      setDone(true);
    })().catch((e: Error) => {
      console.error(e);
      setDone(true);
    });
  }, [
    fetchGithubApi,
    fetchGithubMsgpack,
    loadGithubApi,
    loadGithubMsgpack,
    toaster,
  ]);

  if (done) {
    return <Chatsounds />;
  }

  const percent = amountLoaded / SOURCES.length;
  return (
    <div className="centered">
      <Spinner size={SpinnerSize.LARGE} value={percent} />
    </div>
  );
}
