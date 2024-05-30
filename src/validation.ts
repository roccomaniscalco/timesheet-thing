import { WEEKDAY } from "@/constants";
import { z } from "zod";

export const taskFormSchema = z.object({
  weekday: z.enum(WEEKDAY, { message: "Day is required" }),
  name: z
    .string({ message: "Task is required" })
    .min(1, { message: "Task is required" }),
  hours: z
    .number({ message: "Hours is required" })
    .positive({ message: "Hours must be positive" })
    .refine((v) => v % 0.25 === 0, {
      message: "Hours must be in 0.25 increments",
    }),
});
export type TaskForm = z.infer<typeof taskFormSchema>;
