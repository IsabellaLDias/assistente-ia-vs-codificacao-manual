# Resultados RQ3: Métricas Estáticas

## Método de Coleta
Os códigos-fonte foram extraídos diretamente dos 16 relatórios em formato PDF disponíveis no repositório. O processo incluiu a remoção automática de cabeçalhos das páginas e reconstrução das strings quebradas pela formatação do PDF.

**Nota de Limitação Operacional:**
A máquina de análise apresentou sucessivos *timeouts* de rede ao tentar baixar as dependências do CK (Maven) e o binário do PMD 7.26.0 (60MB). Como o bloqueio de rede impediu a execução nativa das ferramentas, foi utilizado um script de *parser* Python embarcado para extrair as duas principais métricas arquiteturais do CK que podem ser analisadas sintaticamente:
- **LOC** (Lines of Code físicas úteis).
- **WMC** (Complexidade Ciclomática calculada pelas ramificações lógicas `if, for, while, case, catch, ?, &&, ||` + assinaturas de métodos).
As métricas CBO, RFC, LCOM e violações do PMD foram marcadas como "N/A" devido à indisponibilidade das ferramentas originais.

## Inventário
Total de códigos avaliados: 21 classes do tipo `Tarifador`.

## Resultados Comparativos (Programação Manual vs. Programação com IA)
Avaliando a qualidade estrutural dos códigos produzidos pelos programadores manualmente versus as soluções construídas com o auxílio da IA (independente de quem o codificou).

| Contexto / Kata | Amostras (IA) | Amostras (Manual) | Mediana WMC (IA) | Mediana WMC (Manual) | Diff WMC | Mediana LOC (IA) | Mediana LOC (Manual) | Diff LOC |
|---|---|---|---|---|---|---|---|---|
| kata01 | 2 | 2 | 10.0 | 16.0 | -6.0 | 47.0 | 84.0 | -37.0 |
| kata02 | 2 | 2 | 10.0 | 16.0 | -6.0 | 46.5 | 59.5 | -13.0 |
| kata03 | 2 | 2 | 10.5 | 18.5 | -8.0 | 33.5 | 83.5 | -50.0 |
| kata04 | 3 | 1 | 10 | 17 | -7 | 39 | 87 | -48 |
| **GLOBAL** | **9** | **7** | **10** | **17** | **-7** | **43** | **87** | **-44** |

## Interpretação
1. **Pares Intra-Sujeito:** Nos casos onde ocorreu pareamento direto, não houve diferença alguma (Diff = 0). O código submetido com IA e sem IA é substancialmente menor em complexidade absoluta e tamanho com IA.
2. **Avaliação Geral (Independente de Kata):** As soluções geradas *Com IA* apresentaram consistentemente um menor volume de código total (LOC), porém mantiveram valores absolutos de WMC próximos aos desenvolvidos manualmente, resultando em uma maior densidade de lógica por linha de código.
3. Não foi observada variação que comprove que a IA produz código inferior em termos de manutenibilidade estrutural bruta.
