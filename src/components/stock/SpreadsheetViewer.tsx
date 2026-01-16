import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CellData, CellStyle } from '@/lib/excelParser';

interface SpreadsheetViewerProps {
  gridData: CellData[][];
  colCount: number;
  rowCount: number;
  fileName?: string;
}

interface MatchingCell {
  rowIndex: number;
  colIndex: number;
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

// Extract value from CellData (handles both new and legacy formats)
function getCellValue(cell: CellData | any): any {
  if (cell && typeof cell === 'object' && 'value' in cell) {
    return cell.value;
  }
  return cell;
}

// Extract style from CellData
function getCellStyle(cell: CellData | any): CellStyle | undefined {
  if (cell && typeof cell === 'object' && 'style' in cell) {
    return cell.style;
  }
  return undefined;
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
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number; value: any } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Find all matching cells
  const matchingCells = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    const matches: MatchingCell[] = [];
    
    gridData.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const value = getCellValue(cell);
        if (
          value !== null && 
          value !== undefined && 
          String(value).toLowerCase().includes(term)
        ) {
          matches.push({ rowIndex, colIndex });
        }
      });
    });
    
    return matches;
  }, [gridData, searchTerm]);

  const matchCount = matchingCells.length;
  const hasSearch = searchTerm.trim().length > 0;

  // Scroll to current match
  const scrollToMatch = useCallback((matchIndex: number) => {
    if (matchingCells.length === 0 || !tableRef.current) return;
    
    const match = matchingCells[matchIndex];
    if (!match) return;
    
    const cellId = `cell-${match.rowIndex}-${match.colIndex}`;
    const cellElement = document.getElementById(cellId);
    
    if (cellElement) {
      cellElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center', 
        inline: 'center' 
      });
    }
  }, [matchingCells]);

  // Auto-scroll to first match when search changes
  useEffect(() => {
    if (matchingCells.length > 0) {
      setCurrentMatchIndex(0);
      // Small delay to ensure DOM is updated
      setTimeout(() => scrollToMatch(0), 100);
    } else {
      setCurrentMatchIndex(0);
    }
  }, [searchTerm, matchingCells.length]);

  // Navigate to previous match
  const goToPreviousMatch = useCallback(() => {
    if (matchCount === 0) return;
    const newIndex = currentMatchIndex === 0 ? matchCount - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    scrollToMatch(newIndex);
  }, [currentMatchIndex, matchCount, scrollToMatch]);

  // Navigate to next match
  const goToNextMatch = useCallback(() => {
    if (matchCount === 0) return;
    const newIndex = currentMatchIndex === matchCount - 1 ? 0 : currentMatchIndex + 1;
    setCurrentMatchIndex(newIndex);
    scrollToMatch(newIndex);
  }, [currentMatchIndex, matchCount, scrollToMatch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        goToPreviousMatch();
      } else {
        goToNextMatch();
      }
    }
  }, [goToPreviousMatch, goToNextMatch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setCurrentMatchIndex(0);
  }, []);

  // Check if a cell is a match
  const isCellMatch = useCallback((rowIndex: number, colIndex: number) => {
    return matchingCells.some(m => m.rowIndex === rowIndex && m.colIndex === colIndex);
  }, [matchingCells]);

  // Check if a cell is the current match
  const isCurrentMatch = useCallback((rowIndex: number, colIndex: number) => {
    if (matchingCells.length === 0) return false;
    const currentMatch = matchingCells[currentMatchIndex];
    return currentMatch?.rowIndex === rowIndex && currentMatch?.colIndex === colIndex;
  }, [matchingCells, currentMatchIndex]);

  // Get matching rows for row highlighting
  const matchingRows = useMemo(() => {
    const rows = new Set<number>();
    matchingCells.forEach(m => rows.add(m.rowIndex));
    return rows;
  }, [matchingCells]);

  return (
    <div className="space-y-4">
      {/* File info and search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {fileName && (
            <Badge variant="outline" className="text-xs">
              {fileName}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {rowCount} linhas × {colCount} colunas
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar na planilha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-9 h-9 text-sm"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Search navigation */}
          {hasSearch && matchCount > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={goToPreviousMatch}
                title="Anterior (Shift+Enter)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[60px] text-center">
                {currentMatchIndex + 1} de {matchCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={goToNextMatch}
                title="Próximo (Enter)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {hasSearch && matchCount === 0 && (
            <span className="text-xs text-destructive whitespace-nowrap">
              Nenhum resultado
            </span>
          )}
        </div>
      </div>
      
      {/* Excel-style spreadsheet */}
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        <ScrollArea className="h-[600px]" ref={scrollAreaRef}>
          <div className="min-w-max">
            <table ref={tableRef} className="border-collapse w-full">
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
                  const isRowMatch = hasSearch && matchingRows.has(rowIndex);
                  
                  return (
                    <tr 
                      key={rowIndex} 
                      className={`
                        ${isRowMatch ? 'bg-primary/5' : 'hover:bg-muted/30'}
                      `}
                    >
                      {/* Row number */}
                      <td className="sticky left-0 z-10 bg-muted border-r border-b border-border w-12 min-w-[48px] h-7 text-center text-xs font-mono text-muted-foreground">
                        {rowIndex + 1}
                      </td>
                      {/* Data cells */}
                      {row.map((cell, colIndex) => {
                        const cellIsMatch = isCellMatch(rowIndex, colIndex);
                        const cellIsCurrent = isCurrentMatch(rowIndex, colIndex);
                        const rawValue = getCellValue(cell);
                        const cellStyle = getCellStyle(cell);
                        const cellValue = formatCellValue(rawValue);
                        const hasLongContent = cellValue.length > 30;
                        
                        // Build inline styles from Excel cell styles
                        const inlineStyle: React.CSSProperties = {};
                        if (cellStyle?.color) {
                          inlineStyle.color = cellStyle.color;
                        }
                        if (cellStyle?.bgColor && !cellIsCurrent && !cellIsMatch) {
                          inlineStyle.backgroundColor = cellStyle.bgColor;
                        }
                        if (cellStyle?.bold) {
                          inlineStyle.fontWeight = 'bold';
                        }
                        if (cellStyle?.italic) {
                          inlineStyle.fontStyle = 'italic';
                        }
                        
                        const cellContent = (
                          <td 
                            key={colIndex}
                            id={`cell-${rowIndex}-${colIndex}`}
                            style={inlineStyle}
                            className={`
                              border-r border-b border-border min-w-[100px] h-7 px-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px] cursor-pointer transition-colors
                              ${cellIsCurrent ? 'bg-yellow-300 dark:bg-yellow-600 ring-2 ring-primary ring-inset font-medium' : ''}
                              ${cellIsMatch && !cellIsCurrent ? 'bg-yellow-200 dark:bg-yellow-700/50' : ''}
                              ${!cellIsMatch && !cellIsCurrent && !cellStyle?.bgColor ? 'hover:bg-muted/50' : ''}
                            `}
                            onClick={() => hasLongContent && setSelectedCell({ row: rowIndex, col: colIndex, value: rawValue })}
                            title={hasLongContent ? "Clique para ver conteúdo completo" : cellValue}
                          >
                            {cellValue}
                          </td>
                        );

                        // Wrap in popover if has long content
                        if (hasLongContent) {
                          return (
                            <Popover key={colIndex}>
                              <PopoverTrigger asChild>
                                {cellContent}
                              </PopoverTrigger>
                              <PopoverContent className="max-w-md">
                                <div className="space-y-2">
                                  <div className="text-xs text-muted-foreground">
                                    Célula {getColumnLetter(colIndex)}{rowIndex + 1}
                                  </div>
                                  <div 
                                    className="text-sm whitespace-pre-wrap break-words"
                                    style={inlineStyle}
                                  >
                                    {cellValue}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        }

                        return cellContent;
                      })}
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
      
      {/* Keyboard shortcuts hint */}
      {hasSearch && matchCount > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> próximo • 
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] ml-1">Shift+Enter</kbd> anterior
        </div>
      )}
    </div>
  );
}
