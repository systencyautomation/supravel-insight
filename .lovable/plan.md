

## Plano: Atualizar Domínio de Email nas Edge Functions

### Problema Atual
As 3 edge functions que enviam emails estão usando o domínio antigo:
- `noreply@dash.supravel.com.br`

### Solução
Atualizar para o novo domínio verificado no Resend:
- `noreply@supravelconnect.com.br`

### Arquivos a Modificar

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `supabase/functions/send-invitation/index.ts` | 39 | Mudar para `noreply@supravelconnect.com.br` |
| `supabase/functions/send-member-invitation/index.ts` | 53 | Mudar para `noreply@supravelconnect.com.br` |
| `supabase/functions/send-verification-code/index.ts` | 103 | Mudar para `noreply@supravelconnect.com.br` |

### Alteração em Cada Arquivo

**De:**
```typescript
from: "Gestão de Comissões <noreply@dash.supravel.com.br>",
```

**Para:**
```typescript
from: "Gestão de Comissões <noreply@supravelconnect.com.br>",
```

### Observação
Como você verificou o domínio `supravelconnect.com.br` (sem o subdomínio `dash`), o Resend permite enviar emails de qualquer subdomínio desse domínio raiz, incluindo `noreply@supravelconnect.com.br`. Se preferir manter a consistência com o subdomínio da aplicação, também funcionaria `noreply@dash.supravelconnect.com.br`.

