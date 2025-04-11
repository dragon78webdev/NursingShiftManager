namespace NurseScheduler.Models
{
    public enum Role
    {
        Nurse,
        Oss,
        HeadNurse
    }

    public class User
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public Role Role { get; set; }
        public string? GoogleId { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsFirstLogin { get; set; }
    }
}