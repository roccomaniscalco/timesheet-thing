import { WEEK_DAY } from "@/constants";
import { z } from "zod";

export const taskFormSchema = z.object({
  weekDay: z.enum(WEEK_DAY, { message: "Day is required" }),
  name: z.string().min(1, { message: "Task is required" }),
  hours: z
    .number({ message: "Hours is required" })
    .positive({ message: "Hours must be positive" })
    .refine((v) => v % 0.25 === 0, {
      message: "Hours must be in 0.25 increments",
    }),
});
export type TaskForm = z.infer<typeof taskFormSchema>;