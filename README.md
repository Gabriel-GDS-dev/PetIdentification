# Identificção Pet - Carteira Digital para Pets

Aplicação web/PWA para funcionar como carteira digital de pets em celulares Android e iOS.

## Como abrir no computador

Execute dentro desta pasta:

```powershell
python -m http.server 5240 --bind 127.0.0.1
```

Depois acesse:

```text
http://127.0.0.1:5240/
```

## Como testar no celular sem hospedar

O app já está configurado como PWA. O detalhe importante é que o navegador só libera instalação completa em uma origem segura: HTTPS ou localhost. Em `http://IP:porta`, normalmente ele deixa criar apenas um atalho.

### Opção simples: mesma rede Wi-Fi

No computador, rode o servidor aceitando acesso da rede:

```powershell
python -m http.server 5240 --bind 0.0.0.0
```

Descubra o IP do computador:

```powershell
ipconfig
```

No celular, estando no mesmo Wi-Fi, abra no navegador:

```text
http://SEU-IP:5240/
```

Exemplo:

```text
http://192.168.0.25:5240/
```

Essa opção é ótima para testar o visual e as telas. Para instalar como aplicativo PWA, use HTTPS ou localhost.

### Android com cabo USB: melhor para testar PWA local

Com o Android conectado e depuração USB ativada, rode:

```powershell
python -m http.server 5240 --bind 127.0.0.1
adb reverse tcp:5240 tcp:5240
```

No celular, abra:

```text
http://127.0.0.1:5240/
```

Assim o Chrome do Android enxerga como localhost, o que ajuda a testar recursos de PWA sem publicar em hospedagem.

### iPhone

Para testar as telas, use a opção da mesma rede Wi-Fi. Para testar instalação/offline de PWA no iPhone, normalmente será necessário HTTPS.

## Para virar app instalável de verdade

Há três caminhos:

- PWA hospedada em HTTPS: é o caminho mais simples para instalar pelo navegador.
- Teste local Android com ADB: bom para TCC e validação sem hospedagem.
- APK/IPA com Capacitor: empacota esta mesma aplicação web como aplicativo nativo para loja ou instalação manual.

## O que já está incluído

- Login e cadastro locais para o protótipo.
- Sessão confiável no celular: depois de entrar, o app abre direto no início.
- Cadastro e edição de pets.
- Documento digital do pet em estilo carteira oficial.
- Tema claro e tema escuro.
- Dados do tutor.
- Histórico de vacinas e alerta de próximas doses.
- Documentos e atestados.
- Checklist de viagem com pet.
- Busca de veterinárias próximas pelo endereço do tutor.
- Backup por exportação/importação JSON.
- Manifest e service worker para instalação como PWA.

## Observação sobre login

Nesta versão de TCC, a conta fica salva no próprio aparelho/navegador usando armazenamento local. Isso é suficiente para protótipo e apresentação. Para login real entre vários celulares, seria necessário conectar um backend com banco de dados e autenticação.
