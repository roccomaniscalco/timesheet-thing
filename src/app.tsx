import { useState } from "react";
import type { ApiType } from "../functions/api/[[route]]";
import { hc } from "hono/client";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";

const api = hc<ApiType>("/").api;
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Hello />
      <Sum />
    </QueryClientProvider>
  );
}

function Hello() {
  const [name, setName] = useState("world");

  const helloQuery = useQuery({
    queryKey: ["hello", name],
    queryFn: () =>
      api.hello.$get({ query: { name } }).then((res) => res.json()),
    placeholderData: (previousData) => previousData,
  });

  return (
    <div>
      <h1 style={{ opacity: helloQuery.isPlaceholderData ? 0.5 : 1 }}>
        {helloQuery.data?.message}
      </h1>
      <input value={name} onChange={(e) => setName(e.target.value)} />
    </div>
  );
}

function Sum() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);

  const sumMutation = useMutation({
    mutationKey: ["sum"],
    mutationFn: (data: { a: number; b: number }) =>
      api.sum.$post({ json: data }).then((res) => res.json()),
  });

  return (
    <div>
      <h1>Sum: {sumMutation.data?.sum}</h1>
      <input value={a} onChange={(e) => setA(Number(e.target.value))} />
      {" "}+{" "}
      <input value={b} onChange={(e) => setB(Number(e.target.value))} />
      <button onClick={() => sumMutation.mutate({ a, b })}>Calculate</button>
    </div>
  );
}
