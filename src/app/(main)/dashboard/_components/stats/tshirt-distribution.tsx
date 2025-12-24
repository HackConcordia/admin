"use client";

interface TShirtDistributionProps {
  data: {
    S: number;
    M: number;
    L: number;
    XL: number;
  };
  totalShirts: number;
}

const sizeLabels: Record<string, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "XL",
};

const sizeColors: Record<string, string> = {
  S: "bg-blue-500",
  M: "bg-blue-500",
  L: "bg-blue-500",
  XL: "bg-blue-500",
};

export function TShirtDistribution({
  data,
  totalShirts,
}: TShirtDistributionProps) {
  const maxCount = Math.max(...Object.values(data));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-baseline gap-2">
        <span className="text-primary text-3xl font-bold">{totalShirts}</span>
        <span className="text-muted-foreground text-sm">Shirts</span>
      </div>

      <div className="flex-1 space-y-4">
        {(Object.keys(sizeLabels) as Array<keyof typeof sizeLabels>).map(
          (size) => {
            const count = data[size as keyof typeof data] || 0;
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <div key={size} className="flex items-center gap-3">
                <div className="text-muted-foreground w-16 text-sm font-medium">
                  {sizeLabels[size]}
                </div>
                <div className="bg-muted h-3 flex-1 overflow-hidden rounded-full">
                  <div
                    className={`h-full ${sizeColors[size]} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-muted-foreground w-24 text-right text-sm">
                  {count} Applicants
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
