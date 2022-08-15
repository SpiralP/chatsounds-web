import { InputGroup } from "@blueprintjs/core";
import React from "react";
import { useLocation, useMount } from "react-use";
import ChatsoundsSearchResults from "/components/ChatsoundsSearchResults";
import useWasm from "/hooks/useWasm";

/** (including #) */
function encodeHash(input: string): string {
  return `#${input.replace(/ /g, "+")}`;
}

/** (including #) */
function decodeHash(hash: string): string {
  return hash.slice(1).replace(/\+/g, " ");
}

export default function Chatsounds() {
  const { play } = useWasm();

  const [input, setInput] = React.useState("");
  const [search, setSearch] = React.useState("");

  const { hash } = useLocation();
  useMount(() => {
    const input = decodeHash(hash || "");
    if (input) {
      setInput(input);
      setSearch(input);
      play(input);
    }
  });

  React.useEffect(() => {
    window.location.hash = encodeHash(input);
  }, [input]);

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
