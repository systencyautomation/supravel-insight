import { Sale, StockItem } from '@/types/commission';

export const mockSales: Sale[] = [
  {
    id: '1',
    cliente: 'MERCADO ALT SELETO LTDA',
    nfe: '000.123.456',
    valorTotal: 23088.05,
    valorTabela: 18500.00,
    formaPagamento: 'boleto',
    uf: 'SP',
    dataEmissao: '2025-01-10',
    status: 'parcial',
    boletos: 4,
    vendedorInterno: 'Lidiane Vieira',
    representante: 'Carlos Silva'
  },
  {
    id: '2',
    cliente: 'DISTRIBUIDORA NORTE SUL',
    nfe: '000.123.457',
    valorTotal: 45200.00,
    valorTabela: 38000.00,
    formaPagamento: 'avista',
    uf: 'MG',
    dataEmissao: '2025-01-09',
    status: 'pago',
    vendedorInterno: 'Lidiane Vieira',
    representante: 'Maria Santos'
  },
  {
    id: '3',
    cliente: 'LOGÍSTICA EXPRESSA LTDA',
    nfe: '000.123.458',
    valorTotal: 67500.00,
    valorTabela: 55000.00,
    formaPagamento: 'boleto',
    uf: 'RJ',
    dataEmissao: '2025-01-08',
    status: 'pendente',
    boletos: 6,
    vendedorInterno: 'João Pereira',
    representante: 'Carlos Silva'
  },
  {
    id: '4',
    cliente: 'INDÚSTRIA METALÚRGICA FORTE',
    nfe: '000.123.459',
    valorTotal: 89000.00,
    valorTabela: 72000.00,
    formaPagamento: 'boleto',
    uf: 'BA',
    dataEmissao: '2025-01-07',
    status: 'pago',
    boletos: 3,
    vendedorInterno: 'Lidiane Vieira',
    representante: 'Ana Costa'
  },
  {
    id: '5',
    cliente: 'ARMAZÉNS GERAIS LTDA',
    nfe: '000.123.460',
    valorTotal: 34500.00,
    valorTabela: 28000.00,
    formaPagamento: 'avista',
    uf: 'PR',
    dataEmissao: '2025-01-06',
    status: 'pago',
    vendedorInterno: 'João Pereira',
    representante: 'Maria Santos'
  }
];

export const mockStock: StockItem[] = [
  {
    id: '1',
    modelo: 'Empilhadeira Elétrica EE-2500',
    codInterno: 'RV03C0001',
    valorTabela: 18500.00,
    percentualComissao: 10,
    quantidade: 5
  },
  {
    id: '2',
    modelo: 'Empilhadeira GLP GL-3500',
    codInterno: 'RV03C0002',
    valorTabela: 38000.00,
    percentualComissao: 15,
    quantidade: 3
  },
  {
    id: '3',
    modelo: 'Empilhadeira Diesel D-5000',
    codInterno: 'RV03C0003',
    valorTabela: 55000.00,
    percentualComissao: 15,
    quantidade: 2
  },
  {
    id: '4',
    modelo: 'Empilhadeira Retrátil R-2000',
    codInterno: 'RV03C0004',
    valorTabela: 72000.00,
    percentualComissao: 10,
    quantidade: 4
  },
  {
    id: '5',
    modelo: 'Transpalete Elétrico TE-1500',
    codInterno: 'RV03C0005',
    valorTabela: 28000.00,
    percentualComissao: 10,
    quantidade: 8
  }
];

export const vendedoresInternos = ['Lidiane Vieira', 'João Pereira'];
export const representantes = ['Carlos Silva', 'Maria Santos', 'Ana Costa'];
