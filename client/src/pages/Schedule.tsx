import { useState } from "react";
import ScheduleView from "@/components/schedule/ScheduleView";
import GenerateScheduleDialog from "@/components/dialogs/GenerateScheduleDialog";
import { useQuery } from "@tanstack/react-query";
import { AuthUser } from "@/lib/types";

const Schedule = () => {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  
  // Get current user to check permissions
  const { data: user } = useQuery<AuthUser>({
    queryKey: ['/api/auth/user'],
  });
  
  const isHeadNurse = user?.role === 'head_nurse';
  
  return (
    <div className="py-6 space-y-6">
      <ScheduleView />
      
      {showGenerateDialog && (
        <GenerateScheduleDialog
          onClose={() => setShowGenerateDialog(false)}
        />
      )}
    </div>
  );
};

export default Schedule;
