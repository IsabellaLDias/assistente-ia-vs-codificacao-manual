# S03 — Testes estatísticos de RQ1 e RQ2

## RQ1 — Tempo de conclusão

**Pergunta:** o uso de IA reduz o tempo necessário para concluir os katas?

Os tempos de cada integrante foram consolidados pela mediana de seus katas em cada tratamento. A comparação pareada utiliza Isabella, Leandro e Luis como as três unidades experimentais.

| Integrante | Mediana SEM_IA | Mediana COM_IA | Diferença COM_IA − SEM_IA |
|---|---:|---:|---:|
| Isabella | 1.853,0 s | 38,5 s | −1.814,5 s |
| Leandro | 1.366,0 s | 58,0 s | −1.308,0 s |
| Luis | 1.332,5 s | 58,5 s | −1.274,0 s |

- H0: `tempo(COM_IA) = tempo(SEM_IA)`.
- H1 direcional: `tempo(COM_IA) < tempo(SEM_IA)`.
- Teste: Wilcoxon signed-rank exato, pareado, unicaudal à esquerda.
- Nível de significância: α = 0,05.
- Pares: n = 3 integrantes.
- Mediana das medianas SEM_IA: 1.366 s (22:46).
- Mediana das medianas COM_IA: 58 s (00:58).
- Redução entre medianas: 1.308 s (21:48), equivalente a 95,8%.
- Estatística: W+ = 0, W− = 6 e W mínimo = 0.
- p exato unicaudal: **0,1250**.
- p bilateral de referência: 0,2500.
- Correlação rank-biserial para `COM_IA − SEM_IA`: **−1,00**, pois os três integrantes foram mais rápidos com IA.

**Decisão:** como `p = 0,1250 > 0,05`, não se rejeita H0 no nível de 5%. Os três pares apresentam redução consistente e de grande magnitude, mas a amostra de três integrantes ainda é insuficiente para demonstrar significância estatística.

## RQ2 — Taxa de sucesso nos testes

**Pergunta:** o uso de IA altera a proporção de testes de aceitação aprovados?

As suítes JUnit foram executadas sobre os códigos entregues pelos três integrantes. Todos os trials alcançaram 100% de aprovação nas duas condições: Isabella obteve 16/16 em cada condição; Leandro, 8/8 sem IA e 24/24 com IA; Luis, 32/32 em cada condição.

- H0: `taxa(COM_IA) = taxa(SEM_IA)`.
- H1 bilateral: `taxa(COM_IA) ≠ taxa(SEM_IA)`.
- Pares: n = 3 integrantes.
- Taxas SEM_IA: `[100%, 100%, 100%]`.
- Taxas COM_IA: `[100%, 100%, 100%]`.
- Diferenças pareadas: `[0, 0, 0]`.

**Resultado:** o Wilcoxon não é calculável porque todas as diferenças são zero e não há postos não nulos. Descritivamente, não houve diferença: os dois tratamentos alcançaram 100% de aprovação para os três integrantes. Esse resultado sustenta igualdade observada na amostra, mas não constitui prova estatística de equivalência.

## Reprodução

```powershell
py analise-estatistica/wilcoxon_rq1_rq2.py
```

O script lê `dados_pareados_rq1_rq2.csv` e gera `resultado_wilcoxon.json`, que pode ser consumido diretamente pelo dashboard.
