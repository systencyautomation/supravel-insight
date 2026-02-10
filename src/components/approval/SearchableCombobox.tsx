import { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  showAddButton?: boolean;
  addButtonLabel?: string;
  onAddClick?: () => void;
}

export function SearchableCombobox({
  options,
  value,
  onValueChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum resultado encontrado.',
  loading = false,
  disabled = false,
  className,
  showAddButton = false,
  addButtonLabel = 'Adicionar novo',
  onAddClick,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find(o => o.value === value),
    [options, value]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      o => o.label.toLowerCase().includes(q) || o.subtitle?.toLowerCase().includes(q)
    );
  }, [options, search]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn('w-full justify-between h-9 font-normal', className)}
        >
          <span className="truncate">
            {loading ? 'Carregando...' : selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {filtered.length === 0 && !showAddButton && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
          {filtered.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onValueChange(option.value);
                setOpen(false);
              }}
              className={cn(
                'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                value === option.value && 'bg-accent text-accent-foreground'
              )}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4 shrink-0',
                  value === option.value ? 'opacity-100' : 'opacity-0'
                )}
              />
              <div className="flex flex-col items-start">
                <span>{option.label}</span>
                {option.subtitle && (
                  <span className="text-xs text-muted-foreground">{option.subtitle}</span>
                )}
              </div>
            </button>
          ))}
          {showAddButton && (
            <>
              {filtered.length > 0 && <div className="my-1 h-px bg-border" />}
              <button
                onClick={() => {
                  setOpen(false);
                  onAddClick?.();
                }}
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary"
              >
                <Plus className="mr-2 h-4 w-4 shrink-0" />
                <span className="font-medium">{addButtonLabel}</span>
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
