import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseExcelFile, type ParsedData } from '@/lib/excelParser';

export interface FipeDocument {
  id: string;
  fileName: string;
  headers: string[];
  rows: Record<string, any>[];
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
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);

  const parseFile = async (file: File): Promise<ParsedData> => {
    setIsParsing(true);
    try {
      const data = await parseExcelFile(file);
      setParsedData(data);
      return data;
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
      // Parse the file
      const data = await parseFile(file);
      
      // Save to database
      const { error } = await supabase
        .from('fipe_documents')
        .insert({
          organization_id: effectiveOrgId,
          file_name: file.name,
          headers: data.headers,
          rows: data.rows,
          row_count: data.rows.length,
          uploaded_by: user?.id || null,
        });
      
      if (error) {
        throw new Error(`Erro ao salvar documento: ${error.message}`);
      }

      return {
        success: true,
        rowCount: data.rows.length,
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

    return {
      id: data.id,
      fileName: data.file_name,
      headers: data.headers,
      rows: data.rows as Record<string, any>[],
      rowCount: data.row_count,
      uploadedAt: data.uploaded_at,
    };
  }, [effectiveOrgId]);

  const reset = () => {
    setParsedData(null);
  };

  return {
    parseFile,
    uploadDocument,
    fetchLatestDocument,
    reset,
    parsedData,
    isUploading,
    isParsing,
  };
}
