# LAB02 · Assistente de IA vs. codificação manual

Ferramentas de coleta do experimento da disciplina **Laboratório de Experimentação
de Software**. O site reúne medição de tempo e análise estrutural de código Java
para comparar trials **com IA** e **sem IA**.

## Acesse o site

**[Abrir LAB02 no A.R.S.E.N.A.L](https://arsenal.dev.br/lab02/)**

- [Cronômetro](https://arsenal.dev.br/lab02/#cronometro): tempo e resultados dos trials.
- [Métricas de código](https://arsenal.dev.br/lab02/#metricas): envio de classes Java e relatórios.

A disponibilidade depende do computador hospedeiro, do A.R.S.E.N.A.L e do túnel
Cloudflare estarem em execução. Quem acessa o site não precisa instalar Java.

## Como usar

### Cronômetro

Informe participante, kata e tratamento. Clique em **Preparar**, digite **S** e
pressione **Enter** para começar. Encerre com **Enter** na tela do cronômetro ou
com o botão **Encerrar cronômetro**. O limite é **35 minutos**. Registre o resultado
dos testes e salve; o botão de resultados abre o histórico.

Os resultados salvos ficam no navegador usado na coleta e não são sincronizados
entre computadores. Trocar de tela pelo menu preserva a sessão. Fechar ou
recarregar a página perde o trial ainda não salvo.

### Métricas de código

Informe os mesmos dados do trial, envie as classes de produção e clique em
**Analisar código**. O botão **Usar exemplo** carrega uma classe de validação.
Ao concluir, baixe os relatórios **CSV** e **JSON**.

| Medida | Definição | Ferramenta |
| --- | --- | --- |
| LOC | Linhas físicas, incluindo comentários e linhas vazias | Coletor |
| Complexidade média | Complexidade ciclomática por método, sem construtores | CK 0.7.0 |
| Duplicação | Percentual de linhas em trechos repetidos; limiar de 50 tokens | PMD CPD 7.26.0 |

São aceitos até **20 arquivos `.java`**, de até **100 KB cada**, com limite total
de **1 MB**. Use **UTF-8 e sintaxe Java 11**, sem bibliotecas externas. Envie as
classes da solução juntas, sem testes e sem nomes de arquivo repetidos.

O servidor verifica a compilação e calcula as métricas. **Os testes de aceitação
dos katas continuam separados:** a análise estrutural não comprova correção funcional.
Cada envio gera um relatório independente; use o resultado final de cada trial
para evitar duplicidade na consolidação. Fontes enviados e relatórios são armazenados
no computador hospedeiro e ignorados pelo Git.

## Executar localmente

Requisitos: **Windows, Node.js 20+ e JDK 17+** (validado com JDK 21), com `node`,
`java` e `javac` disponíveis no terminal.

```powershell
git clone https://github.com/IsabellaLDias/assistente-ia-vs-codificacao-manual.git
cd assistente-ia-vs-codificacao-manual
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-metrics.ps1
npm start
```

Abra [http://127.0.0.1:3010/](http://127.0.0.1:3010/). Após a preparação inicial,
também é possível iniciar com `iniciar-app.bat`. Não há dependências npm para instalar.
O bootstrap prepara as versões fixadas de CK/PMD em `tools/`.

### Executar com Docker (alternativa multiplataforma)

Como alternativa para rodar o sistema sem precisar instalar JDK ou ferramentas locais no computador hospedeiro (compatível com Linux, macOS e Windows):

```bash
# Opção 1: Usando Docker Compose (recomendado)
docker compose up --build

# Opção 2: Usando Docker diretamente
docker build -t lab02-metricas .
docker run -p 3010:3010 lab02-metricas
```

O container já vem com Node.js 20, OpenJDK 17, PowerShell Core (`pwsh`) e os analisadores pré-configurados (CK 0.7.0 e PMD 7.26.0). Abra [http://localhost:3010/](http://localhost:3010/).

Para rodar a suíte de testes dentro do container:
```bash
docker run --rm lab02-metricas npm run test:web
```

## Hospedagem no A.R.S.E.N.A.L

O Node.js e os analisadores Java executam no computador hospedeiro. O A.R.S.E.N.A.L
gerencia o processo e publica a rota através do Cloudflare Tunnel.

| Campo no painel | Valor |
| --- | --- |
| Nome | LAB02 · IA vs. codificação manual |
| Rota | `lab02` |
| Pasta | Raiz do clone deste repositório |
| Comando | `npm start` |
| Porta | `4115` |
| Prefixo | Manter `/lab02` |
| Inicialização automática | Ativada |
| Variável de ambiente | `LAB_PUBLIC_ORIGIN=https://arsenal.dev.br` |

O gateway fornece `PORT`, `ARSENAL_ROUTE` e `ARSENAL_PROXY_TOKEN`. O backend valida
o token do gateway e a origem dos pedidos. O site não possui login de usuários.
O servidor processa uma análise por vez, com limite de 90 segundos por execução.
Após atualizar o código, reinicie o app no painel.

## Estrutura e documentação

| Caminho | Conteúdo |
| --- | --- |
| [`cronometro/`](cronometro/) | Cronômetro e histórico local |
| [`web/`](web/) | Servidor, API, menu e interface de métricas |
| [`scripts/`](scripts/) | Preparação, coleta e validação |
| [`examples/metrics-fixture/`](examples/metrics-fixture/) | Classe com métricas conhecidas |
| `data/web-jobs/` | Fontes e relatórios dos envios, ignorados pelo Git |
| [`METRICAS.md`](METRICAS.md) | Instalação detalhada e coleta pela linha de comando |
| [`docs/desenho-experimento.md`](docs/desenho-experimento.md) | Desenho do experimento, hipóteses, katas e ameaças |
| [`docs/metricas-estaticas.md`](docs/metricas-estaticas.md) | Definições e protocolo de medição de código |
| [`katas/`](katas/) | Exercícios autorais (SmartPark e EcoFrete) e testes JUnit |

## Validação

Com as ferramentas preparadas:

```powershell
npm run build
npm run test:web
```

Os testes verificam uploads, análise real com CK/PMD, downloads, código inválido
e integração com o gateway. Para validar o coletor separadamente:

```powershell
.\scripts\validate-metrics.ps1
.\scripts\test-metrics.ps1
```

## Colaboração

O site integra o cronômetro de **Isabella Dias** e o ambiente, scripts e interface
de métricas de **Leandro Alencar**. Rastreabilidade:
[issue #1](https://github.com/IsabellaLDias/assistente-ia-vs-codificacao-manual/issues/1)
e [issue #2](https://github.com/IsabellaLDias/assistente-ia-vs-codificacao-manual/issues/2).
