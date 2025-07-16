"use client";

import { useState, useEffect } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SalaryDatePickerProps {
  startDate?: Date;
  endDate?: Date;
  onDateChange?: (startDate: Date, endDate: Date) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function SalaryDatePicker({
  startDate,
  endDate,
  onDateChange,
  className,
  placeholder = "Pilih periode",
  disabled = false
}: SalaryDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Initialize state properly
  useEffect(() => {
    if (startDate) {
      setSelectedYear(startDate.getFullYear());
      setSelectedMonth(startDate.getMonth());
    } else {
      // Set default to current year
      const now = new Date();
      setSelectedYear(now.getFullYear());
      setSelectedMonth(null); // Let user explicitly choose
    }
  }, [startDate]);

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const handlePrevYear = () => {
    setSelectedYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };

  const handleMonthSelect = (monthIndex: number) => {
    console.log('Month selected:', monthIndex, months[monthIndex]);
    setSelectedMonth(monthIndex);
  };

  const handleConfirmSelection = () => {
    if (selectedMonth === null || selectedMonth === undefined) {
      console.log('No month selected');
      return;
    }
    
    console.log('Confirming selection:', { selectedMonth, selectedYear });
    
    // Create date range for the selected month
    const firstDay = startOfMonth(new Date(selectedYear, selectedMonth, 1));
    const lastDay = endOfMonth(new Date(selectedYear, selectedMonth, 1));
    
    console.log('Date range created:', { 
      firstDay: firstDay.toISOString(), 
      lastDay: lastDay.toISOString() 
    });
    
    if (onDateChange && typeof onDateChange === 'function') {
      onDateChange(firstDay, lastDay);
      console.log('Date change callback executed');
    } else {
      console.warn('onDateChange callback not found or not a function');
    }
    
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset to initial values or null
    setSelectedMonth(startDate?.getMonth() !== undefined ? startDate.getMonth() : null);
    setSelectedYear(startDate?.getFullYear() || new Date().getFullYear());
    setIsOpen(false);
  };

  const formatPeriod = () => {
    if (startDate && endDate) {
      return format(startDate, 'MMMM yyyy', { locale: id });
    }
    return placeholder;
  };

  const renderMonthGrid = () => {
    return (
      <div className="space-y-4">
        {/* Year Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevYear}
            className="h-8 w-8 p-0"
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-lg font-semibold">
            {selectedYear}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextYear}
            className="h-8 w-8 p-0"
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-3 gap-2">
          {months.map((month, index) => {
            const isSelected = selectedMonth === index;
            const isCurrentMonth = new Date().getMonth() === index && new Date().getFullYear() === selectedYear;
            const isPeriodMonth = startDate && startDate.getMonth() === index && startDate.getFullYear() === selectedYear;
            
            return (
              <Button
                key={index}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleMonthSelect(index)}
                className={cn(
                  "h-10 text-sm transition-colors",
                  isCurrentMonth && !isSelected && "border-blue-500 text-blue-600",
                  isPeriodMonth && !isSelected && "border-green-500 text-green-600"
                )}
                type="button"
              >
                {month}
              </Button>
            );
          })}
        </div>

        {/* Selected Period Info */}
        {selectedMonth !== null && (
          <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800">
            <div className="font-medium">Periode yang dipilih:</div>
            <div>{months[selectedMonth]} {selectedYear}</div>
            <div className="text-xs mt-1 text-blue-600">
              {startOfMonth(new Date(selectedYear, selectedMonth)).toLocaleDateString('id-ID')} - {endOfMonth(new Date(selectedYear, selectedMonth)).toLocaleDateString('id-ID')}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Reset selectedMonth ketika popover dibuka
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset ke nilai awal saat membuka
      setSelectedMonth(startDate?.getMonth() !== undefined ? startDate.getMonth() : null);
      setSelectedYear(startDate?.getFullYear() || new Date().getFullYear());
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-11 px-3",
              !startDate && "text-muted-foreground"
            )}
            disabled={disabled}
            type="button"
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate text-sm">
              {formatPeriod()}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4">
            {/* Month Grid */}
            {renderMonthGrid()}
            
            {/* Footer actions */}
            <div className="flex gap-2 pt-4 mt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex-1"
                type="button"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSelection}
                disabled={selectedMonth === null}
                className="flex-1"
                type="button"
              >
                Pilih Periode
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}