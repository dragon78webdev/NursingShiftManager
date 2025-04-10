import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  iconClassName?: string;
}

const StatsCard = ({ icon, title, value, iconClassName }: StatsCardProps) => {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
      <div className="p-4 flex items-center">
        <div className={cn("p-3 rounded-full mr-4", iconClassName)}>
          {icon}
        </div>
        <div>
          <p className="text-neutral-600 text-sm">{title}</p>
          <p className="text-2xl font-bold text-neutral-800">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
