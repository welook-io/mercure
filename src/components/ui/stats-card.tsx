interface StatsCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  subtitle?: string;
}

export function StatsCard({ label, value, accent = false, subtitle }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className={`text-3xl font-semibold mt-1 ${accent ? "text-orange-500" : "text-neutral-900"}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}













