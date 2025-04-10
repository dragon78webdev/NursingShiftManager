import React from 'react';
import { ShiftType } from '@shared/schema';
import { cn } from '@/lib/utils';

export function ShiftLegend() {
  const shiftTypes = [
    { type: ShiftType.MORNING, label: 'M: Mattina', className: 'bg-blue-50 border-l-4 border-blue-500' },
    { type: ShiftType.AFTERNOON, label: 'P: Pomeriggio', className: 'bg-yellow-50 border-l-4 border-yellow-500' },
    { type: ShiftType.NIGHT, label: 'N: Notte', className: 'bg-purple-50 border-l-4 border-purple-700' },
    { type: ShiftType.OFF, label: 'R: Riposo', className: 'bg-gray-50 border-l-4 border-gray-500' },
    { type: ShiftType.VACATION, label: 'F: Ferie', className: 'bg-green-50 border-l-4 border-green-500' },
    { type: ShiftType.SICK, label: 'M: Malattia', className: 'bg-red-50 border-l-4 border-red-500' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {shiftTypes.map((shift) => (
        <div key={shift.type} className="flex items-center">
          <div className={cn("w-6 h-6 rounded mr-1", shift.className)}></div>
          <span className="text-xs text-gray-700">{shift.label}</span>
        </div>
      ))}
    </div>
  );
}

export default ShiftLegend;
