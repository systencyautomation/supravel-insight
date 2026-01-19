import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
}

export function CurrencyInput({ 
  value, 
  onChange, 
  className, 
  id,
  placeholder = "0,00"
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);

  // Update display when external value changes (and not focused)
  React.useEffect(() => {
    if (!isFocused) {
      if (value === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(
          value.toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })
        );
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Allow typing numbers, dots, and commas
    setDisplayValue(inputValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Convert to number: remove thousand separators (dots), replace comma with dot
    const normalized = displayValue
      .replace(/\./g, '')  // Remove thousand separators
      .replace(',', '.');  // Replace decimal comma with dot
    
    const numericValue = parseFloat(normalized) || 0;
    onChange(numericValue);
    
    // Reformat for display
    if (numericValue > 0) {
      setDisplayValue(
        numericValue.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })
      );
    } else {
      setDisplayValue('');
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      id={id}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
    />
  );
}
