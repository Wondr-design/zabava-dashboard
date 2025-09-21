import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

export function MetricCard({ title, value, subtitle }: MetricCardProps): JSX.Element {
  return (
    <Card className="bg-white/90 shadow-md border border-gray-200 hover:scale-[1.02] transition-transform">
      <CardHeader>
        <CardTitle className="text-sm text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle ? <p className="text-xs text-gray-400">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}
