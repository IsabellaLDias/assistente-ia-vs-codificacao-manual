# Assistente de IA vs. codificação manual

Repositório do experimento controlado da disciplina Laboratório de
Experimentação de Software.

## Artefatos da S01

Execute `iniciar-app.bat` ou `npm start` e abra http://127.0.0.1:3010/.
O menu reúne o cronômetro e a análise de métricas no mesmo site. A troca de
tela preserva a sessão do cronômetro e os arquivos da análise enquanto a página
permanecer aberta. Recarregar ou fechar a página encerra o estado em andamento;
os resultados já salvos do cronômetro ficam no navegador.

- [Cronômetro e coleta de tempo](cronometro/)
- [Ambiente, coleta e aplicação web de métricas estáticas](METRICAS.md)

A aplicação de métricas mede LOC, complexidade ciclomática com CK e duplicação
com PMD CPD. O código enviado é compilado para validação, mas os testes de
aceitação de cada kata continuam sendo executados separadamente.
