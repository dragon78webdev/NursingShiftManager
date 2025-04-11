using System;

namespace NurseScheduler.Models
{
    public class Staff
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Department { get; set; } = string.Empty;
        public bool IsPartTime { get; set; }
        public int WeeklyHours { get; set; }
        public string? Qualification { get; set; }
        public DateTime JoinDate { get; set; }
        public bool IsActive { get; set; }
    }
}