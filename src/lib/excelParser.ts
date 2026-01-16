import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export interface ParsedData {
  headers: string[];
  rows: Record<string, any>[];
}

// Cell style information
export interface CellStyle {
  color?: string;      // Text color in hex (#FF0000)
  bgColor?: string;    // Background color in hex
  bold?: boolean;
  italic?: boolean;
}

// Cell with value and optional style
export interface CellData {
  value: any;
  style?: CellStyle;
}

// Grid-based parsing for exact Excel representation
export interface SheetGrid {
  data: CellData[][];  // 2D matrix with styled cells [row][col]
  colCount: number;
  rowCount: number;
}

// Helper to extract color from ExcelJS fill
function extractFillColor(fill: ExcelJS.Fill | undefined): string | undefined {
  if (!fill || fill.type !== 'pattern') return undefined;
  const patternFill = fill as ExcelJS.FillPattern;
  if (patternFill.fgColor?.argb) {
    // ARGB format: first 2 chars are alpha, rest is RGB
    return `#${patternFill.fgColor.argb.slice(2)}`;
  }
  return undefined;
}

// Helper to extract font color from ExcelJS
function extractFontColor(font: Partial<ExcelJS.Font> | undefined): string | undefined {
  if (!font?.color?.argb) return undefined;
  // ARGB format: first 2 chars are alpha, rest is RGB
  return `#${font.color.argb.slice(2)}`;
}

// Parse Excel with styles using ExcelJS
export async function parseExcelWithStyles(file: File): Promise<SheetGrid> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Planilha vazia');
  }
  
  const data: CellData[][] = [];
  let maxColCount = 0;
  
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const rowData: CellData[] = [];
    
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Ensure we fill empty cells before this one
      while (rowData.length < colNumber - 1) {
        rowData.push({ value: null });
      }
      
      // Extract cell value
      let cellValue: any = cell.value;
      
      // Handle rich text
      if (cellValue && typeof cellValue === 'object' && 'richText' in cellValue) {
        cellValue = (cellValue as ExcelJS.CellRichTextValue).richText
          .map(rt => rt.text)
          .join('');
      }
      
      // Handle formula results
      if (cellValue && typeof cellValue === 'object' && 'result' in cellValue) {
        cellValue = (cellValue as ExcelJS.CellFormulaValue).result;
      }
      
      // Extract styles
      const style: CellStyle = {};
      
      const fontColor = extractFontColor(cell.font);
      if (fontColor && fontColor !== '#000000' && fontColor !== '#FFFFFF') {
        style.color = fontColor;
      }
      
      const bgColor = extractFillColor(cell.fill);
      if (bgColor && bgColor !== '#FFFFFF' && bgColor !== '#000000') {
        style.bgColor = bgColor;
      }
      
      if (cell.font?.bold) {
        style.bold = true;
      }
      
      if (cell.font?.italic) {
        style.italic = true;
      }
      
      rowData.push({
        value: cellValue,
        style: Object.keys(style).length > 0 ? style : undefined
      });
    });
    
    // Fill remaining empty cells
    maxColCount = Math.max(maxColCount, rowData.length);
    data.push(rowData);
  });
  
  // Normalize all rows to have the same column count
  const normalizedData = data.map(row => {
    const normalized = [...row];
    while (normalized.length < maxColCount) {
      normalized.push({ value: null });
    }
    return normalized;
  });
  
  return {
    data: normalizedData,
    colCount: maxColCount,
    rowCount: normalizedData.length,
  };
}

