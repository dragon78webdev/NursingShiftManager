namespace NurseScheduler.Models
{
    public enum RequestStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public enum ChangeRequestType
    {
        Swap,
        TimeOff,
        Compensation
    }

    public class ChangeRequest
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public DateTime Date { get; set; }
        public ShiftType? FromShiftType { get; set; }
        public ShiftType? ToShiftType { get; set; }
        public string Reason { get; set; } = string.Empty;
        public RequestStatus Status { get; set; } = RequestStatus.Pending;
        public ChangeRequestType RequestType { get; set; }
        public int? TargetStaffId { get; set; } // For shift swaps
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        // Navigation properties
        public Staff? Staff { get; set; }
        public Staff? TargetStaff { get; set; }
    }
}