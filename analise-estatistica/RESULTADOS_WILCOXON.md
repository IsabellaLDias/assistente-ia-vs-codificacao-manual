# S03 — Testes estatísticos de RQ1 e RQ2

## Base analisada

A unidade pareada é `participante × kata`. O banco possui quatro pares completos com resultados funcionais explicitamente registrados, todos de Luis Henrique Gonçalves Barbosa. Os três registros demonstrativos de Leandro foram excluídos. Não foi feita imputação para trials sem resultado de testes.

O script reproduzível é `wilcoxon_rq1_rq2.py` e a entrada está em `dados_pareados_rq1_rq2.csv`.

## RQ1 — Tempo de conclusão

**Pergunta:** o uso de IA reduz o tempo necessário para concluir o kata?

- H0: `tempo(COM_IA) = tempo(SEM_IA)`.
- H1 direcional: `tempo(COM_IA) < tempo(SEM_IA)`.
- Teste: Wilcoxon signed-rank exato, pareado, unicaudal à esquerda.
- Nível de significância: α = 0,05.
- Pares: n = 4.
- Mediana SEM_IA: 1.332,5 s (22:12,5).
- Mediana COM_IA: 58,5 s (00:58,5).
- Redução entre medianas: 1.274 s (21:14), equivalente a 95,6%.
- Mediana das diferenças pareadas `COM_IA − SEM_IA`: −1.271,5 s.
- Estatística: W+ = 0, W− = 10 e W mínimo = 0.
- p exato unicaudal: **0,0625**.
- p bilateral de referência: 0,1250.
- Correlação rank-biserial para `COM_IA − SEM_IA`: **−1,00**, indicando que todos os pares favoreceram menor tempo com IA.

**Decisão:** como `p = 0,0625 > 0,05`, não se rejeita H0 no nível de 5%. Há um efeito descritivo grande e consistente na direção prevista, mas quatro pares de um único participante não fornecem poder suficiente para afirmar significância estatística.

## RQ2 — Taxa de sucesso nos testes

**Pergunta:** o uso de IA altera a proporção de testes de aceitação aprovados?

- H0: `taxa(COM_IA) = taxa(SEM_IA)`.
- H1 bilateral: `taxa(COM_IA) ≠ taxa(SEM_IA)`.
- Pares documentados: n = 4.
- SEM_IA: 8/8 testes aprovados em todos os katas.
- COM_IA: 8/8 testes aprovados em todos os katas.
- Diferenças pareadas: `[0, 0, 0, 0]`.

**Resultado:** o Wilcoxon não é calculável porque todas as diferenças são zero e, após a remoção dos empates, não sobra nenhum posto não nulo. Não se deve inventar `p = 1`. Descritivamente, não houve diferença observada: os dois tratamentos alcançaram 100% nos quatro pares. A evidência é insuficiente para concluir equivalência, pois só há um participante com resultados completos.

## Comando de reprodução

```powershell
py analise-estatistica/wilcoxon_rq1_rq2.py
```

O comando também gera `resultado_wilcoxon.json`, adequado para consumo pelo dashboard.
