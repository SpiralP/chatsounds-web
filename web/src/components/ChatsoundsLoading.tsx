import { Spinner, SpinnerSize } from "@blueprintjs/core";
import React from "react";
import Chatsounds from "/components/Chatsounds";
import useWasm from "/hooks/useWasm";

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
  const { fetchAndLoadGithubApi, fetchAndLoadGithubMsgpack } = useWasm();

  const [done, setDone] = React.useState(false);
  const [amountLoaded, setAmountLoaded] = React.useState(0);

  React.useEffect(() => {
    setAmountLoaded(0);

    const promises = SOURCES.map(async ([kind, name, path]) => {
      if (kind === "api") {
        await fetchAndLoadGithubApi(name, path);
        console.log("fetchAndLoadGithubApi done");
      } else if (kind === "msgpack") {
        await fetchAndLoadGithubMsgpack(name, path);
        console.log("fetchAndLoadGithubMsgpack done");
      }
      setAmountLoaded((amountLoaded) => amountLoaded + 1);
    });

    Promise.all(promises).then(
      () => {
        setDone(true);
      },
      (e) => {
        // TODO
        console.error(e);
        setDone(true);
      }
    );
  }, [fetchAndLoadGithubApi, fetchAndLoadGithubMsgpack]);

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
