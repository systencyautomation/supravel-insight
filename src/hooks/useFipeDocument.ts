import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseExcelWithStyles, type SheetGrid, type CellData } from '@/lib/excelParser';
import type { Json } from '@/integrations/supabase/types';

export interface FipeDocument {
  id: string;
  fileName: string;
  gridData: CellData[][];
  colCount: number;
  rowCount: number;
  uploadedAt: string;
}

export interface ImportResult {
  success: boolean;
  rowCount: number;
  fileName: string;
}

export function useFipeDocument() {
  const { effectiveOrgId, user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedGrid, setParsedGrid] = useState<SheetGrid | null>(null);

  const parseFile = async (file: File): Promise<SheetGrid> => {
    setIsParsing(true);
    try {
      const grid = await parseExcelWithStyles(file);
      setParsedGrid(grid);
      return grid;
    } finally {
      setIsParsing(false);
    }
  };

  const uploadDocument = async (file: File): Promise<ImportResult> => {
    if (!effectiveOrgId) {
      throw new Error('Organização não encontrada');
    }

    setIsUploading(true);
    
    try {
      // Parse the file with styles
      const grid = await parseFile(file);
      
      // Save to database - store grid as rows (array of arrays with styles)
      const { error } = await supabase
        .from('fipe_documents')
        .insert({
          organization_id: effectiveOrgId,
          file_name: file.name,
          headers: [], // Not used for grid view
          rows: grid.data as unknown as Json, // Store grid data with styles as JSON array
          row_count: grid.rowCount,
          uploaded_by: user?.id || null,
        });
      
      if (error) {
        throw new Error(`Erro ao salvar documento: ${error.message}`);
      }

      return {
        success: true,
        rowCount: grid.rowCount,
        fileName: file.name,
      };
    } finally {
      setIsUploading(false);
    }
  };

  const fetchLatestDocument = useCallback(async (): Promise<FipeDocument | null> => {
    if (!effectiveOrgId) return null;

    const { data, error } = await supabase
      .from('fipe_documents')
      .select('*')
      .eq('organization_id', effectiveOrgId)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    // Handle different data formats
    const rowsData = data.rows as any;
    let gridData: CellData[][] = [];
    let colCount = 0;
    
    if (Array.isArray(rowsData) && rowsData.length > 0) {
      if (Array.isArray(rowsData[0])) {
        // Grid format: array of arrays
        gridData = rowsData.map((row: any[]) => 
          row.map((cell: any) => {
            // Handle new format with style object
            if (cell && typeof cell === 'object' && 'value' in cell) {
              return cell as CellData;
            }
            // Handle old format (plain values)
            return { value: cell } as CellData;
          })
        );
        colCount = gridData.reduce((max, row) => Math.max(max, row.length), 0);
      } else {
        // Legacy format: array of objects - convert to grid
        const headers = data.headers as string[];
        gridData = [
          headers.map(h => ({ value: h })),
          ...rowsData.map((row: Record<string, any>) => 
            headers.map(h => ({ value: row[h] ?? null }))
          )
        ];
        colCount = headers.length;
      }
    }

    return {
      id: data.id,
      fileName: data.file_name,
      gridData,
      colCount,
      rowCount: gridData.length,
      uploadedAt: data.uploaded_at,
    };
  }, [effectiveOrgId]);

  const reset = () => {
    setParsedGrid(null);
  };

  return {
    parseFile,
    uploadDocument,
    fetchLatestDocument,
    reset,
    parsedGrid,
    isUploading,
    isParsing,
  };
}
