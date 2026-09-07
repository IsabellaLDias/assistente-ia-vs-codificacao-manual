# Protocolo de métricas estáticas — RQ3

## Objetivo

Avaliar se o tratamento COM_IA altera a complexidade ciclomática ou a
duplicação do código final em comparação com SEM_IA. A unidade de observação
é um trial: um participante, uma kata e um tratamento.

## Configuração congelada

| Item | Decisão |
| --- | --- |
| Linguagem | JDK 21 executando fontes Java 11, UTF-8, sem bibliotecas externas |
| Complexidade | CK 0.7.0 |
| Duplicação | PMD CPD 7.26.0 |
| Limiar CPD | 50 tokens |
| Comparação CPD | Cópia literal; não usar flags para ignorar identificadores, literais ou anotações |
| Escopo | Somente arquivos .java do código de produção do trial |
| Construtores | Excluídos da média de complexidade por padrão |

O limiar de 50 tokens pode ser testado no piloto da S01, mas deve ficar fixo
antes da execução oficial da S02. Mudá-lo entre trials invalida a comparação.

## Execução por trial

1. Copie o código final do participante para a pasta exclusiva daquele trial.
2. Execute os testes de aceitação do kata e encerre o trial conforme o
   protocolo de tempo.
3. Execute collect-static-metrics.ps1 sobre o diretório src/main/java daquele
   trial.
4. Faça commit da linha adicionada ao CSV e da pasta correspondente em
   data/metrics/raw, referenciando a Issue do trial.

O coletor preserva um snapshot dos arquivos de produção junto aos relatórios. Pastas
test, tests, target, build, out, .git, .idea e .gradle são excluídas. Isso
impede que testes, binários e artefatos de IDE contaminem os indicadores.

## Definição dos indicadores

| Campo do CSV | Definição |
| --- | --- |
| loc_physical | Total de linhas físicas, incluindo comentários e vazias. Usa a mesma unidade dos intervalos do CPD e é o denominador da duplicação. |
| loc_ck_sloc | Soma de SLOC do CK quando há uma única classe por arquivo; vazio quando há múltiplas classes, para não somar intervalos sobrepostos. |
| ck_wmc_mean | Média da coluna wmc de method.csv do CK, isto é, complexidade McCabe média por método. |
| ck_wmc_median, ck_wmc_max, ck_wmc_sum | Estatísticas auxiliares dos mesmos valores de WMC. |
| cpd_duplicated_lines_unique | União das linhas de todas as ocorrências presentes no XML do CPD. As duas cópias contam; blocos sobrepostos não são contados duas vezes. |
| cpd_duplication_pct_physical | 100 × cpd_duplicated_lines_unique / loc_physical. |

O relatório XML do CPD é preservado porque contém line e endline para cada
ocorrência. O script falha se PMD registrar erro de análise, em vez de gravar
zero de maneira enganosa.

O CK calcula SLOC por classe. Classes internas podem estar
incluídas no LOC da classe externa, por isso loc_physical é o controle
principal de tamanho. loc_ck_sloc só é agregado quando não há ambiguidade de
classes sobrepostas. A limitação deve ser registrada no relatório; não imponha
mudanças ao código final do participante para obter uma métrica.

O script valida a compilação em Java 11 antes da análise, sem executar o código
nem processadores de anotações. Um trial que não compila permanece no experimento:
preserve seu tempo e resultado dos testes e registre RQ3 como indisponível. O
coletor deixa failure.json e logs, sem inventar zeros no CSV. Essa ausência deve
ser contabilizada por tratamento na S03. Não conserte o código após o time-box.

Comentários de supressão do CPD (CPD-OFF/ON) não devem ser usados nos trials.
Código inicial fornecido pelo grupo deve ter escopo previamente definido e
constante; arquivos compartilhados devem ficar fora de SourceDir.

## Formato consolidado

data/metrics/static_metrics.csv possui uma linha por trial e inclui:

~~~text
schema_version,trial_id,participante,kata,tratamento,source_sha256,
source_java_files,analysis_utc,java_version,ck_version,pmd_version,constructors_included,
loc_physical,loc_ck_sloc,ck_method_count,ck_wmc_sum,ck_wmc_mean,
ck_wmc_median,ck_wmc_max,cpd_min_tokens,cpd_duplication_groups,
cpd_occurrences,cpd_duplicated_lines_unique,
cpd_duplication_pct_physical,status,artifacts_dir
~~~

source_sha256 identifica exatamente o conjunto de fontes analisado. A pasta
apontada por artifacts_dir contém class.csv, method.csv, cpd.xml, logs, o
manifesto dos fontes e metadados da execução.

## Análise prevista para S03

Para cada tratamento, relatar mediana e IQR de ck_wmc_mean,
cpd_duplication_pct_physical e loc_physical. Como o experimento é
within-subject, a comparação inferencial deve parear as observações
equivalentes e usar Wilcoxon, conforme o enunciado. LOC não deve ser usado para
concluir sozinho sobre qualidade: ele controla a interpretação de complexidade
e duplicação.

## Rastreabilidade no GitHub Projects

Crie uma Issue da S01 para este artefato, atribua-a à pessoa responsável pelas
métricas e faça o commit com referência ao número da Issue. Durante a S02,
cada trial também deve ter sua própria Issue, com o CSV e os relatórios brutos
ligados ao cartão correspondente.

## Referências das ferramentas

- [CK e definição das métricas](https://github.com/mauricioaniche/ck/tree/ck-0.7.0)
- [Parser Java 11 do CK 0.7.0](https://github.com/mauricioaniche/ck/blob/ck-0.7.0/src/main/java/com/github/mauricioaniche/ck/CK.java)
- [Comandos CPD](https://docs.pmd-code.org/pmd-doc-7.26.0/pmd_userdocs_cpd.html)
- [Formato XML CPD](https://docs.pmd-code.org/pmd-doc-7.26.0/pmd_userdocs_cpd_report_formats.html)
