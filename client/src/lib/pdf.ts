import { apiRequest } from "./queryClient";

// Generate schedule PDF URL with query parameters
export function generateSchedulePdfUrl(startDate: Date, endDate: Date, staffType: 'nurse' | 'oss'): string {
  const formattedStartDate = startDate.toISOString().split('T')[0];
  const formattedEndDate = endDate.toISOString().split('T')[0];
  
  return `/api/schedule/pdf?startDate=${formattedStartDate}&endDate=${formattedEndDate}&staffType=${staffType}`;
}

// Download schedule PDF
export async function downloadSchedulePdf(startDate: Date, endDate: Date, staffType: 'nurse' | 'oss'): Promise<void> {
  try {
    const url = generateSchedulePdfUrl(startDate, endDate, staffType);
    
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }
    
    // Create blob from response
    const blob = await response.blob();
    
    // Create object URL
    const objectUrl = URL.createObjectURL(blob);
    
    // Create temporary link element
    const link = document.createElement('a');
    link.href = objectUrl;
    
    // Set filename for download
    const filename = `turni_${staffType === 'nurse' ? 'infermieri' : 'oss'}_${
      startDate.toISOString().split('T')[0]
    }_${endDate.toISOString().split('T')[0]}.pdf`;
    link.download = filename;
    
    // Programmatically click the link to trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
}
