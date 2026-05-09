# Pet ID - Carteira Digital para Pets

Aplicação web/PWA criada nesta pasta para funcionar como carteira digital de pets em celulares Android e iOS.

## Como abrir

Execute dentro desta pasta:

```powershell
python -m http.server 5240 --bind 127.0.0.1
```

Depois acesse:

```text
http://127.0.0.1:5240/
```

## O que já está incluído

- Cadastro e edição de pets.
- Carteira digital com dados do pet e tutor.
- Histórico de vacinas e alerta de próximas doses.
- Documentos e atestados.
- Checklist de viagem com pet.
- Busca de veterinárias próximas pelo endereço do tutor.
- Perfil do tutor.
- Backup por exportação/importação JSON.
- Manifest e service worker para instalação como PWA.

No Android, a instalação aparece pelo navegador quando a PWA atende aos critérios. No iPhone, use o Safari e adicione à Tela de Início.
