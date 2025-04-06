
import { useAuth } from "@/components/auth/AuthProvider";

export function DashboardHeader() {
  const { user } = useAuth();
  const displayName = user?.email?.split('@')[0] || "User";

  return (
    <div className="flex justify-between items-center py-4 w-full">
      <div className="text-3xl font-bold text-white/90">
        {displayName}
      </div>
    </div>
  );
}
