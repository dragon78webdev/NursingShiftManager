using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NurseSchedulerAPI.Models
{
    /// <summary>
    /// Rappresenta una delega di responsabilità da un caposala ad un altro infermiere
    /// </summary>
    public class Delegation
    {
        [Key]
        public int Id { get; set; }
        
        // Il caposala che delega
        [ForeignKey("HeadNurse")]
        public int HeadNurseId { get; set; }
        
        // L'infermiere a cui viene delegata l'autorità
        [ForeignKey("DelegatedTo")]
        public int DelegatedToId { get; set; }
        
        [Required]
        [DataType(DataType.Date)]
        public DateTime StartDate { get; set; }
        
        [DataType(DataType.Date)]
        public DateTime? EndDate { get; set; }
        
        // Indica se la delega è attiva
        public bool? Active { get; set; } = true;
        
        // Motivo della delega
        [StringLength(500)]
        public string? Reason { get; set; }
        
        // Livello di autorità (es. completa, solo approvazione ferie, ecc.)
        [StringLength(100)]
        public string? AuthorityLevel { get; set; } = "Full";
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Relazioni di navigazione
        public virtual Staff? HeadNurse { get; set; }
        public virtual Staff? DelegatedTo { get; set; }
        
        [NotMapped]
        public string? HeadNurseName => HeadNurse?.Name;
        
        [NotMapped]
        public string? DelegatedToName => DelegatedTo?.Name;
    }
}