"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, isValid, parse } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PeriodPickerProps {
  startDate?: Date;
  endDate?: Date;
  onDateChange?: (startDate: Date, endDate: Date) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function PeriodPicker({
  startDate,
  endDate,
  onDateChange,
  className,
  placeholder = "Pilih periode gaji",
  disabled = false
}: PeriodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    startDate ? startDate.getMonth() : new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    startDate ? startDate.getFullYear() : new Date().getFullYear()
  );

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const handleMonthYearSelect = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    
    const firstDay = startOfMonth(new Date(year, month));
    const lastDay = endOfMonth(new Date(year, month));
    
    if (onDateChange) {
      onDateChange(firstDay, lastDay);
    }
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    let newMonth = selectedMonth - 1;
    let newYear = selectedYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear = selectedYear - 1;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const handleNextMonth = () => {
    let newMonth = selectedMonth + 1;
    let newYear = selectedYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear = selectedYear + 1;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const formatPeriod = () => {
    if (startDate && endDate) {
      return `${format(startDate, "MMMM yyyy", { locale: id })}`;
    }
    return placeholder;
  };

  const renderCalendarGrid = () => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const weekdays = ['Mi', 'Se', 'Se', 'Ra', 'Ka', 'Ju', 'Sa'];
    const days = [];
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = new Date().getDate() === day && 
                     new Date().getMonth() === selectedMonth && 
                     new Date().getFullYear() === selectedYear;
      
      days.push(
        <button
          key={day}
          className={cn(
            "h-8 w-8 text-sm rounded-md hover:bg-accent hover:text-accent-foreground",
            isToday && "bg-primary text-primary-foreground font-medium"
          )}
          onClick={() => handleMonthYearSelect(selectedMonth, selectedYear)}
        >
          {day}
        </button>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day, index) => (
          <div key={index} className="h-8 w-8 text-xs font-medium text-muted-foreground flex items-center justify-center">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-11 px-4",
              !startDate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {formatPeriod()}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            {/* Month/Year Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevMonth}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-sm font-medium">
                {months[selectedMonth]} {selectedYear}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Calendar Grid */}
            {renderCalendarGrid()}
            
            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => handleMonthYearSelect(selectedMonth, selectedYear)}
                className="flex-1"
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
