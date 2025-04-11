using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NPOI.SS.UserModel;
using NPOI.XSSF.UserModel;
using NurseScheduler.Models;
using NurseScheduler.Services;

namespace NurseScheduler.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ImportController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly IUserService _userService;
        private readonly ILogger<ImportController> _logger;

        public ImportController(
            IUserRepository userRepository,
            IStaffRepository staffRepository,
            IUserService userService,
            ILogger<ImportController> logger)
        {
            _userRepository = userRepository;
            _staffRepository = staffRepository;
            _userService = userService;
            _logger = logger;
        }

        [HttpPost("staff")]
        public async Task<IActionResult> ImportStaff([FromForm] ImportStaffRequest request)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                if (request.File == null || request.File.Length == 0)
                    return BadRequest(new { message = "No file was uploaded" });
                
                // Check file extension
                var fileExtension = Path.GetExtension(request.File.FileName).ToLower();
                if (fileExtension != ".xlsx" && fileExtension != ".xls")
                    return BadRequest(new { message = "Only Excel files (.xlsx, .xls) are supported" });
                
                using var stream = request.File.OpenReadStream();
                
                // Create a new Excel workbook
                IWorkbook workbook;
                if (fileExtension == ".xlsx")
                    workbook = new XSSFWorkbook(stream);
                else
                    throw new NotSupportedException("Only .xlsx format is supported");
                
                // Get the first sheet
                var sheet = workbook.GetSheetAt(0);
                
                if (sheet == null)
                    return BadRequest(new { message = "Excel file is empty or corrupted" });
                
                var staffList = new List<StaffImportDto>();
                var errors = new List<string>();
                
                // Skip header row
                for (int i = 1; i <= sheet.LastRowNum; i++)
                {
                    var row = sheet.GetRow(i);
                    if (row == null)
                        continue;
                    
                    try
                    {
                        var staffDto = new StaffImportDto
                        {
                            Email = GetCellValue(row.GetCell(0)),
                            FirstName = GetCellValue(row.GetCell(1)),
                            LastName = GetCellValue(row.GetCell(2)),
                            Role = ParseRole(GetCellValue(row.GetCell(3))),
                            Department = GetCellValue(row.GetCell(4)),
                            IsPartTime = ParseBool(GetCellValue(row.GetCell(5))),
                            WeeklyHours = ParseInt(GetCellValue(row.GetCell(6))),
                            Qualification = GetCellValue(row.GetCell(7))
                        };
                        
                        // Validate required fields
                        if (string.IsNullOrEmpty(staffDto.Email) || string.IsNullOrEmpty(staffDto.FirstName) || 
                            string.IsNullOrEmpty(staffDto.LastName))
                        {
                            errors.Add($"Row {i+1}: Email, first name, and last name are required");
                            continue;
                        }
                        
                        staffList.Add(staffDto);
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"Row {i+1}: {ex.Message}");
                    }
                }
                
                if (staffList.Count == 0)
                    return BadRequest(new { message = "No valid staff members found in the Excel file", errors });
                
                // Process the imported staff
                var importedCount = 0;
                var updatedCount = 0;
                
                foreach (var staffDto in staffList)
                {
                    try
                    {
                        // Check if user with this email already exists
                        var existingUser = await _userRepository.GetByEmailAsync(staffDto.Email);
                        
                        if (existingUser != null)
                        {
                            // Update existing user
                            existingUser.FirstName = staffDto.FirstName;
                            existingUser.LastName = staffDto.LastName;
                            existingUser.Role = staffDto.Role;
                            existingUser.IsProfileComplete = true;
                            
                            await _userRepository.UpdateAsync(existingUser);
                            
                            // Update or create staff record
                            var existingStaff = await _staffRepository.GetByUserIdAsync(existingUser.Id);
                            
                            if (existingStaff != null)
                            {
                                existingStaff.Department = staffDto.Department;
                                existingStaff.IsPartTime = staffDto.IsPartTime;
                                existingStaff.WeeklyHours = staffDto.WeeklyHours;
                                existingStaff.Qualification = staffDto.Qualification;
                                
                                await _staffRepository.UpdateAsync(existingStaff);
                            }
                            else
                            {
                                var newStaff = new Staff
                                {
                                    UserId = existingUser.Id,
                                    Department = staffDto.Department,
                                    IsPartTime = staffDto.IsPartTime,
                                    WeeklyHours = staffDto.WeeklyHours,
                                    Qualification = staffDto.Qualification,
                                    JoinDate = DateTime.UtcNow,
                                    IsActive = true
                                };
                                
                                await _staffRepository.CreateAsync(newStaff);
                            }
                            
                            updatedCount++;
                        }
                        else
                        {
                            // Create new user
                            var newUser = new User
                            {
                                Email = staffDto.Email,
                                FirstName = staffDto.FirstName,
                                LastName = staffDto.LastName,
                                Role = staffDto.Role,
                                IsProfileComplete = true,
                                CreatedAt = DateTime.UtcNow
                            };
                            
                            // Generate a random temporary password
                            var tempPassword = Guid.NewGuid().ToString().Substring(0, 8);
                            
                            // Register the user
                            await _userRepository.CreateAsync(newUser);
                            
                            // Get the newly created user to get the ID
                            var createdUser = await _userRepository.GetByEmailAsync(staffDto.Email);
                            
                            if (createdUser != null)
                            {
                                // Create staff record
                                var newStaff = new Staff
                                {
                                    UserId = createdUser.Id,
                                    Department = staffDto.Department,
                                    IsPartTime = staffDto.IsPartTime,
                                    WeeklyHours = staffDto.WeeklyHours,
                                    Qualification = staffDto.Qualification,
                                    JoinDate = DateTime.UtcNow,
                                    IsActive = true
                                };
                                
                                await _staffRepository.CreateAsync(newStaff);
                                
                                importedCount++;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"Error processing {staffDto.Email}: {ex.Message}");
                    }
                }
                
                return Ok(new 
                { 
                    message = "Import completed", 
                    imported = importedCount, 
                    updated = updatedCount, 
                    errors 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing staff");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error importing staff" });
            }
        }

        [HttpPost("staff/manual")]
        public async Task<IActionResult> AddStaffManually([FromBody] StaffImportDto request)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                // Validate required fields
                if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.FirstName) || 
                    string.IsNullOrEmpty(request.LastName))
                {
                    return BadRequest(new { message = "Email, first name, and last name are required" });
                }
                
                // Check if user with this email already exists
                var existingUser = await _userRepository.GetByEmailAsync(request.Email);
                
                if (existingUser != null)
                {
                    // Update existing user
                    existingUser.FirstName = request.FirstName;
                    existingUser.LastName = request.LastName;
                    existingUser.Role = request.Role;
                    existingUser.IsProfileComplete = true;
                    
                    await _userRepository.UpdateAsync(existingUser);
                    
                    // Update or create staff record
                    var existingStaff = await _staffRepository.GetByUserIdAsync(existingUser.Id);
                    
                    if (existingStaff != null)
                    {
                        existingStaff.Department = request.Department;
                        existingStaff.IsPartTime = request.IsPartTime;
                        existingStaff.WeeklyHours = request.WeeklyHours;
                        existingStaff.Qualification = request.Qualification;
                        
                        await _staffRepository.UpdateAsync(existingStaff);
                    }
                    else
                    {
                        var newStaff = new Staff
                        {
                            UserId = existingUser.Id,
                            Department = request.Department,
                            IsPartTime = request.IsPartTime,
                            WeeklyHours = request.WeeklyHours,
                            Qualification = request.Qualification,
                            JoinDate = DateTime.UtcNow,
                            IsActive = true
                        };
                        
                        await _staffRepository.CreateAsync(newStaff);
                    }
                    
                    return Ok(new { message = "Staff member updated successfully" });
                }
                else
                {
                    // Create new user
                    var newUser = new User
                    {
                        Email = request.Email,
                        FirstName = request.FirstName,
                        LastName = request.LastName,
                        Role = request.Role,
                        IsProfileComplete = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    
                    // Generate a random temporary password
                    var tempPassword = Guid.NewGuid().ToString().Substring(0, 8);
                    
                    // Register the user
                    var userId2 = await _userRepository.CreateAsync(newUser);
                    
                    // Create staff record
                    var newStaff = new Staff
                    {
                        UserId = userId2,
                        Department = request.Department,
                        IsPartTime = request.IsPartTime,
                        WeeklyHours = request.WeeklyHours,
                        Qualification = request.Qualification,
                        JoinDate = DateTime.UtcNow,
                        IsActive = true
                    };
                    
                    await _staffRepository.CreateAsync(newStaff);
                    
                    return Ok(new 
                    { 
                        message = "Staff member added successfully",
                        tempPassword // In a real app, you would email this to the user
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding staff manually");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error adding staff member" });
            }
        }

        private string GetCellValue(ICell? cell)
        {
            if (cell == null)
                return string.Empty;
            
            switch (cell.CellType)
            {
                case CellType.Numeric:
                    return cell.NumericCellValue.ToString();
                case CellType.String:
                    return cell.StringCellValue;
                case CellType.Boolean:
                    return cell.BooleanCellValue.ToString();
                case CellType.Formula:
                    switch (cell.CachedFormulaResultType)
                    {
                        case CellType.Numeric:
                            return cell.NumericCellValue.ToString();
                        case CellType.String:
                            return cell.StringCellValue;
                        default:
                            return string.Empty;
                    }
                default:
                    return string.Empty;
            }
        }

        private Role ParseRole(string roleStr)
        {
            if (string.IsNullOrEmpty(roleStr))
                return Role.Nurse;
            
            roleStr = roleStr.Trim().ToLower();
            
            if (roleStr == "nurse" || roleStr == "infermiere" || roleStr == "infermiera")
                return Role.Nurse;
            else if (roleStr == "oss" || roleStr == "operatore socio sanitario")
                return Role.Oss;
            else if (roleStr == "head nurse" || roleStr == "caposala" || roleStr == "head_nurse")
                return Role.HeadNurse;
            else
                return Role.Nurse; // Default
        }

        private bool ParseBool(string boolStr)
        {
            if (string.IsNullOrEmpty(boolStr))
                return false;
            
            boolStr = boolStr.Trim().ToLower();
            
            return boolStr == "true" || boolStr == "yes" || boolStr == "si" || boolStr == "sì" || boolStr == "y" || boolStr == "1";
        }

        private int ParseInt(string intStr)
        {
            if (string.IsNullOrEmpty(intStr))
                return 0;
            
            if (int.TryParse(intStr, out int result))
                return result;
            
            return 0;
        }
    }

    public class ImportStaffRequest
    {
        public IFormFile File { get; set; } = null!;
    }

    public class StaffImportDto
    {
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public Role Role { get; set; }
        public string Department { get; set; } = string.Empty;
        public bool IsPartTime { get; set; }
        public int WeeklyHours { get; set; } = 40;
        public string? Qualification { get; set; }
    }
}