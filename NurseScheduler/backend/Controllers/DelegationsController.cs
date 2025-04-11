using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NurseScheduler.Models;
using NurseScheduler.Services;

namespace NurseScheduler.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DelegationsController : ControllerBase
    {
        private readonly IDelegationService _delegationService;
        private readonly IUserService _userService;
        private readonly IUserRepository _userRepository;
        private readonly ILogger<DelegationsController> _logger;

        public DelegationsController(
            IDelegationService delegationService,
            IUserService userService,
            IUserRepository userRepository,
            ILogger<DelegationsController> logger)
        {
            _delegationService = delegationService;
            _userService = userService;
            _userRepository = userRepository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllDelegations()
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurse = await _userService.IsHeadNurseAsync(userId);
                
                if (!isHeadNurse)
                    return Forbid();
                
                var delegations = await _delegationService.GetAllDelegationsAsync();
                
                var delegationDtos = await Task.WhenAll(delegations.Select(async delegation => 
                {
                    var headNurse = await _userRepository.GetByIdAsync(delegation.HeadNurseId);
                    var delegateUser = await _userRepository.GetByIdAsync(delegation.DelegateId);
                    
                    return new DelegationDto
                    {
                        Id = delegation.Id,
                        HeadNurseId = delegation.HeadNurseId,
                        HeadNurseName = headNurse != null ? $"{headNurse.FirstName} {headNurse.LastName}" : "Unknown",
                        DelegateId = delegation.DelegateId,
                        DelegateName = delegateUser != null ? $"{delegateUser.FirstName} {delegateUser.LastName}" : "Unknown",
                        StartDate = delegation.StartDate,
                        EndDate = delegation.EndDate,
                        IsActive = delegation.StartDate <= DateTime.UtcNow && delegation.EndDate >= DateTime.UtcNow
                    };
                }));
                
                return Ok(delegationDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting delegations");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving delegations" });
            }
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveDelegations()
        {
            try
            {
                var delegations = await _delegationService.GetActiveDelegationsAsync();
                
                var delegationDtos = await Task.WhenAll(delegations.Select(async delegation => 
                {
                    var headNurse = await _userRepository.GetByIdAsync(delegation.HeadNurseId);
                    var delegateUser = await _userRepository.GetByIdAsync(delegation.DelegateId);
                    
                    return new DelegationDto
                    {
                        Id = delegation.Id,
                        HeadNurseId = delegation.HeadNurseId,
                        HeadNurseName = headNurse != null ? $"{headNurse.FirstName} {headNurse.LastName}" : "Unknown",
                        DelegateId = delegation.DelegateId,
                        DelegateName = delegateUser != null ? $"{delegateUser.FirstName} {delegateUser.LastName}" : "Unknown",
                        StartDate = delegation.StartDate,
                        EndDate = delegation.EndDate,
                        IsActive = true
                    };
                }));
                
                return Ok(delegationDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting active delegations");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving active delegations" });
            }
        }

        [HttpGet("head-nurse/{headNurseId}")]
        public async Task<IActionResult> GetDelegationsByHeadNurse(int headNurseId)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isSelf = userId == headNurseId;
                var isHeadNurse = await _userService.IsHeadNurseAsync(userId);
                
                if (!isHeadNurse && !isSelf)
                    return Forbid();
                
                var delegations = await _delegationService.GetDelegationsByHeadNurseIdAsync(headNurseId);
                
                var delegationDtos = await Task.WhenAll(delegations.Select(async delegation => 
                {
                    var headNurse = await _userRepository.GetByIdAsync(delegation.HeadNurseId);
                    var delegateUser = await _userRepository.GetByIdAsync(delegation.DelegateId);
                    
                    return new DelegationDto
                    {
                        Id = delegation.Id,
                        HeadNurseId = delegation.HeadNurseId,
                        HeadNurseName = headNurse != null ? $"{headNurse.FirstName} {headNurse.LastName}" : "Unknown",
                        DelegateId = delegation.DelegateId,
                        DelegateName = delegateUser != null ? $"{delegateUser.FirstName} {delegateUser.LastName}" : "Unknown",
                        StartDate = delegation.StartDate,
                        EndDate = delegation.EndDate,
                        IsActive = delegation.StartDate <= DateTime.UtcNow && delegation.EndDate >= DateTime.UtcNow
                    };
                }));
                
                return Ok(delegationDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting head nurse delegations");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving head nurse delegations" });
            }
        }

        [HttpGet("my-delegations")]
        public async Task<IActionResult> GetMyDelegations()
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurse = await _userService.IsHeadNurseAsync(userId);
                
                if (!isHeadNurse)
                    return BadRequest(new { message = "Only head nurses can delegate responsibilities" });
                
                var delegations = await _delegationService.GetDelegationsByHeadNurseIdAsync(userId);
                
                var delegationDtos = await Task.WhenAll(delegations.Select(async delegation => 
                {
                    var delegateUser = await _userRepository.GetByIdAsync(delegation.DelegateId);
                    
                    return new DelegationDto
                    {
                        Id = delegation.Id,
                        HeadNurseId = delegation.HeadNurseId,
                        HeadNurseName = "Me",
                        DelegateId = delegation.DelegateId,
                        DelegateName = delegateUser != null ? $"{delegateUser.FirstName} {delegateUser.LastName}" : "Unknown",
                        StartDate = delegation.StartDate,
                        EndDate = delegation.EndDate,
                        IsActive = delegation.StartDate <= DateTime.UtcNow && delegation.EndDate >= DateTime.UtcNow
                    };
                }));
                
                return Ok(delegationDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting my delegations");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving your delegations" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateDelegation([FromBody] CreateDelegationRequest request)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurse = await _userService.IsHeadNurseAsync(userId);
                
                if (!isHeadNurse)
                    return BadRequest(new { message = "Only head nurses can delegate responsibilities" });
                
                // Check if the delegate exists
                var delegateUser = await _userRepository.GetByIdAsync(request.DelegateId);
                if (delegateUser == null)
                    return NotFound(new { message = "Delegate user not found" });
                
                // Check if the dates are valid
                if (request.StartDate >= request.EndDate)
                    return BadRequest(new { message = "End date must be after start date" });
                
                var delegation = new Delegation
                {
                    HeadNurseId = userId,
                    DelegateId = request.DelegateId,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    CreatedAt = DateTime.UtcNow
                };
                
                var success = await _delegationService.CreateDelegationAsync(delegation);
                
                if (!success)
                    return BadRequest(new { message = "Error creating delegation" });
                
                return Ok(new { message = "Delegation created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating delegation");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error creating delegation" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDelegation(int id, [FromBody] UpdateDelegationRequest request)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurse = await _userService.IsHeadNurseAsync(userId);
                
                if (!isHeadNurse)
                    return BadRequest(new { message = "Only head nurses can update delegations" });
                
                // Get the existing delegation
                var delegation = await _delegationService.GetDelegationByIdAsync(id);
                if (delegation == null)
                    return NotFound(new { message = "Delegation not found" });
                
                // Ensure the head nurse is updating their own delegation
                if (delegation.HeadNurseId != userId)
                    return Forbid();
                
                // Check if the dates are valid
                if (request.StartDate >= request.EndDate)
                    return BadRequest(new { message = "End date must be after start date" });
                
                // Update the delegation
                delegation.StartDate = request.StartDate;
                delegation.EndDate = request.EndDate;
                
                // If delegate ID is provided, update it too
                if (request.DelegateId.HasValue)
                {
                    // Check if the delegate exists
                    var delegateUser = await _userRepository.GetByIdAsync(request.DelegateId.Value);
                    if (delegateUser == null)
                        return NotFound(new { message = "Delegate user not found" });
                    
                    delegation.DelegateId = request.DelegateId.Value;
                }
                
                var success = await _delegationService.UpdateDelegationAsync(delegation);
                
                if (!success)
                    return BadRequest(new { message = "Error updating delegation" });
                
                return Ok(new { message = "Delegation updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating delegation");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error updating delegation" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDelegation(int id)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurse = await _userService.IsHeadNurseAsync(userId);
                
                if (!isHeadNurse)
                    return BadRequest(new { message = "Only head nurses can delete delegations" });
                
                // Get the existing delegation
                var delegation = await _delegationService.GetDelegationByIdAsync(id);
                if (delegation == null)
                    return NotFound(new { message = "Delegation not found" });
                
                // Ensure the head nurse is deleting their own delegation
                if (delegation.HeadNurseId != userId)
                    return Forbid();
                
                var success = await _delegationService.DeleteDelegationAsync(id);
                
                if (!success)
                    return NotFound(new { message = "Delegation not found or could not be deleted" });
                
                return Ok(new { message = "Delegation deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting delegation");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error deleting delegation" });
            }
        }
    }

    public class DelegationDto
    {
        public int Id { get; set; }
        public int HeadNurseId { get; set; }
        public string HeadNurseName { get; set; } = string.Empty;
        public int DelegateId { get; set; }
        public string DelegateName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateDelegationRequest
    {
        public int DelegateId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class UpdateDelegationRequest
    {
        public int? DelegateId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }
}