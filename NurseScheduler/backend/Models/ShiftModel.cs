namespace NurseScheduler.Models
{
    public enum ShiftType
    {
        Morning, // M - Mattina
        Afternoon, // P - Pomeriggio
        Night, // N - Notte
        Rest, // R - Riposo
        Holiday // F - Festivo
    }

    public class Shift
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public DateTime Date { get; set; }
        public ShiftType ShiftType { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int? CreatedById { get; set; }
        
        // Navigation property
        public Staff? Staff { get; set; }
    }
}