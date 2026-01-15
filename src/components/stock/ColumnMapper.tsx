import { useState, useMemo, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { INVENTORY_FIELDS, type FieldMapping } from '@/lib/excelParser';
import { Badge } from '@/components/ui/badge';

interface ColumnMapperProps {
  headers: string[];
  rows: Record<string, any>[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  
  // Patterns include both human-readable headers AND technical field names (for PDF imports)
  const patterns: Record<string, RegExp[]> = {
    internal_code: [/^cod/, /codigo.*interno/, /cod.*int/, /^id$/, /^internal_code$/],
    model_name: [/modelo/, /model/, /^model_name$/],
    marca: [/marca/, /brand/, /^marca$/],
    classe_tipo: [/classe/, /tipo/, /class/, /^classe_tipo$/],
    capacidade: [/capacidade/, /capacity/, /cap\./, /^capacidade$/],
    mastro: [/mastro/, /mast/, /^mastro$/],
    bateria: [/bateria/, /battery/, /^bateria$/],
    carregador: [/carregador/, /charger/, /^carregador$/],
    acessorios: [/acessorio/, /accessory/, /^acessorios$/],
    pneus: [/pneu/, /tire/, /^pneus$/],
    garfos: [/garfo/, /fork/, /^garfos$/],
    cor: [/^cor$/, /color/],
    base_price: [/valor.*cliente/, /preco/, /price/, /valor.*tabela/, /^base_price$/],
    base_commission_pct: [/comiss/, /%.*com/, /commission/, /^base_commission_pct$/],
    valor_icms_12: [/icms.*12/, /12.*%/, /^valor_icms_12$/],
    valor_icms_7: [/icms.*7/, /7.*%/, /^valor_icms_7$/],
    valor_icms_4: [/icms.*4/, /4.*%/, /^valor_icms_4$/],
    quantity: [/qtd.*total/, /quantidade/, /qty/, /^quantity$/],
    qtd_reservado: [/reserv/, /^qtd_reservado$/],
    qtd_dealer: [/dealer/, /^qtd_dealer$/],
    qtd_demo: [/demo/, /^qtd_demo$/],
    qtd_patio: [/patio/, /^qtd_patio$/],
    disponibilidade_data: [/disponib/, /data/, /^disponibilidade_data$/],
    moeda: [/moeda/, /currency/, /^moeda$/],
  };
  
  Object.entries(patterns).forEach(([field, regexes]) => {
    for (const regex of regexes) {
      const index = normalizedHeaders.findIndex(h => regex.test(h));
      if (index !== -1 && !Object.values(mapping).includes(headers[index])) {
        mapping[field] = headers[index];
        break;
      }
    }
  });
  
  return mapping;
}

export function ColumnMapper({ headers, rows, mapping, onMappingChange }: ColumnMapperProps) {
  const [localMapping, setLocalMapping] = useState<Record<string, string>>(() => {
    // If parent already has mapping (from PDF processing), use it
    if (Object.keys(mapping).length > 0) return mapping;
    // Otherwise, auto-detect from headers
    return autoDetectMapping(headers);
  });
  
  // Sync initial mapping with parent on mount
  useEffect(() => {
    if (Object.keys(localMapping).length > 0) {
      onMappingChange(localMapping);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount
  
  // Update local mapping if parent mapping changes (e.g., from PDF processing)
  useEffect(() => {
    if (Object.keys(mapping).length > 0 && JSON.stringify(mapping) !== JSON.stringify(localMapping)) {
      setLocalMapping(mapping);
    }
  }, [mapping]);
  
  const handleChange = (field: string, value: string) => {
    const newMapping = { ...localMapping, [field]: value === '__none__' ? '' : value };
    setLocalMapping(newMapping);
    onMappingChange(newMapping);
  };
  
  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);
  const mappedCount = Object.values(localMapping).filter(v => v && v !== '').length;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Mapear Colunas</h3>
          <p className="text-xs text-muted-foreground">
            Associe as colunas da planilha aos campos do sistema
          </p>
        </div>
        <Badge variant="secondary">
          {mappedCount} de {INVENTORY_FIELDS.length} mapeados
        </Badge>
      </div>
      
      <ScrollArea className="h-[300px] border rounded-lg p-4">
        <div className="space-y-3">
          {INVENTORY_FIELDS.map((fieldDef) => (
            <div key={fieldDef.field} className="flex items-center gap-4">
              <div className="w-48 flex-shrink-0">
                <span className="text-sm">
                  {fieldDef.label}
                  {fieldDef.required && <span className="text-destructive ml-1">*</span>}
                </span>
              </div>
              <span className="text-muted-foreground">→</span>
              <Select
                value={localMapping[fieldDef.field] || '__none__'}
                onValueChange={(value) => handleChange(fieldDef.field, value)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Selecionar coluna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">Não mapear</span>
                  </SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div>
        <h4 className="text-sm font-medium mb-2">Preview ({rows.length} itens encontrados)</h4>
        <div className="border rounded-lg overflow-hidden">
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.slice(0, 6).map((header) => (
                    <TableHead key={header} className="text-xs whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                  {headers.length > 6 && (
                    <TableHead className="text-xs">...</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, index) => (
                  <TableRow key={index}>
                    {headers.slice(0, 6).map((header) => (
                      <TableCell key={header} className="text-xs whitespace-nowrap">
                        {row[header] !== null && row[header] !== undefined 
                          ? String(row[header]).substring(0, 30) 
                          : '-'}
                      </TableCell>
                    ))}
                    {headers.length > 6 && (
                      <TableCell className="text-xs text-muted-foreground">...</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
