using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NurseSchedulerAPI.Models
{
    /// <summary>
    /// Memorizza i dati relativi a una generazione di turni
    /// </summary>
    public class ScheduleGeneration
    {
        [Key]
        public int Id { get; set; }
        
        [ForeignKey("GeneratedBy")]
        public int GeneratedById { get; set; }
        
        [Required]
        [DataType(DataType.Date)]
        public DateTime StartDate { get; set; }
        
        [Required]
        [DataType(DataType.Date)]
        public DateTime EndDate { get; set; }
        
        [Required]
        public Role StaffType { get; set; }
        
        // Parametri di ottimizzazione utilizzati nella generazione
        [StringLength(2000)]
        public string? OptimizationParameters { get; set; }
        
        // Punteggio di qualità della pianificazione generata
        public double? QualityScore { get; set; }
        
        // Numero di vincoli violati
        public int? ConstraintsViolated { get; set; } = 0;
        
        // Tempo impiegato per la generazione (in secondi)
        public double? GenerationTime { get; set; }
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Relazioni di navigazione
        public virtual Staff? GeneratedBy { get; set; }
    }
}