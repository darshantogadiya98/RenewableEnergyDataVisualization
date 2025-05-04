import { useQuery } from "@tanstack/react-query";
import api from "../api";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Reading {
  id: string;
  source: string;
  kw: number;
  recorded_at: string;
}

export default function Dashboard() {
  const { data } = useQuery<Reading[]>({
    queryKey: ["readings"],
    queryFn: async () => {
      const res = await api.get("/readings");
      return res.data;
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Energy Usage</h1>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || []}>
            <XAxis dataKey="recorded_at" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="kw" strokeWidth={2} fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
