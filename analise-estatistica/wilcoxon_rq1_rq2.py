"""Testes de Wilcoxon pareados para RQ1 e RQ2 do LAB02.

Implementação exata e sem dependências externas. O cálculo enumera as 2^n
atribuições possíveis de sinais dos postos sob H0. Diferenças iguais a zero são
removidas, conforme o procedimento tradicional do signed-rank test.
"""

from __future__ import annotations

import csv
import itertools
import json
import math
from pathlib import Path
from statistics import median


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "dados_pareados_rq1_rq2.csv"
OUTPUT = ROOT / "resultado_wilcoxon.json"
ALPHA = 0.05


def percentile_linear(values: list[float], percentile: float) -> float:
    """Percentil com interpolação linear, equivalente ao padrão do NumPy."""
    ordered = sorted(values)
    if not ordered:
        raise ValueError("A amostra está vazia.")
    position = (len(ordered) - 1) * percentile
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    fraction = position - lower
    return ordered[lower] + fraction * (ordered[upper] - ordered[lower])


def average_ranks(values: list[float]) -> list[float]:
    """Retorna postos crescentes, usando a média para empates."""
    indexed = sorted(enumerate(values), key=lambda item: item[1])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(indexed):
        j = i + 1
        while j < len(indexed) and indexed[j][1] == indexed[i][1]:
            j += 1
        average = ((i + 1) + j) / 2
        for k in range(i, j):
            ranks[indexed[k][0]] = average
        i = j
    return ranks


def wilcoxon_exact(before: list[float], after: list[float], alternative: str) -> dict:
    """Wilcoxon signed-rank exato para amostras pareadas.

    A diferença é definida como ``after - before``. Para RQ1, ``before`` é
    SEM_IA, ``after`` é COM_IA e a alternativa é ``less``.
    """
    if len(before) != len(after):
        raise ValueError("As amostras pareadas precisam ter o mesmo tamanho.")
    if alternative not in {"less", "greater", "two-sided"}:
        raise ValueError("Alternativa inválida.")

    all_differences = [a - b for b, a in zip(before, after)]
    differences = [d for d in all_differences if d != 0]
    zero_count = len(all_differences) - len(differences)
    if not differences:
        return {
            "aplicavel": False,
            "motivo": "Todas as diferenças pareadas são zero; não há postos não nulos para o teste de Wilcoxon.",
            "n_pares": len(all_differences),
            "n_nao_nulos": 0,
            "zeros_descartados": zero_count,
        }

    ranks = average_ranks([abs(d) for d in differences])
    w_plus = sum(rank for rank, difference in zip(ranks, differences) if difference > 0)
    w_minus = sum(rank for rank, difference in zip(ranks, differences) if difference < 0)
    possible_w_plus = []
    for signs in itertools.product((0, 1), repeat=len(ranks)):
        possible_w_plus.append(sum(rank for rank, positive in zip(ranks, signs) if positive))
    tolerance = 1e-12
    p_less = sum(value <= w_plus + tolerance for value in possible_w_plus) / len(possible_w_plus)
    p_greater = sum(value >= w_plus - tolerance for value in possible_w_plus) / len(possible_w_plus)
    p_value = {
        "less": p_less,
        "greater": p_greater,
        "two-sided": min(1.0, 2 * min(p_less, p_greater)),
    }[alternative]
    rank_total = w_plus + w_minus

    return {
        "aplicavel": True,
        "alternativa": alternative,
        "n_pares": len(all_differences),
        "n_nao_nulos": len(differences),
        "zeros_descartados": zero_count,
        "diferencas_after_menos_before": all_differences,
        "postos_absolutos": ranks,
        "W_positivo": w_plus,
        "W_negativo": w_minus,
        "W_minimo": min(w_plus, w_minus),
        "p_exato": p_value,
        "p_bilateral": min(1.0, 2 * min(p_less, p_greater)),
        "rank_biserial_after_menos_before": (w_plus - w_minus) / rank_total,
        "alpha": ALPHA,
        "rejeita_H0": p_value < ALPHA,
    }


def describe(values: list[float]) -> dict:
    q1 = percentile_linear(values, 0.25)
    q3 = percentile_linear(values, 0.75)
    return {
        "n": len(values),
        "mediana": median(values),
        "q1": q1,
        "q3": q3,
        "iqr": q3 - q1,
        "minimo": min(values),
        "maximo": max(values),
    }


def main() -> None:
    with DATA.open(encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))

    time_without_ai = [float(row["tempo_sem_ia_mediana_s"]) for row in rows]
    time_with_ai = [float(row["tempo_com_ia_mediana_s"]) for row in rows]
    success_without_ai = [
        int(row["testes_sem_ia_aprovados"]) / int(row["testes_sem_ia_total"])
        for row in rows
    ]
    success_with_ai = [
        int(row["testes_com_ia_aprovados"]) / int(row["testes_com_ia_total"])
        for row in rows
    ]

    rq1 = wilcoxon_exact(time_without_ai, time_with_ai, alternative="less")
    rq1["hipotese"] = "H1: tempo(COM_IA) < tempo(SEM_IA)"
    rq1["sem_ia_segundos"] = describe(time_without_ai)
    rq1["com_ia_segundos"] = describe(time_with_ai)
    rq1["reducao_entre_medianas_segundos"] = median(time_without_ai) - median(time_with_ai)
    rq1["reducao_entre_medianas_percentual"] = (
        (median(time_without_ai) - median(time_with_ai)) / median(time_without_ai) * 100
    )
    rq1["mediana_diferencas_pareadas_segundos"] = median(
        [with_ai - without_ai for without_ai, with_ai in zip(time_without_ai, time_with_ai)]
    )

    rq2 = wilcoxon_exact(success_without_ai, success_with_ai, alternative="two-sided")
    rq2["hipotese"] = "H1: taxa(COM_IA) != taxa(SEM_IA)"
    rq2["sem_ia"] = describe(success_without_ai)
    rq2["com_ia"] = describe(success_with_ai)

    result = {
        "fonte": DATA.name,
        "unidade_pareada": "participante",
        "participantes": [row["participante"] for row in rows],
        "validacao_rq2": {
            "reexecutada_em": "2026-09-20",
            "trials_executados": 16,
            "casos_aprovados": 128,
            "casos_executados": 128,
            "observacao": (
                "Suítes JUnit reexecutadas após a atualização dos quatro "
                "códigos manuais do Luis."
            ),
        },
        "rq1_tempo": rq1,
        "rq2_corretude": rq2,
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("RQ1 — Wilcoxon unicaudal (COM_IA < SEM_IA)")
    print(f"n = {rq1['n_pares']}; W+ = {rq1['W_positivo']:.1f}; p exato = {rq1['p_exato']:.4f}")
    print(f"p bilateral de referência = {rq1['p_bilateral']:.4f}")
    print(f"rank-biserial (COM_IA - SEM_IA) = {rq1['rank_biserial_after_menos_before']:.2f}")
    print(f"rejeita H0 em alpha=0,05? {'sim' if rq1['rejeita_H0'] else 'não'}")
    print()
    print("RQ2 — Wilcoxon bilateral")
    if rq2["aplicavel"]:
        print(f"p exato = {rq2['p_exato']:.4f}")
    else:
        print(rq2["motivo"])
    print(f"Resultado salvo em: {OUTPUT}")


if __name__ == "__main__":
    main()
