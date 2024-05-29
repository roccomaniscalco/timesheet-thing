import { api } from "@/client/api-caller";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/client/components/ui/breadcrumb";
import { headerBreadcrumbTunnel } from "@/client/routes/__root.js";
import { UserButton } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import type { InferResponseType } from "hono";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";

export const Route = createFileRoute("/timesheets/$id")({
  component: Timesheet,
});

function Timesheet() {
  const { id } = useParams({ from: "/timesheets/$id" });
  const { data: timesheet } = useQuery({
    queryKey: ["get-timesheet", id],
    queryFn: async () => {
      const res = await api.contractor.timesheets["$id"].$get({
        query: { id },
      });
      if (!res.ok) throw new Error("Failed to get timesheet");
      return res.json();
    },
  });

  return (
    <>
      <headerBreadcrumbTunnel.In>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <UserButton />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/timesheets">Timesheets</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{timesheet?.slug}</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>
      </headerBreadcrumbTunnel.In>

      {timesheet && <TaskTable tasks={timesheet.tasks}/>}
    </>
  );
}

const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV005",
    paymentStatus: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV006",
    paymentStatus: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV007",
    paymentStatus: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
];

type Tasks = InferResponseType<
  (typeof api.contractor.timesheets)["$id"]["$get"],
  200
>["tasks"];

type TaskTableProps = {
  tasks: Tasks;
};
function TaskTable(props: TaskTableProps) {
  return (
    <Table>
      <TableCaption>A list of your recent invoices.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Day</TableHead>
          <TableHead className="w-[50%]">Task</TableHead>
          <TableHead className="text-right">Hours</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell className="uppercase">{task.weekDay}</TableCell>
            <TableCell className="w-[50%]">{task.name}</TableCell>
            <TableCell className="text-right">{task.hours}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
