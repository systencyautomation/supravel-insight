import { useState, useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

interface SpreadsheetViewerProps {
  gridData: any[][];
  colCount: number;
  rowCount: number;
  fileName?: string;
}

// Generate Excel-style column letters (A, B, C, ... Z, AA, AB, etc.)
function getColumnLetter(index: number): string {
  let letter = '';
  let num = index;
  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }
  return letter;
}

// Format cell value for display
function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    // Format large numbers with locale
    if (Math.abs(value) >= 1000 || (value % 1 !== 0)) {
      return new Intl.NumberFormat('pt-BR', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 2 
      }).format(value);
    }
    return String(value);
  }
  return String(value);
}

export function SpreadsheetViewer({ gridData, colCount, rowCount, fileName }: SpreadsheetViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Search filter - highlight matching rows
  const matchingRows = useMemo(() => {
    if (!searchTerm.trim()) return new Set<number>();
    
    const term = searchTerm.toLowerCase();
    const matches = new Set<number>();
    
    gridData.forEach((row, rowIndex) => {
      if (row.some(cell => 
        cell !== null && 
        cell !== undefined && 
        String(cell).toLowerCase().includes(term)
      )) {
        matches.add(rowIndex);
      }
    });
    
    return matches;
  }, [gridData, searchTerm]);

  const hasSearch = searchTerm.trim().length > 0;
  const matchCount = matchingRows.size;

  return (
    <div className="space-y-4">
      {/* File info and search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {fileName && (
            <Badge variant="outline" className="text-xs">
              {fileName}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {rowCount} linhas × {colCount} colunas
          </span>
          {hasSearch && (
            <span className="text-xs text-primary font-medium">
              {matchCount} {matchCount === 1 ? 'linha encontrada' : 'linhas encontradas'}
            </span>
          )}
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na planilha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>
      
      {/* Excel-style spreadsheet */}
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        <ScrollArea className="h-[600px]">
          <div className="min-w-max">
            <table className="border-collapse w-full">
              {/* Column headers (A, B, C, ...) */}
              <thead className="sticky top-0 z-20">
                <tr className="bg-muted">
                  {/* Corner cell */}
                  <th className="sticky left-0 z-30 bg-muted border-r border-b border-border w-12 min-w-[48px] h-8 text-center text-xs font-medium text-muted-foreground">
                    
                  </th>
                  {/* Column letters */}
                  {Array.from({ length: colCount }, (_, i) => (
                    <th 
                      key={i}
                      className="border-r border-b border-border min-w-[100px] h-8 px-2 text-center text-xs font-medium text-muted-foreground"
                    >
                      {getColumnLetter(i)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridData.map((row, rowIndex) => {
                  const isHighlighted = hasSearch && matchingRows.has(rowIndex);
                  const isHidden = hasSearch && !matchingRows.has(rowIndex);
                  
                  return (
                    <tr 
                      key={rowIndex} 
                      className={`
                        ${isHighlighted ? 'bg-primary/10' : 'hover:bg-muted/30'}
                        ${isHidden ? 'opacity-30' : ''}
                      `}
                    >
                      {/* Row number */}
                      <td className="sticky left-0 z-10 bg-muted border-r border-b border-border w-12 min-w-[48px] h-7 text-center text-xs font-mono text-muted-foreground">
                        {rowIndex + 1}
                      </td>
                      {/* Data cells */}
                      {row.map((cell, colIndex) => (
                        <td 
                          key={colIndex}
                          className="border-r border-b border-border min-w-[100px] h-7 px-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]"
                          title={cell !== null && cell !== undefined ? String(cell) : undefined}
                        >
                          {formatCellValue(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </div>
  );
}
