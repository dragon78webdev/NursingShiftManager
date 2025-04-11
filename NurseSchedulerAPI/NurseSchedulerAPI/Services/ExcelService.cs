using OfficeOpenXml;
using NurseSchedulerAPI.Models;
using NurseSchedulerAPI.Data;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace NurseSchedulerAPI.Services
{
    public class ExcelService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ExcelService> _logger;

        public ExcelService(
            ApplicationDbContext context,
            ILogger<ExcelService> logger)
        {
            _context = context;
            _logger = logger;
            
            // Licenza LicenseContext per EPPlus
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
        }

        /// <summary>
        /// Importa il personale da un file Excel
        /// </summary>
        /// <param name="stream">Stream del file Excel</param>
        /// <param name="headNurseId">ID del caposala che effettua l'importazione</param>
        /// <returns>Risultato dell'importazione con conteggi e logs</returns>
        public async Task<ImportResult> ImportStaffFromExcelAsync(Stream stream, int headNurseId)
        {
            var result = new ImportResult
            {
                Success = true,
                Message = "Importazione completata con successo",
                TotalRecords = 0,
                ImportedRecords = 0,
                SkippedRecords = 0,
                Logs = new List<string>()
            };

            try
            {
                using (var package = new ExcelPackage(stream))
                {
                    var worksheet = package.Workbook.Worksheets[0]; // Prende il primo foglio
                    
                    if (worksheet == null)
                    {
                        result.Success = false;
                        result.Message = "Il file Excel non contiene fogli di lavoro";
                        return result;
                    }

                    int rows = worksheet.Dimension.Rows;
                    result.TotalRecords = rows - 1; // Esclude la riga di intestazione

                    // Verifica le intestazioni
                    var requiredHeaders = new Dictionary<string, int>
                    {
                        { "Nome", -1 },
                        { "Email", -1 },
                        { "Ruolo", -1 },
                        { "Reparto", -1 },
                        { "PercentualeLavoro", -1 },
                        { "AnniEsperienza", -1 }
                    };

                    // Trova gli indici delle colonne
                    for (int col = 1; col <= worksheet.Dimension.Columns; col++)
                    {
                        string? headerValue = worksheet.Cells[1, col].Value?.ToString();
                        if (!string.IsNullOrEmpty(headerValue) && requiredHeaders.ContainsKey(headerValue))
                        {
                            requiredHeaders[headerValue] = col;
                        }
                    }

                    // Verifica se tutte le intestazioni richieste sono presenti
                    if (requiredHeaders.Values.Any(v => v == -1))
                    {
                        var missingHeaders = requiredHeaders
                            .Where(kv => kv.Value == -1)
                            .Select(kv => kv.Key)
                            .ToList();
                            
                        result.Success = false;
                        result.Message = $"Intestazioni mancanti: {string.Join(", ", missingHeaders)}";
                        return result;
                    }

                    // Legge le righe di dati
                    for (int row = 2; row <= rows; row++) // Inizia dalla seconda riga (dopo le intestazioni)
                    {
                        try
                        {
                            string name = GetCellValue(worksheet, row, requiredHeaders["Nome"]);
                            string email = GetCellValue(worksheet, row, requiredHeaders["Email"]);
                            string roleStr = GetCellValue(worksheet, row, requiredHeaders["Ruolo"]);
                            string department = GetCellValue(worksheet, row, requiredHeaders["Reparto"]);
                            
                            // Valori opzionali con default
                            int workingPercentage = GetCellValueInt(worksheet, row, requiredHeaders["PercentualeLavoro"], 100);
                            int yearsOfExperience = GetCellValueInt(worksheet, row, requiredHeaders["AnniEsperienza"], 0);

                            // Validazione dati
                            if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(email))
                            {
                                result.SkippedRecords++;
                                result.Logs.Add($"Riga {row}: Saltata - Nome o Email mancante");
                                continue;
                            }

                            // Converte la stringa del ruolo nell'enum Role
                            if (!TryParseRole(roleStr, out Role role))
                            {
                                result.SkippedRecords++;
                                result.Logs.Add($"Riga {row}: Saltata - Ruolo '{roleStr}' non valido");
                                continue;
                            }

                            // Verifica se l'utente esiste già (per email)
                            var existingUser = await _context.Users
                                .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());

                            if (existingUser != null)
                            {
                                // Verifica se lo staff associato esiste già
                                var existingStaff = await _context.Staff
                                    .FirstOrDefaultAsync(s => s.UserId == existingUser.Id);

                                if (existingStaff != null)
                                {
                                    // Aggiorna i dati dello staff esistente
                                    existingStaff.Name = name;
                                    existingStaff.Role = role;
                                    existingStaff.Department = department;
                                    existingStaff.WorkingPercentage = workingPercentage;
                                    existingStaff.YearsOfExperience = yearsOfExperience;

                                    result.ImportedRecords++;
                                    result.Logs.Add($"Riga {row}: Aggiornato - {name} ({email})");
                                }
                                else
                                {
                                    // Crea un nuovo staff per l'utente esistente
                                    var newStaff = new Staff
                                    {
                                        UserId = existingUser.Id,
                                        Name = name,
                                        Role = role,
                                        Department = department,
                                        WorkingPercentage = workingPercentage,
                                        YearsOfExperience = yearsOfExperience
                                    };

                                    _context.Staff.Add(newStaff);
                                    result.ImportedRecords++;
                                    result.Logs.Add($"Riga {row}: Creato staff per utente esistente - {name} ({email})");
                                }
                            }
                            else
                            {
                                // Crea un nuovo utente
                                var newUser = new User
                                {
                                    Name = name,
                                    Email = email,
                                    Role = role,
                                    CreatedAt = DateTime.UtcNow,
                                    IsActive = true
                                };

                                _context.Users.Add(newUser);
                                await _context.SaveChangesAsync(); // Salva per ottenere l'ID dell'utente

                                // Crea un nuovo staff
                                var newStaff = new Staff
                                {
                                    UserId = newUser.Id,
                                    Name = name,
                                    Role = role,
                                    Department = department,
                                    WorkingPercentage = workingPercentage,
                                    YearsOfExperience = yearsOfExperience
                                };

                                _context.Staff.Add(newStaff);
                                result.ImportedRecords++;
                                result.Logs.Add($"Riga {row}: Creato nuovo utente e staff - {name} ({email})");
                            }
                        }
                        catch (Exception ex)
                        {
                            result.SkippedRecords++;
                            result.Logs.Add($"Riga {row}: Errore - {ex.Message}");
                            _logger.LogError(ex, $"Errore durante l'importazione della riga {row}");
                        }
                    }

                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = $"Errore durante l'importazione: {ex.Message}";
                _logger.LogError(ex, "Errore durante l'importazione del personale da Excel");
            }

            return result;
        }

        /// <summary>
        /// Esporta il personale in un file Excel
        /// </summary>
        /// <param name="staffType">Tipo di personale da esportare (opzionale)</param>
        /// <returns>Stream del file Excel</returns>
        public async Task<Stream> ExportStaffToExcelAsync(Role? staffType = null)
        {
            try
            {
                // Recupera il personale dal database
                var query = _context.Staff.AsQueryable();
                
                if (staffType.HasValue)
                {
                    query = query.Where(s => s.Role == staffType.Value);
                }
                
                var staffList = await query
                    .Include(s => s.User)
                    .OrderBy(s => s.Name)
                    .ToListAsync();

                using (var package = new ExcelPackage())
                {
                    var worksheet = package.Workbook.Worksheets.Add("Personale");
                    
                    // Intestazioni
                    worksheet.Cells[1, 1].Value = "Nome";
                    worksheet.Cells[1, 2].Value = "Email";
                    worksheet.Cells[1, 3].Value = "Ruolo";
                    worksheet.Cells[1, 4].Value = "Reparto";
                    worksheet.Cells[1, 5].Value = "PercentualeLavoro";
                    worksheet.Cells[1, 6].Value = "AnniEsperienza";
                    worksheet.Cells[1, 7].Value = "DisponibilePerTurniExtra";

                    // Stile intestazioni
                    using (var range = worksheet.Cells[1, 1, 1, 7])
                    {
                        range.Style.Font.Bold = true;
                        range.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                        range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
                    }

                    // Dati
                    int row = 2;
                    foreach (var staff in staffList)
                    {
                        worksheet.Cells[row, 1].Value = staff.Name;
                        worksheet.Cells[row, 2].Value = staff.User?.Email ?? "";
                        worksheet.Cells[row, 3].Value = staff.Role.ToString();
                        worksheet.Cells[row, 4].Value = staff.Department ?? "";
                        worksheet.Cells[row, 5].Value = staff.WorkingPercentage;
                        worksheet.Cells[row, 6].Value = staff.YearsOfExperience;
                        worksheet.Cells[row, 7].Value = staff.AvailableForExtraShifts ? "Sì" : "No";
                        
                        row++;
                    }

                    // Auto-adatta le colonne
                    worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();

                    // Ritorna il file come stream
                    var stream = new MemoryStream();
                    package.SaveAs(stream);
                    stream.Position = 0;
                    return stream;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore durante l'esportazione del personale in Excel");
                throw;
            }
        }

        /// <summary>
        /// Esporta un template Excel vuoto per l'importazione del personale
        /// </summary>
        /// <returns>Stream del file Excel template</returns>
        public Stream ExportStaffTemplateExcel()
        {
            try
            {
                using (var package = new ExcelPackage())
                {
                    var worksheet = package.Workbook.Worksheets.Add("Template_Personale");
                    
                    // Intestazioni
                    worksheet.Cells[1, 1].Value = "Nome";
                    worksheet.Cells[1, 2].Value = "Email";
                    worksheet.Cells[1, 3].Value = "Ruolo";
                    worksheet.Cells[1, 4].Value = "Reparto";
                    worksheet.Cells[1, 5].Value = "PercentualeLavoro";
                    worksheet.Cells[1, 6].Value = "AnniEsperienza";

                    // Stile intestazioni
                    using (var range = worksheet.Cells[1, 1, 1, 6])
                    {
                        range.Style.Font.Bold = true;
                        range.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                        range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
                    }

                    // Esempio di dati
                    worksheet.Cells[2, 1].Value = "Mario Rossi";
                    worksheet.Cells[2, 2].Value = "mario.rossi@esempio.it";
                    worksheet.Cells[2, 3].Value = "Nurse";
                    worksheet.Cells[2, 4].Value = "Cardiologia";
                    worksheet.Cells[2, 5].Value = 100;
                    worksheet.Cells[2, 6].Value = 5;

                    worksheet.Cells[3, 1].Value = "Luigi Bianchi";
                    worksheet.Cells[3, 2].Value = "luigi.bianchi@esempio.it";
                    worksheet.Cells[3, 3].Value = "OSS";
                    worksheet.Cells[3, 4].Value = "Ortopedia";
                    worksheet.Cells[3, 5].Value = 75;
                    worksheet.Cells[3, 6].Value = 2;

                    // Aggiunge commenti alle intestazioni
                    worksheet.Cells[1, 1].AddComment("Nome completo del membro dello staff", "Sistema");
                    worksheet.Cells[1, 2].AddComment("Email istituzionale", "Sistema");
                    worksheet.Cells[1, 3].AddComment("Ruolo: 'Nurse', 'OSS' o 'HeadNurse'", "Sistema");
                    worksheet.Cells[1, 4].AddComment("Reparto di appartenenza", "Sistema");
                    worksheet.Cells[1, 5].AddComment("Percentuale di lavoro (es. 100 per tempo pieno, 50 per part-time 50%)", "Sistema");
                    worksheet.Cells[1, 6].AddComment("Anni di esperienza lavorativa", "Sistema");

                    // Auto-adatta le colonne
                    worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();

                    // Ritorna il file come stream
                    var stream = new MemoryStream();
                    package.SaveAs(stream);
                    stream.Position = 0;
                    return stream;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore durante la creazione del template Excel");
                throw;
            }
        }

        /// <summary>
        /// Ottiene il valore di una cella come stringa
        /// </summary>
        private string GetCellValue(ExcelWorksheet worksheet, int row, int col)
        {
            var cell = worksheet.Cells[row, col];
            return cell.Value?.ToString()?.Trim() ?? string.Empty;
        }

        /// <summary>
        /// Ottiene il valore di una cella come intero
        /// </summary>
        private int GetCellValueInt(ExcelWorksheet worksheet, int row, int col, int defaultValue)
        {
            var cell = worksheet.Cells[row, col];
            if (cell.Value == null)
                return defaultValue;

            if (int.TryParse(cell.Value.ToString(), out int value))
                return value;

            return defaultValue;
        }

        /// <summary>
        /// Converte una stringa nel corrispondente valore enum Role
        /// </summary>
        private bool TryParseRole(string roleStr, out Role role)
        {
            if (string.IsNullOrEmpty(roleStr))
            {
                role = Role.Nurse; // Default
                return false;
            }

            // Normalizza la stringa per gestire differenze di maiuscole/minuscole e accenti
            roleStr = roleStr.Trim().ToLowerInvariant();

            if (roleStr == "nurse" || roleStr == "infermiere" || roleStr == "infermiera")
            {
                role = Role.Nurse;
                return true;
            }
            else if (roleStr == "oss" || roleStr == "operatore socio sanitario")
            {
                role = Role.OSS;
                return true;
            }
            else if (roleStr == "headnurse" || roleStr == "caposala" || roleStr == "coordinatore")
            {
                role = Role.HeadNurse;
                return true;
            }

            role = Role.Nurse; // Default
            return false;
        }
    }

    /// <summary>
    /// Classe per i risultati dell'importazione
    /// </summary>
    public class ImportResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = "";
        public int TotalRecords { get; set; }
        public int ImportedRecords { get; set; }
        public int SkippedRecords { get; set; }
        public List<string> Logs { get; set; } = new List<string>();

        public string GetLogsAsString()
        {
            var sb = new StringBuilder();
            foreach (var log in Logs)
            {
                sb.AppendLine(log);
            }
            return sb.ToString();
        }
    }
}