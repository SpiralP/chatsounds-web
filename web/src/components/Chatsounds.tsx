import { InputGroup } from "@blueprintjs/core";
import React from "react";
import { useMount } from "react-use";
import ChatsoundsSearchResults from "/components/ChatsoundsSearchResults";
import useWasm from "/hooks/useWasm";

type HistoryState = {
  input?: string;
};

function setQuery(input: string) {
  const query = input.replace(/ /g, "+");
  // need to include the ?
  const url = `${window.location.origin}${window.location.pathname}?${query}`;
  const state: HistoryState = { input };
  window.history.pushState(state, "", url);
}

function decodeQuery(): string {
  // includes the ?
  const query = window.location.search || "";
  return query.slice(1).replace(/\+/g, " ");
}

export default function Chatsounds() {
  const { play } = useWasm();

  const [input, setInput] = React.useState("");
  const [search, setSearch] = React.useState("");

  useMount(() => {
    const input = decodeQuery();
    if (input) {
      setInput(input);
      setSearch(input);
      play(input);
    }

    window.addEventListener("popstate", (event) => {
      if (typeof event.state !== "object") {
        return;
      }

      const { input } = event.state as HistoryState;
      if (input) {
        console.log({ input });
        setInput(input);
        setSearch(input);
      }
    });
  });

  const [tabSelection, setTabSelection] = React.useState<number | null>(null);

  const inputChange = React.useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setInput(value);
      setSearch(value);
      setTabSelection(null);
    },
    []
  );

  const inputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        play(input);
        setQuery(input);
      } else if (event.key === "Tab") {
        event.preventDefault();
        setTabSelection((tabSelection) => {
          if (tabSelection === null) {
            return 0;
          }
          if (event.shiftKey) {
            return Math.max(0, tabSelection - 1);
          }
          return tabSelection + 1;
        });
      }
    },
    [input, play]
  );

  const onSearchSetInput = React.useCallback(
    (input: string, shouldPlay?: boolean) => {
      setInput(input);
      if (shouldPlay) {
        play(input);
        setQuery(input);
      }
    },
    [play]
  );

  return (
    <>
      <InputGroup
        large
        autoFocus
        onChange={inputChange}
        onKeyDown={inputKeyDown}
        value={input}
      />
      <ChatsoundsSearchResults
        input={search}
        tabSelection={tabSelection}
        onSetInput={onSearchSetInput}
      />
    </>
  );
}
