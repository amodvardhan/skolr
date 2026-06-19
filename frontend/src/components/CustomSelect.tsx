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
            "flex h-10 w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-50",
            className
          )}
        >
          <span className={cn("truncate", !selectedOption && "text-neutral-400")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0 ml-2" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg animate-in fade-in-80 slide-in-from-top-1 duration-100"
        >
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={cn(
                "flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-neutral-700 outline-none cursor-pointer transition select-none hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900",
                option.value === value && "bg-blue-50 text-blue-900 font-medium hover:bg-blue-50 focus:bg-blue-50"
              )}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
