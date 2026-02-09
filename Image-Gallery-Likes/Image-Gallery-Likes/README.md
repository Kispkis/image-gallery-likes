# Galeria de Imagens

Aplicacao web responsiva com sistema de login para administradores, upload de imagens JPEG (maximo 200KB) e galeria publica com sistema de likes por email.

---

## Funcionalidades

- **Galeria Publica**: Qualquer pessoa pode visualizar as imagens
- **Sistema de Likes**: Usuarios podem dar like usando um email Gmail (cada email so pode dar 1 like no total)
- **Painel Admin**: Upload de imagens, visualizacao de likes e gestao de imagens
- **Autenticacao**: Login com sessao segura para administradores

## Credenciais de Admin

| Usuario | Senha    |
|---------|----------|
| admin1  | admin123 |
| admin2  | admin456 |

---

## Testar Online (Replit)

1. Abra o projeto no Replit
2. Clique no botao **Run** (ou aguarde o workflow "Start application" iniciar automaticamente)
3. O aplicativo vai abrir no navegador do Replit
4. Acesse as paginas:
   - `/` - Galeria publica (ver imagens e dar likes)
   - `/admin` - Login de administrador
   - `/admin/dashboard` - Painel do administrador (apos login)

O banco de dados PostgreSQL ja esta configurado automaticamente no Replit.

---

## Testar Localmente (CMD)

### Requisitos

- [Node.js](https://nodejs.org/) versao 18 ou superior
- [PostgreSQL](https://www.postgresql.org/download/) instalado e funcionando

### Passo a passo

**1. Clone ou copie o projeto para o seu computador**

**2. Abra o terminal e entre na pasta do projeto:**
```bash
cd nome-da-pasta
```

**3. Instale as dependencias:**
```bash
npm install
```

**4. Crie o banco de dados no PostgreSQL:**

Abra o terminal do PostgreSQL (psql) e execute:
```sql
CREATE DATABASE galeria;
```

**5. Configure as variaveis de ambiente:**

No Windows CMD:
```cmd
set DATABASE_URL=postgresql://postgres:suasenha@localhost:5432/galeria
set SESSION_SECRET=qualquer-texto-secreto
```

No Windows PowerShell:
```powershell
$env:DATABASE_URL="postgresql://postgres:suasenha@localhost:5432/galeria"
$env:SESSION_SECRET="qualquer-texto-secreto"
```

No Linux/Mac:
```bash
export DATABASE_URL=postgresql://postgres:suasenha@localhost:5432/galeria
export SESSION_SECRET=qualquer-texto-secreto
```

> **Importante:** Substitua `suasenha` pela senha do seu PostgreSQL. Se o seu usuario nao for `postgres`, substitua tambem o usuario.

**6. Envie as tabelas para o banco de dados:**
```bash
npx drizzle-kit push
```

**7. Inicie o projeto:**
```bash
npm run dev
```

**8. Abra no navegador:**
```
http://localhost:5000
```

---

## Paginas

| Pagina              | Caminho            | Descricao                          |
|---------------------|--------------------|------------------------------------|
| Galeria Publica     | `/`                | Ver imagens e dar likes            |
| Login Admin         | `/admin`           | Entrar como administrador          |
| Painel Admin        | `/admin/dashboard` | Upload, gestao e likes das imagens |

---

## Regras do Sistema

- Apenas imagens JPEG sao aceites no upload
- Tamanho maximo por imagem: 200KB
- Likes requerem um email que termine com `@gmail.com`
- Cada email so pode dar 1 like no total (independente da imagem)
- Data e hora de cada like sao registadas automaticamente

> **Aviso importante para testes:** Se alterar o nome de utilizador ou a senha de um administrador durante os testes, certifique-se de que volta a repor as credenciais originais antes de fechar a aplicacao. Caso contrario, nao conseguira fazer login com as credenciais indicadas acima.

---

## Tecnologias

- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, express-session
- **Banco de Dados**: PostgreSQL com Drizzle ORM
- **Armazenamento**: Sistema de arquivos local (pasta uploads/)
