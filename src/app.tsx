import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { hc } from "hono/client";
import { useState } from "react";
import type { ApiType } from "../functions/api/[[route]]";

const api = hc<ApiType>("/").api;
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Hello />
      <Timesheets />
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

function Timesheets() {
  const { data: timesheets } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => api.timesheets.$get().then((res) => res.json()),
  });

  return (
    <div>
      <h2>Timesheets</h2>
      <ul>
        {timesheets?.map((timesheet) => (
          <li key={timesheet.id}>
            {timesheet.weekOf}
          </li>
        ))}
      </ul>
    </div>
  )
}
