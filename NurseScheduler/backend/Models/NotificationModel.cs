namespace NurseScheduler.Models
{
    public class Notification
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool Read { get; set; } = false;
        public string Type { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        
        // Navigation property
        public User? User { get; set; }
    }
}