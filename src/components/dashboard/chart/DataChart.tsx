import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ChartData {
  name: string;
  users: number;
}

interface DataChartProps {
  data: ChartData[];
  onClick?: () => void;
}

export function DataChart({ data, onClick }: DataChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} onClick={onClick}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="users" fill="hsl(var(--primary))" name="Users" />
      </BarChart>
    </ResponsiveContainer>
  );
}