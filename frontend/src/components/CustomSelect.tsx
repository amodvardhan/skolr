import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className,
  disabled
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

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
          <span className={cn("truncate font-sans font-medium text-slate-800", !selectedOption && "text-slate-400 font-normal")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="h-4.5 w-4.5 text-slate-400 shrink-0 ml-2" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] animate-in fade-in-80 slide-in-from-top-1 duration-100"
        >
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none cursor-pointer transition select-none hover:bg-slate-50 hover:text-slate-900 focus:bg-slate-50 focus:text-slate-900 font-sans font-medium mb-0.5 last:mb-0",
                option.value === value && "bg-blue-50 text-blue-900 font-semibold hover:bg-blue-50 focus:bg-blue-50"
              )}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <Check className="h-4 w-4 text-blue-700 shrink-0 ml-2" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
