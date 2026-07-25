const stats = [
  { label: "მომხმარებლები" },
  { label: "შეკვეთები" },
  { label: "პროდუქტები" },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">დეშბორდი</h1>
      <p className="mt-2 text-muted-foreground">
        მოგესალმებით მოტოსტოკის ადმინ პანელში.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">—</p>
            <p className="mt-1 text-xs text-muted-foreground">მალე დაემატება</p>
          </div>
        ))}
      </div>
    </div>
  );
}
