import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addMonths, 
  subMonths, 
  isSameDay, 
  isToday,
  parseISO,
  isSameMonth
} from 'date-fns';
import { cn } from '../lib/utils';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date...',
  className,
  disabled
}: DatePickerProps) {
  const selectedDate = value ? parseISO(value) : undefined;
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleSelect = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-50",
            className
          )}
        >
          <span className={cn("truncate", !value && "text-neutral-400")}>
            {selectedDate ? format(selectedDate, 'PPP') : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-neutral-400 shrink-0 ml-2" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          className="z-50 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg animate-in fade-in-80 slide-in-from-top-1 duration-100 min-w-[280px]"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 hover:bg-neutral-100 rounded-lg transition"
            >
              <ChevronLeft className="h-4 w-4 text-neutral-600" />
            </button>
            <span className="font-semibold text-sm text-neutral-800 font-display">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 hover:bg-neutral-100 rounded-lg transition"
            >
              <ChevronRight className="h-4 w-4 text-neutral-600" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} className="text-[10px] font-bold text-neutral-400 uppercase">
                {d}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDay = isToday(day);

              return (
                <DropdownMenu.Item
                  key={idx}
                  onSelect={() => handleSelect(day)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium cursor-pointer transition select-none outline-none",
                    !isCurrentMonth && "text-neutral-300 hover:bg-neutral-50",
                    isCurrentMonth && !isSelected && !isTodayDay && "text-neutral-700 hover:bg-neutral-50/70",
                    isTodayDay && !isSelected && "text-primary bg-indigo-50 font-bold border border-primary/20",
                    isSelected && "bg-primary text-white font-bold hover:bg-primary focus:bg-primary focus:text-white"
                  )}
                >
                  {format(day, 'd')}
                </DropdownMenu.Item>
              );
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
