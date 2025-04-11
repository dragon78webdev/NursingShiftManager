namespace NurseScheduler.Models
{
    public class Delegation
    {
        public int Id { get; set; }
        public int HeadNurseId { get; set; }
        public int DelegatedToId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Reason { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        
        // Navigation properties
        public User? HeadNurse { get; set; }
        public User? DelegatedTo { get; set; }
    }
}