import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

interface SpreadsheetViewerProps {
  headers: string[];
  rows: Record<string, any>[];
  fileName?: string;
  uploadedAt?: string;
}

export function SpreadsheetViewer({ headers, rows, fileName, uploadedAt }: SpreadsheetViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    
    const term = searchTerm.toLowerCase();
    return rows.filter(row => 
      headers.some(header => {
        const value = row[header];
        return value !== null && value !== undefined && String(value).toLowerCase().includes(term);
      })
    );
  }, [rows, headers, searchTerm]);

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      // Check if it looks like currency (large number)
      if (value >= 1000) {
        return new Intl.NumberFormat('pt-BR', { 
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        }).format(value);
      }
      return String(value);
    }
    return String(value);
  };

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
            {filteredRows.length} de {rows.length} linhas
          </span>
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
      
      {/* Spreadsheet table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <ScrollArea className="h-[500px]">
          <div className="min-w-max">
            <Table>
              <TableHeader className="sticky top-0 bg-muted z-10">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs font-medium text-muted-foreground border-r border-border">
                    #
                  </TableHead>
                  {headers.map((header, index) => (
                    <TableHead 
                      key={index} 
                      className="text-xs font-medium whitespace-nowrap border-r border-border last:border-r-0"
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-muted/50">
                    <TableCell className="text-center text-xs text-muted-foreground font-mono border-r border-border bg-muted/30">
                      {rowIndex + 1}
                    </TableCell>
                    {headers.map((header, colIndex) => (
                      <TableCell 
                        key={colIndex} 
                        className="text-xs whitespace-nowrap border-r border-border last:border-r-0"
                      >
                        {formatCellValue(row[header])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell 
                      colSpan={headers.length + 1} 
                      className="text-center text-muted-foreground py-8"
                    >
                      {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum dado disponível'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
