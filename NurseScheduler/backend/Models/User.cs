using System;

namespace NurseScheduler.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public byte[]? PasswordHash { get; set; }
        public byte[]? PasswordSalt { get; set; }
        public string? GoogleId { get; set; }
        public Role Role { get; set; }
        public bool IsProfileComplete { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}