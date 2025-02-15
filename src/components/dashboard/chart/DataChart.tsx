
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ChartData } from "./types";

interface DataChartProps {
  data: ChartData[];
}

export function DataChart({ data }: DataChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar
          dataKey="users"
          fill="hsl(var(--primary))"
          name="Users"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
