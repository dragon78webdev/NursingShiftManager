namespace NurseScheduler.Models
{
    public class Vacation
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Reason { get; set; } = string.Empty;
        public bool IsApproved { get; set; }
        public DateTime CreatedAt { get; set; }
        
        // Navigation property
        public Staff? Staff { get; set; }
    }
}