// Legacy function for backward compatibility (without styles)
export function parseExcelAsGrid(file: File): Promise<SheetGrid> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to 2D array preserving all cells
        const jsonData = XLSX.utils.sheet_to_json(sheet, { 
          header: 1, 
          defval: null,
          blankrows: true 
        }) as any[][];
        
        if (jsonData.length === 0) {
          reject(new Error('Planilha vazia'));
          return;
        }
        
        // Find max column count
        const colCount = jsonData.reduce((max, row) => Math.max(max, row.length), 0);
        
        // Normalize all rows to have the same column count and convert to CellData
        const normalizedData: CellData[][] = jsonData.map(row => {
          const normalized: CellData[] = row.map(cell => ({ value: cell }));
          while (normalized.length < colCount) {
            normalized.push({ value: null });
          }
          return normalized;
        });
        
        resolve({
          data: normalizedData,
          colCount,
          rowCount: normalizedData.length,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseExcelFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          reject(new Error('Planilha vazia ou sem dados'));
          return;
        }
        
        const headers = jsonData[0].map((h: any) => String(h || '').trim());
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
        
        const parsedRows = rows.map(row => {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
        
        resolve({ headers, rows: parsedRows });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseValue(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') return value;
  
  // Remove currency symbols, dots (thousand separator), and convert comma to dot
  const cleaned = String(value)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function parsePercentage(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') return value;
  
  const cleaned = String(value).replace('%', '').replace(',', '.').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function parseInteger(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') return Math.floor(value);
  
  const parsed = parseInt(String(value).trim(), 10);
  return isNaN(parsed) ? null : parsed;
}

export function parseDate(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  
  // Handle Excel date serial numbers
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  
  // Try to parse string date
  const dateStr = String(value).trim();
  const parts = dateStr.split(/[\/\-\.]/);
  
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

export interface InventoryRow {
  internal_code: string | null;
  model_name: string;
  marca: string | null;
  classe_tipo: string | null;
  capacidade: string | null;
  mastro: string | null;
  bateria: string | null;
  carregador: string | null;
  acessorios: string | null;
  pneus: string | null;
  garfos: string | null;
  cor: string | null;
  base_price: number | null;
  base_commission_pct: number | null;
  valor_icms_12: number | null;
  valor_icms_7: number | null;
  valor_icms_4: number | null;
  quantity: number | null;
  qtd_reservado: number | null;
  qtd_dealer: number | null;
  qtd_demo: number | null;
  qtd_patio: number | null;
  disponibilidade_data: string | null;
  moeda: string | null;
}

export interface FieldMapping {
  field: keyof InventoryRow;
  label: string;
  type: 'text' | 'number' | 'percentage' | 'integer' | 'date';
  required?: boolean;
}

export const INVENTORY_FIELDS: FieldMapping[] = [
  { field: 'internal_code', label: 'Código Interno', type: 'text' },
  { field: 'model_name', label: 'Modelo', type: 'text', required: true },
  { field: 'marca', label: 'Marca', type: 'text' },
  { field: 'classe_tipo', label: 'Classe/Tipo', type: 'text' },
  { field: 'capacidade', label: 'Capacidade', type: 'text' },
  { field: 'mastro', label: 'Mastro', type: 'text' },
  { field: 'bateria', label: 'Bateria', type: 'text' },
  { field: 'carregador', label: 'Carregador', type: 'text' },
  { field: 'acessorios', label: 'Acessórios', type: 'text' },
  { field: 'pneus', label: 'Pneus', type: 'text' },
  { field: 'garfos', label: 'Garfos', type: 'text' },
  { field: 'cor', label: 'Cor', type: 'text' },
  { field: 'base_price', label: 'Valor Tabela (Cliente)', type: 'number' },
  { field: 'base_commission_pct', label: '% Comissão', type: 'percentage' },
  { field: 'valor_icms_12', label: 'Valor ICMS 12%', type: 'number' },
  { field: 'valor_icms_7', label: 'Valor ICMS 7%', type: 'number' },
  { field: 'valor_icms_4', label: 'Valor ICMS 4%', type: 'number' },
  { field: 'quantity', label: 'Qtd Total', type: 'integer' },
  { field: 'qtd_reservado', label: 'Qtd Reservado', type: 'integer' },
  { field: 'qtd_dealer', label: 'Qtd Dealer', type: 'integer' },
  { field: 'qtd_demo', label: 'Qtd Demo', type: 'integer' },
  { field: 'qtd_patio', label: 'Qtd Pátio', type: 'integer' },
  { field: 'disponibilidade_data', label: 'Data Disponibilidade', type: 'date' },
  { field: 'moeda', label: 'Moeda', type: 'text' },
];

export function mapRowToInventory(
  row: Record<string, any>,
  mapping: Record<string, string>
): InventoryRow {
  const result: Record<string, any> = {};
  
  INVENTORY_FIELDS.forEach(({ field, type }) => {
    const sourceColumn = mapping[field];
    if (!sourceColumn || sourceColumn === '') {
      result[field] = null;
      return;
    }
    
    const value = row[sourceColumn];
    
    switch (type) {
      case 'number':
        result[field] = parseValue(value);
        break;
      case 'percentage':
        result[field] = parsePercentage(value);
        break;
      case 'integer':
        result[field] = parseInteger(value);
        break;
      case 'date':
        result[field] = parseDate(value);
        break;
      default:
        result[field] = value !== null && value !== undefined ? String(value).trim() : null;
    }
  });
  
  // Ensure model_name has a value
  if (!result.model_name) {
    result.model_name = result.internal_code || 'Sem Nome';
  }
  
  return result as InventoryRow;
}

export function validateInventoryRow(row: InventoryRow): string[] {
  const errors: string[] = [];
  
  if (!row.model_name || row.model_name.trim() === '') {
    errors.push('Modelo é obrigatório');
  }
  
  return errors;
}
