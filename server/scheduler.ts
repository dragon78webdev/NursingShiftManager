import { Shift, ShiftType, Staff, Vacation, Role } from '@shared/schema';
import { storage } from './storage';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Function to generate shifts for a date range
export async function generateSchedule(
  startDate: Date,
  endDate: Date,
  staffType: Role,
  considerVacations = true,
  considerPartTime = true,
  balanceShifts = true
): Promise<Shift[]> {
  // Get all staff of the specified type
  const staffList = await storage.listStaffByRole(staffType);
  
  // Get vacations that overlap with the date range if considerVacations is true
  const vacations = considerVacations
    ? await storage.listVacationsByDateRange(startDate, endDate)
    : [];
  
  // Calculate number of days in the range
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Create an array of dates in the range
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  
  // Track shift counts for each staff member to ensure balance
  const shiftCounts: Record<number, Record<ShiftType, number>> = {};
  staffList.forEach(staff => {
    shiftCounts[staff.id] = {
      'M': 0,
      'P': 0,
      'N': 0,
      'R': 0,
      'F': 0
    };
  });
  
  // First pass: assign vacation days as 'F' shifts
  const generatedShifts: Shift[] = [];
  
  if (considerVacations) {
    for (const vacation of vacations) {
      const staffId = vacation.staffId;
      const vacStart = new Date(vacation.startDate);
      const vacEnd = new Date(vacation.endDate);
      
      // For each day in the vacation range that falls within our schedule range
      for (const date of dates) {
        if (date >= vacStart && date <= vacEnd) {
          const shift: Shift = {
            id: 0, // Will be set by storage
            staffId,
            date: new Date(date),
            shiftType: 'F',
            changed: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          generatedShifts.push(shift);
          shiftCounts[staffId]['F']++;
        }
      }
    }
  }
  
  // Second pass: generate shifts for each day and staff member
  for (const date of dates) {
    // Skip weekends if staff is part-time and considerPartTime is true
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    // For each staff member
    for (const staff of staffList) {
      // Skip if a vacation shift already exists for this date and staff
      const existingVacationShift = generatedShifts.find(
        s => s.staffId === staff.id && s.date.getTime() === date.getTime() && s.shiftType === 'F'
      );
      
      if (existingVacationShift) {
        continue;
      }
      
      // Skip weekend shifts for part-time staff if considerPartTime is true
      if (considerPartTime && staff.isPartTime && isWeekend) {
        const shift: Shift = {
          id: 0, // Will be set by storage
          staffId: staff.id,
          date: new Date(date),
          shiftType: 'R',
          changed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        generatedShifts.push(shift);
        shiftCounts[staff.id]['R']++;
        continue;
      }
      
      // Determine shift type - in real app this would be more sophisticated
      // For now, distribute shifts evenly with some rotation logic
      
      // Get counts of each shift type for this staff
      const counts = shiftCounts[staff.id];
      
      // Calculate total shifts
      const totalShifts = Object.values(counts).reduce((sum, count) => sum + count, 0);
      
      // Determine next shift type based on balancing
      let shiftType: ShiftType;
      
      if (balanceShifts) {
        // Calculate shift percentages
        const mPercent = counts['M'] / Math.max(1, totalShifts);
        const pPercent = counts['P'] / Math.max(1, totalShifts);
        const nPercent = counts['N'] / Math.max(1, totalShifts);
        
        // Assign shift based on lowest percentage
        if (mPercent <= pPercent && mPercent <= nPercent) {
          shiftType = 'M';
        } else if (pPercent <= mPercent && pPercent <= nPercent) {
          shiftType = 'P';
        } else {
          shiftType = 'N';
        }
        
        // Every 4th day should be a rest day
        if (totalShifts % 4 === 3) {
          shiftType = 'R';
        }
      } else {
        // Simple rotation: M -> P -> N -> R -> M -> ...
        const rotationSequence: ShiftType[] = ['M', 'P', 'N', 'R'];
        shiftType = rotationSequence[totalShifts % 4];
      }
      
      // Create the shift
      const shift: Shift = {
        id: 0, // Will be set by storage
        staffId: staff.id,
        date: new Date(date),
        shiftType,
        changed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      generatedShifts.push(shift);
      shiftCounts[staff.id][shiftType]++;
    }
  }
  
  // Store all generated shifts
  const storedShifts: Shift[] = [];
  for (const shift of generatedShifts) {
    const storedShift = await storage.createShift(shift);
    storedShifts.push(storedShift);
  }
  
  return storedShifts;
}

// Function to create a PDF of the schedule
export async function createPdf(
  shifts: Shift[], 
  startDate: Date, 
  endDate: Date, 
  title: string,
  staffType: Role
): Promise<Buffer> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  
  // Get the standard font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Set up some constants
  const margin = 50;
  const cellWidth = 30;
  const headerHeight = 25;
  const rowHeight = 20;
  
  // Draw title
  page.drawText(`Turni ${staffType === 'nurse' ? 'Infermieri' : 'OSS'}: ${title}`, {
    x: margin,
    y: page.getHeight() - margin,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  // Draw date range
  const formattedStartDate = startDate.toLocaleDateString('it-IT');
  const formattedEndDate = endDate.toLocaleDateString('it-IT');
  page.drawText(`Periodo: ${formattedStartDate} - ${formattedEndDate}`, {
    x: margin,
    y: page.getHeight() - margin - 25,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  
  // Get unique staff IDs from shifts
  const staffIds = [...new Set(shifts.map(shift => shift.staffId))];
  
  // Get all dates in range
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  
  // Calculate table dimensions
  const tableWidth = cellWidth * (days + 1);
  const tableHeight = headerHeight + rowHeight * staffIds.length;
  
  // Draw table header - dates
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const day = date.getDate().toString();
    const x = margin + cellWidth + i * cellWidth;
    const y = page.getHeight() - margin - 50 - headerHeight / 2;
    
    // Draw cell border
    page.drawRectangle({
      x: x - cellWidth / 2,
      y: y - headerHeight / 2,
      width: cellWidth,
      height: headerHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    // Draw date text
    page.drawText(day, {
      x: x - day.length * 3,
      y,
      size: 10,
      font: boldFont,
    });
  }
  
  // Get staff names (in real app, this would fetch from the database)
  const staffNames: Record<number, string> = {};
  for (const staffId of staffIds) {
    // For real implementation, get staff name from database
    staffNames[staffId] = `Staff ${staffId}`;
  }
  
  // Draw table rows - staff and shifts
  for (let i = 0; i < staffIds.length; i++) {
    const staffId = staffIds[i];
    const staffName = staffNames[staffId];
    const y = page.getHeight() - margin - 50 - headerHeight - i * rowHeight - rowHeight / 2;
    
    // Draw staff name cell
    page.drawRectangle({
      x: margin,
      y: y - rowHeight / 2,
      width: cellWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    page.drawText(staffName, {
      x: margin + 5,
      y: y - 4,
      size: 8,
      font,
    });
    
    // Draw shift cells for each date
    for (let j = 0; j < dates.length; j++) {
      const date = dates[j];
      const x = margin + cellWidth + j * cellWidth;
      
      // Find shift for this staff and date
      const shift = shifts.find(s => 
        s.staffId === staffId && 
        s.date.getFullYear() === date.getFullYear() &&
        s.date.getMonth() === date.getMonth() &&
        s.date.getDate() === date.getDate()
      );
      
      const shiftType = shift ? shift.shiftType : '';
      
      // Draw cell border
      page.drawRectangle({
        x: x - cellWidth / 2,
        y: y - rowHeight / 2,
        width: cellWidth,
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      
      // Set background color based on shift type
      if (shift) {
        let bgColor;
        switch (shift.shiftType) {
          case 'M':
            bgColor = rgb(0.8, 0.9, 1.0); // Light blue
            break;
          case 'P':
            bgColor = rgb(0.8, 1.0, 0.8); // Light green
            break;
          case 'N':
            bgColor = rgb(0.9, 0.8, 1.0); // Light purple
            break;
          case 'R':
            bgColor = rgb(0.9, 0.9, 0.9); // Light gray
            break;
          case 'F':
            bgColor = rgb(1.0, 0.9, 0.8); // Light yellow
            break;
          default:
            bgColor = rgb(1, 1, 1); // White
        }
        
        // Fill cell background
        page.drawRectangle({
          x: x - cellWidth / 2 + 0.5,
          y: y - rowHeight / 2 + 0.5,
          width: cellWidth - 1,
          height: rowHeight - 1,
          color: bgColor,
        });
      }
      
      // Draw shift type text
      if (shiftType) {
        page.drawText(shiftType, {
          x: x - 3,
          y: y - 4,
          size: 10,
          font: boldFont,
        });
      }
    }
  }
  
  // Draw legend
  const legendY = page.getHeight() - margin - 50 - headerHeight - staffIds.length * rowHeight - 40;
  page.drawText('Legenda:', {
    x: margin,
    y: legendY,
    size: 10,
    font: boldFont,
  });
  
  const legendItems = [
    { type: 'M', label: 'Mattina' },
    { type: 'P', label: 'Pomeriggio' },
    { type: 'N', label: 'Notte' },
    { type: 'R', label: 'Riposo' },
    { type: 'F', label: 'Ferie' },
  ];
  
  for (let i = 0; i < legendItems.length; i++) {
    const item = legendItems[i];
    const x = margin + i * 100;
    const y = legendY - 20;
    
    // Draw colored square
    let color;
    switch (item.type) {
      case 'M':
        color = rgb(0.8, 0.9, 1.0); // Light blue
        break;
      case 'P':
        color = rgb(0.8, 1.0, 0.8); // Light green
        break;
      case 'N':
        color = rgb(0.9, 0.8, 1.0); // Light purple
        break;
      case 'R':
        color = rgb(0.9, 0.9, 0.9); // Light gray
        break;
      case 'F':
        color = rgb(1.0, 0.9, 0.8); // Light yellow
        break;
    }
    
    page.drawRectangle({
      x,
      y,
      width: 15,
      height: 15,
      color,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    // Draw label
    page.drawText(`${item.type} - ${item.label}`, {
      x: x + 20,
      y: y + 4,
      size: 9,
      font,
    });
  }
  
  // Serialize the PDF document to bytes
  const pdfBytes = await pdfDoc.save();
  
  return Buffer.from(pdfBytes);
}
