import debounce from "lodash.debounce";
import React from "react";
import ChatsoundsResult from "/components/ChatsoundsResult";
import useWasm from "/hooks/useWasm";

export default function ChatsoundsSearchResults({ input }: { input: string }) {
  const { search } = useWasm();

  const [results, setResults] = React.useState<string[]>([]);

  const updateSearch = React.useMemo(
    () =>
      debounce(async (input: string) => {
        const results = await search(input);
        setResults(results.slice(0, 10));
      }, 200),
    [search]
  );

  React.useEffect(() => {
    updateSearch(input);
  }, [input, updateSearch]);

  return (
    <div>
      {results.map((result) => (
        <ChatsoundsResult key={result} result={result} />
      ))}
    </div>
  );
}
