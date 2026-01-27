
# Plano: Finalizar Implementação - Configurações da Empresa

## Resumo
A migração SQL foi executada com sucesso, mas os componentes frontend ainda não foram implementados. Este plano completa a funcionalidade conforme aprovado anteriormente.

---

## 1. Atualizar Hook de Configurações

**Arquivo: `src/hooks/useOrganizationSettings.ts`**

Expandir a interface para incluir todos os novos campos:

```typescript
export interface OrganizationSettings {
  // Campos IMAP existentes
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_password: string;
  automation_active: boolean;
  imap_allowed_emails: string[];
  
  // Dados cadastrais
  cnpj: string;
  razao_social: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email_contato: string;
  
  // Parametrização
  comissao_base: 'valor_tabela' | 'comissao_empresa';
  comissao_over_percent: number;
}
```

Atualizar a query SELECT para buscar os novos campos do banco.

---

## 2. Criar Componente de Dados da Empresa

**Arquivo: `src/components/settings/CompanyDataForm.tsx`**

Componente com formulário editável contendo:
- Nome Fantasia (name) - somente leitura
- Razão Social
- CNPJ com máscara XX.XXX.XXX/XXXX-XX
- Endereço completo
- Cidade + Estado (dropdown UFs) + CEP (máscara XXXXX-XXX)
- Telefone com máscara (XX) XXXXX-XXXX
- Email de contato
- Botão "Salvar Alterações"

---

## 3. Criar Componente de Parametrização

**Arquivo: `src/components/settings/CommissionParametersForm.tsx`**

Componente com:
- **Comissão Base**: RadioGroup para escolher entre:
  - "Sobre o Valor de Tabela" (valor_tabela)
  - "Sobre a Comissão da Empresa" (comissao_empresa)
- **Percentual do Over**: Input numérico (0-100) com sufixo "%"
- Texto explicativo sobre cada opção
- Botão "Salvar Parametrização"

---

## 4. Atualizar Página de Configurações

**Arquivo: `src/pages/settings/OrganizationSettings.tsx`**

Refatorar para incluir:
- Seção "Dados da Empresa" com CompanyDataForm
- Seção "Parametrização" com CommissionParametersForm
- Warning de impersonação quando aplicável
- Loading states e feedback visual

---

## 5. Integrar com CommissionCalculator

**Arquivo: `src/components/approval/CommissionCalculator.tsx`**

Modificações:
1. Buscar configurações da organização ao carregar
2. Substituir o `0.10` fixo por `comissao_over_percent / 100`
3. Aplicar lógica de `comissao_base` quando calcular comissão do vendedor

Exemplo da mudança:
```typescript
// ANTES (linha 422)
const overInternal = assignmentData.internalSellerId ? overLiquido * 0.10 : 0;

// DEPOIS
const overInternal = assignmentData.internalSellerId 
  ? overLiquido * (orgSettings.comissao_over_percent / 100) 
  : 0;
```

---

## Detalhes Técnicos

### Máscaras de Input

| Campo | Máscara | Exemplo |
|-------|---------|---------|
| CNPJ | XX.XXX.XXX/XXXX-XX | 21.258.654/0001-95 |
| CEP | XXXXX-XXX | 89000-000 |
| Telefone | (XX) XXXXX-XXXX | (47) 99999-9999 |

### Estados Brasileiros
Dropdown com todas as 27 UFs, ordenadas alfabeticamente.

### Validações
- CNPJ: formato válido (14 dígitos)
- CEP: 8 dígitos
- Telefone: 10-11 dígitos
- Email: formato válido
- Percentual Over: 0-100, permitir decimais

---

## Ordem de Implementação

1. `src/hooks/useOrganizationSettings.ts` - Expandir interface e query
2. `src/components/settings/CompanyDataForm.tsx` - Criar formulário
3. `src/components/settings/CommissionParametersForm.tsx` - Criar formulário
4. `src/pages/settings/OrganizationSettings.tsx` - Integrar componentes
5. `src/components/approval/CommissionCalculator.tsx` - Usar parametrização dinâmica
