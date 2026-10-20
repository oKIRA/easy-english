# Guia de Publicação e Hospedagem no Firebase Hosting — Easy English

Este guia descreve os passos para publicar e hospedar a plataforma **Easy English** no projeto Firebase **`easy-english-4c948`**.

---

## 1. Configuração do Projeto Firebase

As credenciais do seu aplicativo web já foram configuradas no código em `src/infrastructure/firebase/firebase.ts` e `src/infrastructure/firebase/firebaseConfig.ts`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyACiYLFSmyHlGHADc6ippiJJScR7Et0t_0",
  authDomain: "easy-english-4c948.firebaseapp.com",
  projectId: "easy-english-4c948",
  storageBucket: "easy-english-4c948.firebasestorage.app",
  messagingSenderId: "223346557736",
  appId: "1:223346557736:web:f6d4bbb26f8460f85cc61d",
  measurementId: "G-ETRQNFWXCP"
};
```

---

## 2. Passos para Hospedar no Firebase Hosting

### Passo 1: Instalar o Firebase CLI (caso ainda não possua)
```bash
npm install -g firebase-tools
```

### Passo 2: Fazer Login na sua conta Google
```bash
firebase login
```

### Passo 3: Selecionar o Projeto `easy-english-4c948`
```bash
firebase use easy-english-4c948
```

### Passo 4: Gerar a Versão de Produção (Build)
```bash
npm run build
```
Isso compilará todos os arquivos estáticos otimizados para a pasta `dist/`.

### Passo 5: Fazer o Deploy para o Firebase Hosting
```bash
firebase deploy --only hosting
```

Se desejar fazer deploy também das regras do Firestore e Storage:
```bash
firebase deploy
```

---

## 3. URLs do Aplicativo Hospedado

Após a conclusão do deploy, o aplicativo estará acessível publicamente em:
- **Domínio Principal:** `https://easy-english-4c948.web.app`
- **Domínio Alternativo:** `https://easy-english-4c948.firebaseapp.com`
