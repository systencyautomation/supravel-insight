
# Plano: Correção de Botões da Calculadora e Padronização do Footer

## Problemas Identificados

### 1. Botão Extra na Calculadora
Atualmente, a calculadora em `SalesApproval.tsx` mostra um botão "Confirmar Cálculos e Prosseguir" **dentro** do componente (quando `showConfirmButton={true}`), além dos botões no rodapé global ("Cancelar" e "Próxima Etapa").

**Solução:** Remover o botão duplicado da calculadora, mantendo apenas os 2 botões do rodapé.

### 2. Renomeação de "Connect CRM" para "Connect Dash"
Referências encontradas:
- `index.html` (título e meta tags)
- `src/pages/Index.tsx` (footer)
- `src/pages/Auth.tsx` (footer)
- `src/components/Logo.tsx` (alt text)

### 3. Footer Faltando em Algumas Páginas
Páginas sem footer:
- `MasterDashboard.tsx`
- `SettingsLayout.tsx` (afeta todas as páginas de settings)
- `SalesApproval.tsx`

---

## Arquivos a Modificar

### 1. `src/pages/SalesApproval.tsx`
- Remover a prop `showConfirmButton` (sempre `false` ou remover)
- Manter apenas os 2 botões do rodapé global: "Cancelar" e "Próxima Etapa"
- Adicionar footer padronizado no final da página

**Antes:**
```tsx
<CommissionCalculator
  ...
  showConfirmButton={!isEditMode && canApprove}
/>
```

**Depois:**
```tsx
<CommissionCalculator
  ...
  showConfirmButton={false}
/>
```

### 2. `src/components/approval/CommissionCalculator.tsx`
- Remover o bloco do botão "Confirmar Cálculos e Prosseguir" (linhas 740-752)
- Remover props `onConfirmCalculations` e `showConfirmButton` se não usadas em outro lugar

### 3. `index.html`
- Alterar título de "Connect CRM" para "Connect Dash"
- Atualizar meta author

### 4. `src/pages/Index.tsx`
- Alterar footer de "Connect CRM" para "Connect Dash"

### 5. `src/pages/Auth.tsx`
- Alterar footer de "Connect CRM" para "Connect Dash"

### 6. `src/components/Logo.tsx`
- Alterar alt text de "Connect CRM" para "Connect Dash"

### 7. `src/pages/master/MasterDashboard.tsx`
- Adicionar footer consistente antes do fechamento da div principal

### 8. `src/layouts/SettingsLayout.tsx`
- Adicionar footer consistente no layout (aparece em todas páginas de settings)

---

## Footer Padronizado

Todas as páginas usarão o mesmo estilo:
```tsx
<footer className="border-t border-border py-3 mt-auto">
  <div className="container mx-auto px-6 text-center">
    <p className="text-xs text-muted-foreground uppercase tracking-wide">
      Connect Dash © 2026 — Sistema de Gestão de Comissões
    </p>
  </div>
</footer>
```

---

## Resumo das Mudanças

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `src/pages/SalesApproval.tsx` | Modificar | Remover `showConfirmButton`, adicionar footer |
| `src/components/approval/CommissionCalculator.tsx` | Modificar | Remover botão interno "Confirmar Cálculos" |
| `index.html` | Modificar | CRM → Dash no título e meta |
| `src/pages/Index.tsx` | Modificar | CRM → Dash no footer |
| `src/pages/Auth.tsx` | Modificar | CRM → Dash no footer |
| `src/components/Logo.tsx` | Modificar | CRM → Dash no alt text |
| `src/pages/master/MasterDashboard.tsx` | Modificar | Adicionar footer |
| `src/layouts/SettingsLayout.tsx` | Modificar | Adicionar footer |
