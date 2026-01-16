import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
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

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

export function SpreadsheetViewer({ gridData, colCount, rowCount, fileName }: SpreadsheetViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number; value: any } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(100);
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Pan/Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });
  
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

  // Zoom functions
  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, ZOOM_MAX));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - ZOOM_STEP, ZOOM_MIN));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(100);
  }, []);

  // Fullscreen functions
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          resetZoom();
        }
      }
      
      // F11 for fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom, toggleFullscreen]);

  // Handle mouse wheel zoom with Ctrl
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      }
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoomIn, zoomOut]);

  // Pan/Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Right mouse button = 2
    if (e.button === 2) {
      e.preventDefault();
      const viewport = scrollViewportRef.current;
      if (!viewport) return;
      
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setScrollStart({ x: viewport.scrollLeft, y: viewport.scrollTop });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    viewport.scrollLeft = scrollStart.x - deltaX;
    viewport.scrollTop = scrollStart.y - deltaY;
  }, [isDragging, dragStart, scrollStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse up listener for drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  // Prevent context menu when dragging
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

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

  // Handle keyboard navigation for search
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
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
    <div 
      ref={containerRef}
      className={`space-y-4 ${isFullscreen ? 'bg-background p-4 h-screen flex flex-col' : ''}`}
    >
      {/* File info, search, zoom and fullscreen controls */}
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
              onKeyDown={handleSearchKeyDown}
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

          {/* Separator */}
          <div className="hidden sm:block w-px h-6 bg-border" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={zoomOut}
                  disabled={zoomLevel <= ZOOM_MIN}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Diminuir zoom (Ctrl -)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 min-w-[50px] text-xs font-mono"
                  onClick={resetZoom}
                >
                  {zoomLevel}%
                </Button>
              </TooltipTrigger>
              <TooltipContent>Resetar zoom (Ctrl 0)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={zoomIn}
                  disabled={zoomLevel >= ZOOM_MAX}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Aumentar zoom (Ctrl +)</TooltipContent>
            </Tooltip>
          </div>

          {/* Fullscreen toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia (F11)'}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      {/* Excel-style spreadsheet */}
      <div 
        className={`border border-border rounded-lg overflow-hidden bg-background ${isFullscreen ? 'flex-1' : ''}`}
        onContextMenu={handleContextMenu}
      >
        <ScrollArea 
          className={isFullscreen ? 'h-full' : 'h-[600px]'} 
          ref={scrollAreaRef}
        >
          <div 
            ref={scrollViewportRef}
            className={`min-w-max ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{ 
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top left',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
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
                              border-r border-b border-border min-w-[100px] h-7 px-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px] cursor-pointer transition-colors select-none
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
      
      {/* Hints */}
      <div className="text-xs text-muted-foreground text-center space-x-3">
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd> + scroll para zoom
        </span>
        <span>•</span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Botão direito</kbd> + arrastar para navegar
        </span>
        {hasSearch && matchCount > 0 && (
          <>
            <span>•</span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> próximo
            </span>
          </>
        )}
      </div>
    </div>
  );
}
