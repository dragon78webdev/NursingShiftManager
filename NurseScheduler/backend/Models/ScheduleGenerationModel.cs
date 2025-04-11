namespace NurseScheduler.Models
{
    public class ScheduleGeneration
    {
        public int Id { get; set; }
        public int CreatedById { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public Role StaffType { get; set; }
        public string Department { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        
        // Navigation property
        public User? CreatedBy { get; set; }
    }
}