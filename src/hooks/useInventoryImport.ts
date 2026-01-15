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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const parsePdfFile = async (file: File): Promise<ParsedData> => {
    const base64 = await fileToBase64(file);
    
    const { data, error } = await supabase.functions.invoke('parse-pdf-fipe', {
      body: { pdfBase64: base64 }
    });

    if (error) {
      throw new Error(error.message || 'Erro ao processar PDF');
    }

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Nenhum item encontrado no PDF');
    }

    // Convert AI response to ParsedData format
    const items = data.items;
    const headers = Object.keys(items[0] || {});
    
    // Map AI field names to our expected format
    const fieldMapping: Record<string, string> = {
      'cod': 'internal_code',
      'classe_tipo': 'classe_tipo',
      'marca': 'marca',
      'modelo': 'model_name',
      'capacidade': 'capacidade',
      'mastro': 'mastro',
      'bateria': 'bateria',
      'carregador': 'carregador',
      'acessorios': 'acessorios',
      'pneus': 'pneus',
      'garfos': 'garfos',
      'cor': 'cor',
      'valor_cliente': 'base_price',
      'comissao_pct': 'base_commission_pct',
      'valor_icms_12': 'valor_icms_12',
      'valor_icms_7': 'valor_icms_7',
      'valor_icms_4': 'valor_icms_4',
      'qtd_total': 'quantity',
      'qtd_reservado': 'qtd_reservado',
      'qtd_dealer': 'qtd_dealer',
      'qtd_demo': 'qtd_demo',
      'qtd_patio': 'qtd_patio',
      'disponibilidade': 'disponibilidade_data',
      'moeda': 'moeda',
    };

    // Transform rows to use our field names
    const transformedRows = items.map((item: Record<string, any>) => {
      const transformed: Record<string, any> = {};
      for (const [aiKey, value] of Object.entries(item)) {
        const ourKey = fieldMapping[aiKey] || aiKey;
        transformed[ourKey] = value;
      }
      return transformed;
    });

    // Create auto-mapping since AI already uses correct field names
    const autoMapping: Record<string, string> = {};
    const transformedHeaders = Object.keys(transformedRows[0] || {});
    for (const header of transformedHeaders) {
      autoMapping[header] = header;
    }
    setMapping(autoMapping);

    return { 
      headers: transformedHeaders, 
      rows: transformedRows 
    };
  };

  const parseFile = async (file: File): Promise<ParsedData> => {
    setIsParsing(true);
    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      
      let data: ParsedData;
      if (isPdf) {
        data = await parsePdfFile(file);
      } else {
        data = await parseExcelFile(file);
      }
      
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
