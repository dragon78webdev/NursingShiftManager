import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Schedule, Staff, User, ScheduleSettings, ShiftType } from '@shared/schema';

type ScheduleWithStaff = Schedule & { staff: Staff & { user: User } };

// Function to map shift type to display value
function mapShiftTypeToDisplay(shiftType: ShiftType): string {
  switch (shiftType) {
    case ShiftType.MORNING:
      return 'M';
    case ShiftType.AFTERNOON:
      return 'P';
    case ShiftType.NIGHT:
      return 'N';
    case ShiftType.OFF:
      return 'R';
    case ShiftType.VACATION:
      return 'F';
    case ShiftType.SICK:
      return 'M';
    default:
      return '';
  }
}

// Function to map shift type to color
function getShiftColor(shiftType: ShiftType): [number, number, number] {
  switch (shiftType) {
    case ShiftType.MORNING:
      return [227, 242, 253]; // #E3F2FD
    case ShiftType.AFTERNOON:
      return [255, 248, 225]; // #FFF8E1
    case ShiftType.NIGHT:
      return [237, 231, 246]; // #EDE7F6
    case ShiftType.OFF:
      return [236, 239, 241]; // #ECEFF1
    case ShiftType.VACATION:
      return [232, 245, 233]; // #E8F5E9
    case ShiftType.SICK:
      return [255, 235, 238]; // #FFEBEE
    default:
      return [255, 255, 255]; // white
  }
}

export async function generatePDF(
  schedules: Schedule[],
  staffMembers: (Staff & { user: User })[],
  settings: ScheduleSettings
): Promise<ArrayBuffer> {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  // Set font and margins
  doc.setFont('helvetica');
  
  // Add title
  doc.setFontSize(18);
  doc.text('Pianificazione Turni', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  
  // Add subtitle with date range
  doc.setFontSize(12);
  const startDateStr = format(new Date(settings.startDate), 'dd/MM/yyyy', { locale: it });
  const endDateStr = format(new Date(settings.endDate), 'dd/MM/yyyy', { locale: it });
  doc.text(
    `Periodo: ${startDateStr} - ${endDateStr} | ${settings.staffType === 'nurse' ? 'Infermieri' : 'OSS'}`,
    doc.internal.pageSize.getWidth() / 2,
    23,
    { align: 'center' }
  );
  
  // Generate date headers
  const startDate = new Date(settings.startDate);
  const endDate = new Date(settings.endDate);
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Filter staff members by role
  const filteredStaff = staffMembers.filter(staff => 
    staff.user.role === settings.staffType
  );
  
  // Prepare table data
  const tableData = filteredStaff.map(staff => {
    const dataRow = [];
    
    // Add staff name and role
    dataRow.push([
      `${staff.user.name}`,
      `${staff.user.role === 'nurse' ? 'Infermiere' : 'OSS'}`
    ]);
    
    // Add shift data for each date
    for (const date of dates) {
      const dateKey = date.toISOString().split('T')[0];
      const staffSchedules = schedules.filter(s => 
        s.staffId === staff.id && 
        new Date(s.date).toISOString().split('T')[0] === dateKey
      );
      
      // If there's a schedule for this date, add the shift type
      if (staffSchedules.length > 0) {
        dataRow.push(mapShiftTypeToDisplay(staffSchedules[0].shiftType as ShiftType));
      } else {
        dataRow.push('');
      }
    }
    
    return dataRow;
  });
  
  // Format date headers
  const tableHeaders = ['Staff'];
  dates.forEach(date => {
    tableHeaders.push(format(date, 'EEE dd/MM', { locale: it }));
  });
  
  // Generate the table
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 30,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [33, 150, 243],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: {
        cellWidth: 40,
        fontStyle: 'bold'
      }
    },
    didDrawCell: (data) => {
      if (data.row.index >= 0 && data.column.index > 0 && data.section === 'body') {
        const cellData = tableData[data.row.index][data.column.index];
        if (cellData) {
          // Set background color based on shift type
          let shiftType;
          switch (cellData) {
            case 'M': shiftType = ShiftType.MORNING; break;
            case 'P': shiftType = ShiftType.AFTERNOON; break;
            case 'N': shiftType = ShiftType.NIGHT; break;
            case 'R': shiftType = ShiftType.OFF; break;
            case 'F': shiftType = ShiftType.VACATION; break;
            case 'M': shiftType = ShiftType.SICK; break;
            default: shiftType = ShiftType.OFF;
          }
          
          const [r, g, b] = getShiftColor(shiftType);
          
          // Fill cell with color
          doc.setFillColor(r, g, b);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          
          // Re-add text
          doc.setTextColor(0, 0, 0);
          doc.text(
            cellData,
            data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height / 2 + 1,
            { align: 'center', baseline: 'middle' }
          );
        }
      }
    }
  });
  
  // Add legend
  doc.setFontSize(8);
  const legendY = doc.lastAutoTable.finalY + 10;
  
  // Legend items
  const legendItems = [
    { text: 'M: Mattina', type: ShiftType.MORNING },
    { text: 'P: Pomeriggio', type: ShiftType.AFTERNOON },
    { text: 'N: Notte', type: ShiftType.NIGHT },
    { text: 'R: Riposo', type: ShiftType.OFF },
    { text: 'F: Ferie', type: ShiftType.VACATION },
    { text: 'M: Malattia', type: ShiftType.SICK }
  ];
  
  // Draw legend
  let legendX = 15;
  legendItems.forEach(item => {
    const [r, g, b] = getShiftColor(item.type);
    doc.setFillColor(r, g, b);
    doc.rect(legendX, legendY, 4, 4, 'F');
    doc.text(item.text, legendX + 6, legendY + 3);
    legendX += 30;
  });
  
  // Add footer with date and page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    
    // Generation date
    const generationDate = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it });
    doc.text(`Generato il: ${generationDate}`, 15, doc.internal.pageSize.getHeight() - 10);
    
    // Page number
    doc.text(
      `Pagina ${i} di ${pageCount}`,
      doc.internal.pageSize.getWidth() - 15,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }
  
  // Return the PDF as an ArrayBuffer
  return doc.output('arraybuffer');
}
