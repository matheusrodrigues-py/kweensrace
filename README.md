# Kweens Drag Race

Plataforma completa de casting em HTML, CSS, JavaScript e Node.js, com banco SQLite nativo.

## Executar

Requer Node.js 24 ou superior. Na pasta do projeto:

```powershell
npm start
```

Abra `http://localhost:5500`. O painel fica em `http://localhost:5500/staff.html`.

## Primeiro acesso Staff

- Usuário: `admin`
- Senha temporária: `Kweens@2026!`

Antes de publicar, defina credenciais próprias:

```powershell
$env:STAFF_USER='seu_usuario'
$env:STAFF_PASSWORD='uma_senha_forte'
npm start
```

As inscrições ficam em `data/kweens.db`; os arquivos, em `uploads/<protocolo>/`. Faça backup dessas duas pastas. Não exponha esses diretórios em servidores públicos.

## Estrutura

- `server.js`: servidor, API, autenticação, SQLite e uploads
- `staff.html`: painel protegido
- `inscricao.html`: formulário conectado à API
- `data/`: banco criado automaticamente
- `uploads/`: fotos, vídeos e PDFs enviados

Para produção pública, use HTTPS, senha exclusiva, proxy reverso, backups, limite no proxy para uploads e revisão jurídica dos termos/LGPD.

## Deploy no Render

O projeto inclui `render.yaml` e está preparado para um Web Service com disco persistente.

1. Envie todo o projeto para um repositório GitHub privado.
2. No Render, escolha **New → Blueprint** e conecte o repositório.
3. Informe uma senha forte para `STAFF_PASSWORD` quando solicitado.
4. Confirme o plano Starter e o disco de 1 GB em `/var/data`.
5. Após o deploy, valide `/api/health`, envie uma inscrição de teste e entre em `/staff.html`.

O banco e os uploads ficam sob `/var/data`. O disco persistente é obrigatório; sem ele, inscrições e arquivos seriam perdidos após reinícios ou novos deploys.
