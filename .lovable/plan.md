

## Plano: Atualizar Logos do Connect CRM

### Objetivo
Substituir os logos existentes pelos novos arquivos SVG fornecidos.

### Arquivos a Atualizar

| Arquivo Atual | Novo Arquivo | Uso |
|---------------|--------------|-----|
| `src/assets/logo-dark.svg` | `Fundo_Preto.svg` | Modo escuro (tema dark) |
| `src/assets/logo-light.svg` | `Fundo_Branco-2.svg` | Modo claro (tema light) |

### Ações

1. **Copiar logo para modo dark**
   - Origem: `user-uploads://Fundo_Preto.svg`
   - Destino: `src/assets/logo-dark.svg`

2. **Copiar logo para modo light**
   - Origem: `user-uploads://Fundo_Branco-2.svg`
   - Destino: `src/assets/logo-light.svg`

### Resultado
O componente `Logo.tsx` já está configurado para usar esses arquivos automaticamente baseado no tema atual, então nenhuma alteração de código é necessária - apenas a substituição dos assets.

