using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NurseSchedulerAPI.Models
{
    /// <summary>
    /// Rappresenta un membro del personale sanitario (infermiere, OSS, caposala)
    /// </summary>
    public class Staff
    {
        [Key]
        public int Id { get; set; }
        
        [ForeignKey("User")]
        public int UserId { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public Role Role { get; set; }
        
        [StringLength(100)]
        public string? Department { get; set; }
        
        // Indica se il personale è a tempo pieno o parziale (es. 100%, 75%, 50%)
        [Range(0, 100)]
        public int WorkingPercentage { get; set; } = 100;
        
        // Numero di anni di esperienza
        public int YearsOfExperience { get; set; } = 0;
        
        // Indica se il personale è disponibile per eventuali turni extra
        public bool AvailableForExtraShifts { get; set; } = false;
        
        // Contatti di emergenza
        [Phone]
        public string? EmergencyContact { get; set; }
        
        // Relazioni di navigazione
        public virtual User? User { get; set; }
        public virtual ICollection<Shift> Shifts { get; set; } = new List<Shift>();
        public virtual ICollection<Vacation> Vacations { get; set; } = new List<Vacation>();
        public virtual ICollection<ChangeRequest> ChangeRequests { get; set; } = new List<ChangeRequest>();
        
        // Deleghe (solo per capisala)
        [InverseProperty("HeadNurse")]
        public virtual ICollection<Delegation> HeadNurseDelegations { get; set; } = new List<Delegation>();
        
        [InverseProperty("DelegatedTo")]
        public virtual ICollection<Delegation> DelegatedToDelegations { get; set; } = new List<Delegation>();
    }
}