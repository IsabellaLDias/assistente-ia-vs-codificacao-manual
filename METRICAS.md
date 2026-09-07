# LAB02 — métricas estáticas (RQ3)

Esta pasta contém o artefato da S01 referente à preparação do ambiente e à
coleta reproduzível de métricas estáticas por trial.

## App no navegador

Abra iniciar-app.bat ou execute npm start na raiz do projeto. Acesse
[o app local](http://127.0.0.1:3010). Requer Node.js 20+, Windows, JDK e o
ambiente de métricas preparado conforme abaixo. Não há dependências npm para instalar.

Preencha participante, kata e tratamento, selecione uma ou mais classes .java e
clique em Analisar código. O botão Usar exemplo carrega uma classe de validação.
O app verifica compilação, executa CK e PMD CPD e mostra LOC, complexidade,
duplicação e uma tabela por método. CSV e JSON podem ser baixados ao concluir.

Cada envio tem seu próprio CSV e é preservado em data/web-jobs; repetições são
análises independentes. Exporte apenas o resultado final de cada trial para o
repositório do grupo, evitando duplicar medições na S03. O CSV global do coletor
de linha de comando não é alterado pela interface. Os relatórios brutos seguem
em data/metrics/raw; os envios originais ficam locais, ignorados pelo Git.

São aceitos até 20 arquivos de 100 KB cada, com envio total de até 1 MB. Arquivos
com nomes repetidos devem ser analisados pelo coletor CLI com suas pastas.
O programa enviado não é executado: a correção funcional depende dos testes de
aceitação de cada kata, que ainda não estão integrados ao app.

A interface atende somente neste computador (127.0.0.1). Publicar para o grupo
requer um servidor com Java, isolamento das análises e controle de acesso. A
hospedagem Sites/Cloudflare Workers não executa os processos CK/PMD deste projeto.

Validação do app: npm run build e npm run test:web. O segundo comando executa
análises reais e verifica upload, exportação e tratamento de código inválido.

## Escolha de ambiente

- Ambiente: JDK 21; katas com sintaxe Java 11, em UTF-8, sem bibliotecas externas.
- Complexidade: CK 0.7.0.
- Duplicação: PMD CPD 7.26.0.
- Bootstrap do CK: Maven 3.9.11 portátil, usado apenas dentro de tools.

O computador já possui JDK 21, então Java + CK + PMD CPD é a alternativa
diretamente prevista no enunciado e evita depender de uma instalação local de
Python/Radon. As versões estão fixadas nos scripts; não devem mudar depois do
piloto da S01.

O CK 0.7.0 usa o parser Java 11. O coletor valida os fontes com javac
--release 11 antes da análise. Records, text blocks e outros recursos posteriores
não são aceitos nesta configuração. A escolha da linguagem ainda deve ser
confirmada pelo grupo antes dos trials oficiais.

## Preparar o ambiente

Em PowerShell, na raiz do repositório:

~~~powershell
.\scripts\setup-metrics.ps1
~~~

O comando baixa PMD, Maven e o código-fonte do CK, compila o JAR do CK e salva
tudo em tools. Nada é instalado globalmente no Windows.

Se a política de execução bloquear scripts locais, use apenas nesta sessão:

~~~powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup-metrics.ps1
~~~

Para comprovar a instalação antes dos trials oficiais:

~~~powershell
.\scripts\validate-metrics.ps1
.\scripts\test-metrics.ps1
~~~

O fixture de validação contém uma duplicação intencional. A validação só
termina com sucesso se CK e CPD encontrarem as métricas esperadas.
O segundo comando verifica mediana, sobreposição de clones, ausência de métodos,
erros de análise, recusa de trials repetidos e preservação do CSV em caso de falha.

## Coletar um trial

Passe sempre o diretório que contém apenas o código de produção do trial,
normalmente src/main/java. Não passe a raiz de todos os trials nem diretórios
de teste.

~~~powershell
.\scripts\collect-static-metrics.ps1 -SourceDir .\trials\leandro\kata01\COM_IA\src\main\java -Participant Leandro -Kata kata01 -Treatment COM_IA
~~~

Tratamentos válidos são COM_IA e SEM_IA. O coletor recusa repetir a mesma
combinação participante/kata/tratamento para impedir linhas duplicadas. Em uma
reexecução legítima, use o parâmetro explícito -ReplaceExisting.

O resultado consolidado vai para data/metrics/static_metrics.csv; os
artefatos brutos de cada execução ficam em data/metrics/raw. Ambos devem ser
versionados no repositório do grupo para manter a rastreabilidade do
experimento. Apenas ferramentas baixadas e o CSV da validação local são
ignorados pelo Git.

## Estrutura recomendada

~~~text
trials/
  participante/
    kata/
      COM_IA/
        src/main/java/
      SEM_IA/
        src/main/java/
data/metrics/
  static_metrics.csv
  raw/
scripts/
~~~

Consulte [o protocolo de métricas](docs/metricas-estaticas.md) para as
definições, cálculo dos campos e regras metodológicas que podem ser copiadas
para o desenho experimental e o relatório.
