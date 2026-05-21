# StudyFlow 📚

Sistema de organização de estudos com agenda, anotações com editor rico, lista de tarefas e revisões com repetição espaçada.

**Stack:** Next.js 14 · Firebase (Auth + Firestore) · TipTap · Tailwind CSS · Vercel

---

## 🚀 Configuração passo a passo

### 1. Firebase — criar projeto

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e clique em **Adicionar projeto**
2. Dê um nome (ex: `studyflow`) e conclua o wizard
3. No menu lateral, vá em **Authentication → Sign-in method** e ative **Google**
4. Vá em **Firestore Database → Criar banco de dados** → escolha **Modo produção** e uma região próxima (ex: `southamerica-east1`)
5. Vá em **Configurações do projeto (ícone ⚙️) → Seus apps → Adicionar app (Web `</>`)** e copie o objeto de configuração

### 2. Variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha `.env.local` com os valores copiados do console Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=meu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=meu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=meu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc...
```

### 3. Regras de segurança do Firestore

No console Firebase → Firestore → Regras, cole o conteúdo de `firestore.rules` e publique.

### 4. Índices do Firestore

No console Firebase → Firestore → Índices, adicione os índices compostos de `firestore.indexes.json`.
Ou use o Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # aponte para o projeto certo
firebase deploy --only firestore:indexes
```

### 5. Instalar e rodar localmente

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## ☁️ Deploy no Vercel

1. Faça push para um repositório GitHub (público ou privado)
2. Acesse [vercel.com](https://vercel.com) → **Add New Project** → importe o repo
3. Em **Environment Variables**, adicione todas as variáveis do `.env.local`
4. Clique em **Deploy** — pronto! 🎉

> Lembre de adicionar o domínio do Vercel (ex: `studyflow.vercel.app`) em:
> Firebase Console → Authentication → Sign-in method → Google → **Domínios autorizados**

---

## 📁 Estrutura do projeto

```
src/
├── app/
│   ├── page.tsx          # Login
│   ├── agenda/page.tsx   # Compromissos do dia
│   ├── notas/page.tsx    # Cadernos + páginas com editor rico
│   ├── tarefas/page.tsx  # To-do com prioridade e progresso
│   └── revisoes/page.tsx # Repetição espaçada
├── components/
│   ├── layout/           # Sidebar, AuthGuard
│   ├── notas/            # RichEditor (TipTap)
│   └── ui/               # Modal
├── hooks/useAuth.tsx     # Contexto de autenticação
├── lib/
│   ├── firebase.ts       # Inicialização Firebase
│   └── db.ts             # Todos os serviços Firestore
└── types/index.ts        # Tipos TypeScript
```

---

## ✨ Funcionalidades

| Módulo | Recursos |
|---|---|
| **Agenda** | Compromissos por dia, horário, cor, marcar como concluído |
| **Notas** | Cadernos com emoji, páginas ilimitadas, editor rico (negrito, listas, código, citações, checklist...), auto-save |
| **Tarefas** | Tarefas por dia, prioridade (baixa/média/alta), barra de progresso |
| **Revisões** | Repetição espaçada automática (1→3→7→14→30→60 dias), tags, filtro por status |
