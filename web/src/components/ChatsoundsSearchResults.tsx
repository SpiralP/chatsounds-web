import { Menu } from "@blueprintjs/core";
import debounce from "lodash.debounce";
import React from "react";
import { usePrevious } from "react-use";
import ChatsoundsResult from "/components/ChatsoundsResult";
import useWasm from "/hooks/useWasm";

const MAX_VISIBLE_RESULTS = 50;

export default function ChatsoundsSearchResults({
  input,
  onSetInput,
  tabSelection,
}: {
  input: string;
  onSetInput: (input: string, play?: boolean) => void;
  tabSelection: number | null;
}) {
  const { search } = useWasm();

  const [results, setResults] = React.useState<string[]>([]);

  const updateSearch = React.useMemo(
    () =>
      debounce(async (input: string) => {
        const results = await search(input);
        setResults(results);
      }, 200),
    [search]
  );

  React.useEffect(() => {
    updateSearch(input);
  }, [input, updateSearch]);

  const lastTabSelection = usePrevious(tabSelection);
  React.useEffect(() => {
    if (tabSelection !== null && tabSelection !== lastTabSelection) {
      const result = results[tabSelection];
      if (result) {
        onSetInput(result);
      }
    }
  }, [lastTabSelection, onSetInput, results, tabSelection]);

  const visibleResults = React.useMemo(
    () =>
      results.slice(
        tabSelection || 0,
        (tabSelection || 0) + MAX_VISIBLE_RESULTS
      ),
    [results, tabSelection]
  );

  const resultClicked = React.useCallback(
    (result: string) => {
      onSetInput(result, true);
    },
    [onSetInput]
  );

  return (
    <div>
      <Menu>
        {visibleResults.map((result) => (
          <ChatsoundsResult
            key={result}
            onClick={resultClicked}
            result={result}
          />
        ))}
      </Menu>
    </div>
  );
}
