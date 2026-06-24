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
            "flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm transition hover:bg-slate-50 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 cursor-pointer shadow-sm",
            className
          )}
        >
          <span className={cn("truncate font-sans font-medium text-slate-800", !value && "text-slate-400 font-normal")}>
            {selectedDate ? format(selectedDate, 'PPP') : placeholder}
          </span>
          <CalendarIcon className="h-4.5 w-4.5 text-slate-400 shrink-0 ml-2" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          className="z-50 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.06)] animate-in fade-in-80 slide-in-from-top-1 duration-100 min-w-[280px]"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-50 rounded-lg transition cursor-pointer text-slate-500 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-sm text-slate-900 font-display">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-50 rounded-lg transition cursor-pointer text-slate-500 hover:text-slate-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                    "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition select-none outline-none font-sans",
                    !isCurrentMonth && "text-slate-300 hover:bg-slate-50/50",
                    isCurrentMonth && !isSelected && !isTodayDay && "text-slate-700 hover:bg-slate-50",
                    isTodayDay && !isSelected && "text-blue-700 bg-blue-50 font-bold border border-blue-100",
                    isSelected && "bg-blue-700 text-white font-bold hover:bg-blue-700 focus:bg-blue-700 focus:text-white shadow-sm shadow-blue-700/20"
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
