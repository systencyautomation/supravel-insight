import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  parseExcelFile, 
  mapRowToInventory, 
  validateInventoryRow,
  type ParsedData,
  type InventoryRow 
} from '@/lib/excelParser';

export interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export function useInventoryImport() {
  const { effectiveOrgId } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

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

  const importItems = async (): Promise<ImportResult> => {
    if (!effectiveOrgId || !parsedData) {
      throw new Error('Dados não disponíveis para importação');
    }

    setIsImporting(true);
    
    const result: ImportResult = {
      total: parsedData.rows.length,
      inserted: 0,
      updated: 0,
      errors: [],
    };

    try {
      // Get existing items to check for updates
      const { data: existingItems } = await supabase
        .from('inventory')
        .select('id, internal_code')
        .eq('organization_id', effectiveOrgId);
      
      const existingCodes = new Map(
        (existingItems || [])
          .filter(item => item.internal_code)
          .map(item => [item.internal_code, item.id])
      );

      const toInsert: any[] = [];
      const toUpdate: { id: string; data: any }[] = [];

      for (let i = 0; i < parsedData.rows.length; i++) {
        const row = parsedData.rows[i];
        const inventoryRow = mapRowToInventory(row, mapping);
        
        const validationErrors = validateInventoryRow(inventoryRow);
        if (validationErrors.length > 0) {
          result.errors.push({ row: i + 2, message: validationErrors.join(', ') });
          continue;
        }

        const itemData = {
          ...inventoryRow,
          organization_id: effectiveOrgId,
        };

        // Check if item exists by internal_code
        if (inventoryRow.internal_code && existingCodes.has(inventoryRow.internal_code)) {
          const existingId = existingCodes.get(inventoryRow.internal_code)!;
          toUpdate.push({ id: existingId, data: itemData });
        } else {
          toInsert.push(itemData);
        }
      }

      // Batch insert new items
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('inventory')
          .insert(toInsert);
        
        if (insertError) {
          throw new Error(`Erro ao inserir: ${insertError.message}`);
        }
        result.inserted = toInsert.length;
      }

      // Update existing items
      for (const { id, data } of toUpdate) {
        const { error: updateError } = await supabase
          .from('inventory')
          .update(data)
          .eq('id', id);
        
        if (updateError) {
          result.errors.push({ 
            row: 0, 
            message: `Erro ao atualizar ${data.internal_code}: ${updateError.message}` 
          });
        } else {
          result.updated++;
        }
      }

      return result;
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setParsedData(null);
    setMapping({});
  };

  return {
    parseFile,
    importItems,
    reset,
    parsedData,
    mapping,
    setMapping,
    isImporting,
    isParsing,
  };
}
