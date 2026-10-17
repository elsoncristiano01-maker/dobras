# Dobras – Avaliação de Gordura Corporal

PWA responsivo (celular, tablet, computador) para estimar o % de gordura por dobras cutâneas. Instala na tela inicial e funciona offline. Sem etapa de build: HTML, CSS e JavaScript puros.

## Rodar localmente

```bash
node serve.mjs        # http://localhost:5173
node test/protocols.test.mjs   # testes dos cálculos
```

## Publicar (necessário HTTPS para instalar no celular)

Envie esta pasta inteira (sem `test/`, se quiser) para **Netlify**, **Vercel** ou **GitHub Pages**. Cada serviço gera uma URL `https://…`.
Ao atualizar o app, altere `VERSION` em `sw.js` para que os aparelhos recebam a nova versão.

**Instalar:** Android/Chrome → menu ⋮ → *Instalar app*. iPhone/Safari → Compartilhar → *Adicionar à Tela de Início*.

## Ativar a nuvem (login + sincronização)

1. Crie um projeto em supabase.com.
2. No *SQL Editor*, execute `supabase/schema.sql` (cria as tabelas com isolamento por usuário via RLS).
3. Em *Project Settings → API*, copie a **Project URL** e a **anon public key** para `config.js`.
4. Em *Authentication*, defina se o cadastro exige confirmação por e-mail.

Sem `config.js` preenchido, o app funciona 100% no aparelho (com backup/restauração em JSON na aba Conta).
Dados de saúde são dados pessoais sensíveis (LGPD): use HTTPS, senhas fortes e informe os pacientes sobre o armazenamento.

## Protocolos incluídos

Jackson & Pollock (3 e 7 dobras), Durnin & Womersley, Petroski, Guedes, Faulkner, Yuhasz, Parrillo e Slaughter (2 equações, crianças/adolescentes). Conversão de densidade por Siri ou Brozek. Referências na aba *Protocolos*.
Antes de uso clínico, confira as equações em `js/protocols.js` com as publicações originais.
