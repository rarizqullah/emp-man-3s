"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDay, isSameDay, isSameMonth } from "date-fns";
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
  const [currentDate, setCurrentDate] = useState(new Date());

  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleMonthSelect = (monthIndex: number) => {
    const firstDay = startOfMonth(new Date(currentDate.getFullYear(), monthIndex));
    const lastDay = endOfMonth(new Date(currentDate.getFullYear(), monthIndex));
    
    if (onDateChange) {
      onDateChange(firstDay, lastDay);
    }
    setIsOpen(false);
  };

  const formatPeriod = () => {
    if (startDate && endDate) {
      // Format yang lebih singkat: "Jul 2025" instead of "Juli 2025"
      return `${months[startDate.getMonth()]} ${startDate.getFullYear()}`;
    }
    return placeholder;
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = getDaysInMonth(firstDayOfMonth);
    const startDay = getDay(firstDayOfMonth);
    
    const days = [];
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < startDay; i++) {
      const prevMonth = new Date(year, month - 1, 0);
      const day = prevMonth.getDate() - startDay + i + 1;
      days.push(
        <div
          key={`prev-${i}`}
          className="h-8 w-8 text-sm text-gray-300 flex items-center justify-center"
        >
          {day}
        </div>
      );
    }
    
    // Days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const isToday = isSameDay(dayDate, new Date());
      const isSelected = startDate && isSameMonth(dayDate, startDate);
      
      days.push(
        <button
          key={day}
          className={cn(
            "h-8 w-8 text-sm rounded-md hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center",
            isToday && "bg-blue-600 text-white font-medium",
            isSelected && !isToday && "bg-blue-100 text-blue-600 font-medium"
          )}
          onClick={() => handleMonthSelect(month)}
        >
          {day}
        </button>
      );
    }
    
    // Fill remaining cells
    const totalCells = Math.ceil(days.length / 7) * 7;
    let nextMonthDay = 1;
    for (let i = days.length; i < totalCells; i++) {
      days.push(
        <div
          key={`next-${i}`}
          className="h-8 w-8 text-sm text-gray-300 flex items-center justify-center"
        >
          {nextMonthDay++}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day, index) => (
          <div key={index} className="h-8 w-8 text-xs font-medium text-gray-500 flex items-center justify-center">
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
              "w-full justify-start text-left font-normal h-11 px-3",
              !startDate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate text-sm">
              {formatPeriod()}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            {/* Header dengan navigasi bulan */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-sm font-semibold">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Calendar Grid */}
            {renderCalendarGrid()}
            
            {/* Footer actions */}
            <div className="flex gap-2 pt-3 mt-3 border-t">
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
                onClick={() => handleMonthSelect(currentDate.getMonth())}
                className="flex-1"
              >
                Pilih
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
