using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;
using NurseSchedulerAPI.Services;
using System.Security.Claims;

namespace NurseSchedulerAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StaffController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ExcelService _excelService;
        private readonly ILogger<StaffController> _logger;

        public StaffController(
            ApplicationDbContext context,
            ExcelService excelService,
            ILogger<StaffController> logger)
        {
            _context = context;
            _excelService = excelService;
            _logger = logger;
        }

        /// <summary>
        /// Ottiene l'elenco di tutto il personale
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Staff>>> GetAllStaff([FromQuery] Role? role = null)
        {
            try
            {
                var query = _context.Staff.Include(s => s.User).AsQueryable();
                
                if (role.HasValue)
                {
                    query = query.Where(s => s.Role == role.Value);
                }
                
                var staff = await query.ToListAsync();
                return Ok(staff);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving staff list");
                return StatusCode(500, new { message = "An error occurred while retrieving staff list" });
            }
        }

        /// <summary>
        /// Ottiene un membro del personale tramite ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Staff>> GetStaffById(int id)
        {
            try
            {
                var staff = await _context.Staff
                    .Include(s => s.User)
                    .FirstOrDefaultAsync(s => s.Id == id);
                
                if (staff == null)
                {
                    return NotFound(new { message = $"Staff with ID {id} not found" });
                }
                
                return Ok(staff);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving staff with ID {id}");
                return StatusCode(500, new { message = "An error occurred while retrieving staff" });
            }
        }

        /// <summary>
        /// Crea un nuovo membro del personale
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "HeadNurse")]
        public async Task<ActionResult<Staff>> CreateStaff([FromBody] CreateStaffModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Verifica se l'utente esiste
                var user = await _context.Users.FindAsync(model.UserId);
                if (user == null)
                {
                    return BadRequest(new { message = $"User with ID {model.UserId} not found" });
                }

                // Verifica se esiste già uno staff con lo stesso UserId
                var existingStaff = await _context.Staff.FirstOrDefaultAsync(s => s.UserId == model.UserId);
                if (existingStaff != null)
                {
                    return BadRequest(new { message = $"A staff member is already associated with user ID {model.UserId}" });
                }

                var staff = new Staff
                {
                    UserId = model.UserId,
                    Name = model.Name,
                    Role = model.Role,
                    Department = model.Department,
                    WorkingPercentage = model.WorkingPercentage,
                    YearsOfExperience = model.YearsOfExperience,
                    AvailableForExtraShifts = model.AvailableForExtraShifts,
                    EmergencyContact = model.EmergencyContact
                };

                _context.Staff.Add(staff);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetStaffById), new { id = staff.Id }, staff);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating staff member");
                return StatusCode(500, new { message = "An error occurred while creating staff member" });
            }
        }

        /// <summary>
        /// Aggiorna un membro del personale esistente
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "HeadNurse")]
        public async Task<IActionResult> UpdateStaff(int id, [FromBody] UpdateStaffModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var staff = await _context.Staff.FindAsync(id);
                if (staff == null)
                {
                    return NotFound(new { message = $"Staff with ID {id} not found" });
                }

                // Aggiorna i campi
                staff.Name = model.Name;
                staff.Role = model.Role;
                staff.Department = model.Department;
                staff.WorkingPercentage = model.WorkingPercentage;
                staff.YearsOfExperience = model.YearsOfExperience;
                staff.AvailableForExtraShifts = model.AvailableForExtraShifts;
                staff.EmergencyContact = model.EmergencyContact;

                _context.Entry(staff).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating staff with ID {id}");
                return StatusCode(500, new { message = "An error occurred while updating staff member" });
            }
        }

        /// <summary>
        /// Elimina un membro del personale
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "HeadNurse")]
        public async Task<IActionResult> DeleteStaff(int id)
        {
            try
            {
                var staff = await _context.Staff.FindAsync(id);
                if (staff == null)
                {
                    return NotFound(new { message = $"Staff with ID {id} not found" });
                }

                _context.Staff.Remove(staff);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting staff with ID {id}");
                return StatusCode(500, new { message = "An error occurred while deleting staff member" });
            }
        }

        /// <summary>
        /// Importa personale da un file Excel
        /// </summary>
        [HttpPost("import")]
        [Authorize(Roles = "HeadNurse")]
        public async Task<IActionResult> ImportStaffFromExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file was uploaded" });
            }

            // Controlla il tipo di file
            if (!file.ContentType.Contains("excel") && 
                !file.ContentType.Contains("spreadsheet") &&
                !file.FileName.EndsWith(".xlsx") && 
                !file.FileName.EndsWith(".xls"))
            {
                return BadRequest(new { message = "The file is not an Excel file" });
            }

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                using (var stream = file.OpenReadStream())
                {
                    var result = await _excelService.ImportStaffFromExcelAsync(stream, userId);
                    return Ok(result);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing staff from Excel");
                return StatusCode(500, new { message = "An error occurred while importing staff from Excel" });
            }
        }

        /// <summary>
        /// Esporta personale in un file Excel
        /// </summary>
        [HttpGet("export")]
        [Authorize(Roles = "HeadNurse")]
        public async Task<IActionResult> ExportStaffToExcel([FromQuery] Role? role = null)
        {
            try
            {
                var stream = await _excelService.ExportStaffToExcelAsync(role);
                
                // Imposta il nome del file in base al ruolo
                string fileName = role.HasValue 
                    ? $"staff_{role.Value.ToString().ToLower()}_{DateTime.Now:yyyyMMdd}.xlsx"
                    : $"staff_all_{DateTime.Now:yyyyMMdd}.xlsx";
                
                return File(
                    fileContents: stream,
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileDownloadName: fileName
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting staff to Excel");
                return StatusCode(500, new { message = "An error occurred while exporting staff to Excel" });
            }
        }

        /// <summary>
        /// Ottiene un template Excel vuoto per l'importazione del personale
        /// </summary>
        [HttpGet("template")]
        [Authorize(Roles = "HeadNurse")]
        public IActionResult GetStaffTemplate()
        {
            try
            {
                var stream = _excelService.ExportStaffTemplateExcel();
                return File(
                    fileContents: stream,
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileDownloadName: "staff_template.xlsx"
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating staff template");
                return StatusCode(500, new { message = "An error occurred while generating staff template" });
            }
        }
    }

    public class CreateStaffModel
    {
        public int UserId { get; set; }
        public string Name { get; set; } = "";
        public Role Role { get; set; }
        public string? Department { get; set; }
        public int WorkingPercentage { get; set; } = 100;
        public int YearsOfExperience { get; set; } = 0;
        public bool AvailableForExtraShifts { get; set; } = false;
        public string? EmergencyContact { get; set; }
    }

    public class UpdateStaffModel
    {
        public string Name { get; set; } = "";
        public Role Role { get; set; }
        public string? Department { get; set; }
        public int WorkingPercentage { get; set; } = 100;
        public int YearsOfExperience { get; set; } = 0;
        public bool AvailableForExtraShifts { get; set; } = false;
        public string? EmergencyContact { get; set; }
    }
}