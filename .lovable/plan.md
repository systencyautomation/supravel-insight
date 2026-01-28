
# Plano: Fluxo de Aprovação em 2 Etapas

## Resumo
Reorganizar o fluxo de aprovação de vendas para que a **atribuição de vendedor** (interno e/ou representante) ocorra **após** a confirmação dos cálculos de comissão e Over Price. Isso permite que o aprovador primeiro valide os valores e depois defina quem receberá a comissão com base nesses valores finais.

---

## Fluxo Proposto

```text
┌─────────────────────────────────────────────────────────────────┐
│                     ETAPA 1 - CÁLCULOS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Dados da Tabela                                         │   │
│  │ • Valor Tabela  • % ICMS  • % Comissão                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Dados da Nota Fiscal                                    │   │
│  │ • Valor Faturado  • % ICMS Destino                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Parcelamento                                            │   │
│  │ • Tipo  • Entrada  • Parcelas                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Cálculos                                                │   │
│  │ • Over Price Bruto                                      │   │
│  │ • (-) ICMS, PIS/COFINS, IR/CSLL                         │   │
│  │ • Over Price Líquido                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│              [Confirmar Cálculos e Prosseguir →]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│               ETAPA 2 - ATRIBUIÇÃO DE VENDEDOR                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Resumo dos Valores Confirmados          [← Voltar]      │   │
│  │ Over Líquido: R$ 5.420,00   Valor Tabela: R$ 45.000,00  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Vendedor Interno                                        │   │
│  │ ☐ Habilitar                                             │   │
│  │ • Selecionar vendedor  • % sobre Tabela                 │   │
│  │ Comissão = R$ 2.250,00 + R$ 542,00 (Over 10%)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Representante                                           │   │
│  │ ☐ Habilitar                                             │   │
│  │ • Selecionar representante  • % sobre Tabela            │   │
│  │ Comissão = R$ 1.350,00 + R$ 542,00 (Over 10%)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Total a Pagar                                           │   │
│  │ Interno: R$ 2.792,00  Representante: R$ 1.892,00        │   │
│  │ TOTAL: R$ 4.684,00                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│           [← Voltar]    [Aprovar Venda]    [Rejeitar]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

### 1. `src/components/approval/CommissionCalculator.tsx`
- Remover a seção `CommissionAssignment` do componente
- Remover a seção "Comissão à ser Paga" (movida para etapa 2)
- Adicionar botão "Confirmar Cálculos" ao final
- Expor callback `onConfirmCalculations` para notificar que etapa 1 foi concluída
- Limpar props de atribuição do `CalculationData` (serão gerenciados na etapa 2)

### 2. `src/components/approval/SellerAssignment.tsx` (novo componente)
- Componente para a Etapa 2
- Recebe os valores calculados (Over Líquido, Valor Tabela) como props
- Contém o `CommissionAssignment` existente
- Mostra resumo dos valores confirmados no topo
- Calcula e exibe comissão em tempo real baseado nos valores confirmados
- Expor `onApprove` e `onReject` callbacks

### 3. `src/pages/SalesApproval.tsx`
- Adicionar state para controlar etapa atual (`step: 1 | 2`)
- Guardar dados calculados confirmados
- Renderizar `CommissionCalculator` na etapa 1
- Renderizar `SellerAssignment` na etapa 2
- Atualizar lógica de `handleSave` para incluir dados de atribuição
- Mover botões "Aprovar/Rejeitar" para a etapa 2

---

## Detalhes da Implementação

### Estado do Fluxo

```typescript
// SalesApproval.tsx
const [step, setStep] = useState<1 | 2>(1);
const [confirmedCalculation, setConfirmedCalculation] = useState<CalculationData | null>(null);

// Etapa 1: Confirmar cálculos
const handleConfirmCalculations = () => {
  setConfirmedCalculation(calculationData);
  setStep(2);
};

// Etapa 2: Aprovar com atribuição
const handleApproveWithAssignment = (assignmentData: CommissionAssignmentData) => {
  // Combinar confirmedCalculation + assignmentData
  // Salvar no banco
};
```

### Interface do SellerAssignment

```typescript
interface SellerAssignmentProps {
  sale: PendingSale;
  confirmedData: {
    overPriceLiquido: number;
    valorTabela: number;
    comissaoTotal: number;
    percentualFinal: number;
  };
  organizationId: string | null;
  onApprove: (assignmentData: CommissionAssignmentData) => void;
  onReject: (motivo: string) => void;
  onBack: () => void;
}
```

### Comportamento do Botão "Voltar"
- Na etapa 2, o botão "Voltar" retorna à etapa 1
- Os cálculos são preservados mas podem ser editados
- Ao retornar para etapa 2, os valores são reconfirmados automaticamente

---

## Benefícios desta Abordagem

1. **Clareza**: O aprovador valida primeiro os números antes de decidir a atribuição
2. **Base Correta**: A comissão do vendedor é calculada sobre valores já confirmados
3. **Flexibilidade**: Permite ajustar cálculos sem perder atribuições já feitas
4. **Consistência**: Os valores usados na atribuição são exatamente os confirmados

---

## Considerações de UX

- Indicador visual de etapa atual (1 de 2, 2 de 2)
- Resumo compacto dos valores confirmados na etapa 2
- Botão "Voltar" claro para retornar à etapa 1
- Manter navegação entre vendas pendentes na etapa 1
- Na etapa 2, bloquear navegação até aprovar/rejeitar ou voltar

---

## Ordem de Implementação

1. Refatorar `CommissionCalculator.tsx` removendo atribuição e adicionando botão confirmar
2. Criar componente `SellerAssignment.tsx` para etapa 2
3. Atualizar `SalesApproval.tsx` para gerenciar as duas etapas
4. Testar fluxo completo com dados reais
