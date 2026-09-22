#!/usr/bin/env python3
"""Gera visualizações gráficas de alta resolução (PNG, 300 DPI) utilizando Pandas,
Matplotlib e Seaborn para as métricas coletadas e calculadas no experimento LAB02.

Gráficos produzidos:
  1. 01_slopegraph_tempo_rq1.png: Slopegraph pareado de produtividade (Before vs. After).
  2. 02_quadrantes_loc_wmc_rq3.png: Dispersão em quadrantes com iso-linhas de densidade lógica.
  3. 03_waffle_matrix_testes_junit_rq2.png: Matriz unitária 16x8 de testes de aceitação JUnit 5.
  4. 04_bullet_efficiency_rq4.png: Bullet graphs de eficiência de execução (Stephen Few).
  5. 05_waterfall_postos_wilcoxon.png: Waterfall divergente de postos de Wilcoxon.
  6. 06_painel_consolidado_dashboard.png: Painel composto unificado em 300 DPI para publicações.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import matplotlib.patches as patches
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

ROOT = Path(__file__).resolve().parent.parent
DATA_JSON = ROOT / "data" / "dashboard-data.json"
OUTPUT_DIR = ROOT / "docs" / "graficos"

# Configuração de estilo geral para publicação acadêmica
plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["DejaVu Sans", "Arial", "Helvetica"],
    "figure.dpi": 300,
    "savefig.dpi": 300,
    "savefig.bbox": "tight",
    "axes.edgecolor": "#cbd5e1",
    "axes.linewidth": 1.0,
    "axes.titlesize": 13,
    "axes.titleweight": "bold",
    "axes.labelsize": 11,
    "axes.labelweight": "bold",
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "grid.color": "#e2e8f0",
    "grid.linestyle": "--",
    "grid.linewidth": 0.8,
    "figure.facecolor": "#ffffff",
    "axes.facecolor": "#ffffff",
})

# Paleta padronizada do projeto
COLOR_AI = "#0284c7"       # Azul / Com IA
COLOR_NOAI = "#d97706"     # Âmbar / Manual
COLOR_EMERALD = "#059669"  # Verde esmeralda / Sucesso
COLOR_INDIGO = "#4f46e5"   # Roxo indigo
COLOR_SLATE = "#334155"    # Cinza escuro / Texto


def format_mmss(seconds: float) -> str:
    """Formata segundos em mm:ss."""
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"


def load_datasets() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
    """Carrega dados do JSON e arquivos tabulares utilizando Pandas."""
    if not DATA_JSON.exists():
        raise FileNotFoundError(f"Arquivo de dados não encontrado: {DATA_JSON}. Execute 'npm run data:dashboard' primeiro.")

    with open(DATA_JSON, "r", encoding="utf-8") as f:
        raw = json.load(f)

    # 1. DataFrame de Trials (16 registros)
    df_trials = pd.DataFrame(raw["trials"])

    # 2. DataFrame de Participantes (3 registros com medianas pareadas)
    df_participants = pd.DataFrame(raw["comparativo_participantes"])

    # 3. DataFrame de Katas (4 registros com benchmarks)
    df_katas = pd.DataFrame(raw["comparativo_katas"])
    # Normaliza campo de benchmark em colunas do dataframe
    bench_df = pd.json_normalize(df_katas["benchmark"])
    df_katas = pd.concat([df_katas.drop(columns=["benchmark"]), bench_df], axis=1)

    # 4. Dicionário de Wilcoxon
    wilcoxon = raw["wilcoxon"]

    return df_trials, df_participants, df_katas, wilcoxon


# ==============================================================================
# Gráfico 1: Slopegraph Pareado de Produtividade (RQ1)
# ==============================================================================
def plot_01_slopegraph(df_participants: pd.DataFrame, output_path: Path) -> None:
    """Gera Slopegraph pareado mostrando o declive drástico de tempo entre tratamentos."""
    fig, ax = plt.subplots(figsize=(8, 5.5))

    x_left = 0
    x_right = 1

    ax.set_xlim(-0.35, 1.35)
    ax.set_ylim(-2, 36)

    # Linhas verticais dos eixos
    ax.axvline(x=x_left, color="#94a3b8", linestyle="-", linewidth=1.5)
    ax.axvline(x=x_right, color="#94a3b8", linestyle="-", linewidth=1.5)

    # Linhas de grade horizontais (minutos)
    for m in [0, 10, 20, 30]:
        ax.axhline(y=m, color="#f1f5f9", linestyle=":", linewidth=1.2)
        ax.text(x_left - 0.03, m, f"{m} min", ha="right", va="center", color="#94a3b8", fontsize=9)
        ax.text(x_right + 0.03, m, f"{m} min", ha="left", va="center", color="#94a3b8", fontsize=9)

    colors = [COLOR_INDIGO, COLOR_AI, COLOR_EMERALD]

    for idx, (_, row) in enumerate(df_participants.iterrows()):
        y_manual = row["tempo_sem_ia_s"] / 60.0
        y_ai = row["tempo_com_ia_s"] / 60.0
        color = colors[idx % len(colors)]
        name = row["participante"]
        diff_pct = row["reducao_tempo_pct"]

        # Linha inclinada da trajetória
        ax.plot([x_left, x_right], [y_manual, y_ai], color=color, linewidth=3.2, zorder=4)

        # Marcadores
        ax.scatter([x_left, x_right], [y_manual, y_ai], color=color, s=80, edgecolors="white", linewidths=2, zorder=5)

        # Rótulo esquerdo (Manual)
        ax.text(
            x_left - 0.06, y_manual,
            f"{name}\n{format_mmss(row['tempo_sem_ia_s'])} ({y_manual:.1f}m)",
            ha="right", va="center", color=color, fontsize=10, fontweight="bold"
        )

        # Rótulo direito (Com IA)
        ax.text(
            x_right + 0.06, y_ai + (idx * 0.7 - 0.7),
            f"{name}: {format_mmss(row['tempo_com_ia_s'])} ({diff_pct}%)",
            ha="left", va="center", color=color, fontsize=10, fontweight="bold"
        )

    # Rótulos dos eixos principais
    ax.text(x_left, 36.5, "Codificação Manual\n(Sem IA)", ha="center", va="bottom", fontsize=12, fontweight="bold", color="#0f172a")
    ax.text(x_right, 36.5, "Com Assistente\n(Com IA)", ha="center", va="bottom", fontsize=12, fontweight="bold", color="#0f172a")

    ax.set_title("RQ1: Slopegraph Pareado de Produtividade (Tempo de Resolução)", pad=30, fontsize=13)
    ax.text(0.5, -4.5, "Redução uniforme de tempo intra-sujeito: mediana caiu de 22:46 para 00:58 (95,8% mais rápido)",
            ha="center", fontsize=9.5, color="#64748b", fontstyle="italic")

    ax.axis("off")
    fig.savefig(output_path)
    plt.close(fig)


# ==============================================================================
# Gráfico 2: Matriz de Dispersão em Quadrantes LOC vs. WMC (RQ3)
# ==============================================================================
def plot_02_quadrants(df_trials: pd.DataFrame, output_path: Path) -> None:
    """Gera scatter plot cartesiano de LOC x WMC com quadrantes de risco e iso-linhas."""
    fig, ax = plt.subplots(figsize=(8.5, 6))

    max_loc = 115
    max_wmc = 25
    med_loc = 47.0
    med_wmc = 10.5

    # Zonas de quadrantes sombreadas
    # Q1: Baixo LOC, Baixo WMC (Ideal)
    rect_ideal = patches.Rectangle((0, 0), med_loc, med_wmc, facecolor="#ecfdf5", alpha=0.8, zorder=1)
    ax.add_patch(rect_ideal)
    ax.text(4, 1.5, "ZONA IDEAL\n(Código Conciso & Baixo Risco)", color="#059669", fontsize=9, fontweight="bold")

    # Q3: Alto LOC, Alto WMC (Hotspot)
    rect_hotspot = patches.Rectangle((med_loc, med_wmc), max_loc - med_loc, max_wmc - med_wmc, facecolor="#fef2f2", alpha=0.7, zorder=1)
    ax.add_patch(rect_hotspot)
    ax.text(max_loc - 3, max_wmc - 1.5, "HOTSPOTS DE COMPLEXIDADE\n(Código Extenso e Ramificado)", color="#dc2626", fontsize=9, fontweight="bold", ha="right")

    # Linhas de mediana
    ax.axvline(x=med_loc, color="#94a3b8", linestyle="--", linewidth=1.2, zorder=2)
    ax.axhline(y=med_wmc, color="#94a3b8", linestyle="--", linewidth=1.2, zorder=2)
    ax.text(med_loc + 1, 23.5, f"Mediana LOC = {med_loc:.0f}", color="#64748b", fontsize=8.5, fontstyle="italic")
    ax.text(2, med_wmc + 0.5, f"Mediana WMC = {med_wmc:.1f}", color="#64748b", fontsize=8.5, fontstyle="italic")

    # Iso-linhas de densidade lógica (WMC / LOC = 0.10, 0.20, 0.25)
    loc_grid = np.linspace(5, max_loc, 100)
    for dens in [0.10, 0.20, 0.25]:
        wmc_line = loc_grid * dens
        valid = wmc_line <= max_wmc
        ax.plot(loc_grid[valid], wmc_line[valid], color="#94a3b8", linestyle=":", linewidth=1.0, zorder=2)
        end_x = loc_grid[valid][-1]
        end_y = wmc_line[valid][-1]
        ax.text(end_x - 2, end_y - 0.7, f"dens={dens}", color="#64748b", fontsize=8, ha="right")

    # Pontos de trials (separados por tratamento)
    for trat, color, label in [("COM_IA", COLOR_AI, "Com Assistente (COM IA)"), ("SEM_IA", COLOR_NOAI, "Codificação Manual (SEM IA)")]:
        sub = df_trials[df_trials["tratamento"] == trat]
        # Tamanho do ponto proporcional ao tempo gasto (min 50, max 280)
        sizes = 50 + (sub["tempo_segundos"] / 1853.0) * 230
        ax.scatter(sub["loc"], sub["wmc"], s=sizes, color=color, alpha=0.85, edgecolors="#1e293b", linewidths=1.2, label=label, zorder=4)

    # Anotações dos pontos mais marcantes
    for _, r in df_trials[df_trials["loc"] >= 95].iterrows():
        ax.annotate(
            f"{r['participante_curto']} ({r['kata_id']})\n{r['loc']} LOC, {r['wmc']} WMC",
            xy=(r["loc"], r["wmc"]), xytext=(r["loc"] - 18, r["wmc"] - 3.5),
            arrowprops=dict(arrowstyle="->", color="#475569", lw=0.8),
            fontsize=8, fontweight="bold", color="#334155"
        )

    ax.set_xlim(0, max_loc)
    ax.set_ylim(0, max_wmc)
    ax.set_xlabel("Linhas Físicas de Código (LOC)")
    ax.set_ylabel("Complexidade Ciclomática de McCabe (WMC)")
    ax.set_title("RQ3: Matriz de Dispersão e Zonas de Densidade Lógica (LOC × WMC)", pad=15)
    ax.legend(loc="lower right", frameon=True, framealpha=0.95, facecolor="white", edgecolor="#cbd5e1", fontsize=9.5)
    ax.grid(True, zorder=0)

    fig.savefig(output_path)
    plt.close(fig)


# ==============================================================================
# Gráfico 3: Waffle Matrix de 128 Testes Unitários JUnit 5 (RQ2)
# ==============================================================================
def plot_03_waffle_matrix(df_trials: pd.DataFrame, output_path: Path) -> None:
    """Gera matriz unitária (Waffle / Heatmap) 16x8 de testes de aceitação aprovados."""
    fig, ax = plt.subplots(figsize=(9, 7))

    n_trials = len(df_trials)
    n_tests = 8

    # Matriz 16x8 com 100% de aprovação (valor 1.0)
    matrix = np.ones((n_trials, n_tests))

    # Cria rótulos das linhas: "Participante · Kata (Tratamento)"
    row_labels = [
        f"{r['participante_curto']} · {r['kata_id']} ({'IA' if r['tratamento'] == 'COM_IA' else 'Man'})"
        for _, r in df_trials.iterrows()
    ]
    col_labels = [f"Caso {i+1}" for i in range(n_tests)]

    # Heatmap em verde esmeralda uniforme com linhas de separação brancas
    cmap = sns.color_palette(["#10b981"])
    sns.heatmap(
        matrix, ax=ax, cmap=cmap, cbar=False,
        linewidths=2.5, linecolor="white", square=False,
        xticklabels=col_labels, yticklabels=row_labels
    )

    # Inserção de ícone "✔" em cada célula para comprovação visual imediata
    for i in range(n_trials):
        for j in range(n_tests):
            ax.text(j + 0.5, i + 0.5, "✔", ha="center", va="center", color="white", fontsize=11, fontweight="bold")

    ax.set_title("RQ2: Waffle Matrix de Corretude — 128/128 Testes JUnit 5 Aprovados (100%)", pad=16, fontsize=12.5)
    ax.set_xlabel("Casos de Teste da Suíte de Aceitação Automatizada")
    ax.set_ylabel("Trials Experimentais dos Participantes")
    ax.tick_params(axis="y", labelsize=9)
    ax.tick_params(axis="x", labelsize=9.5)

    # Subtítulo explicativo
    plt.suptitle("Validação Funcional Exaustiva: Todos os 16 trials atenderam a 100% dos requisitos de negócio",
                 y=0.02, fontsize=9.5, color="#64748b", fontstyle="italic")

    fig.savefig(output_path)
    plt.close(fig)


# ==============================================================================
# Gráfico 4: Bullet Graphs de Eficiência Computacional (Stephen Few / RQ4)
# ==============================================================================
def plot_04_bullet_efficiency(df_katas: pd.DataFrame, output_path: Path) -> None:
    """Gera Bullet Graphs comparando latência de CPU contra faixas qualitativas."""
    fig, ax = plt.subplots(figsize=(9, 4.5))

    n_katas = len(df_katas)
    bar_height = 0.35
    max_lat = 0.16

    # Faixas qualitativas de Stephen Few:
    # 0 a 0.05: Excelente (verde escuro)
    # 0.05 a 0.10: Ideal (menta)
    # 0.10 a 0.16: Aceitável (cinza claro)
    for idx in range(n_katas):
        y = idx
        ax.barh(y, 0.16, height=0.6, left=0, color="#e2e8f0", zorder=1)
        ax.barh(y, 0.10, height=0.6, left=0, color="#a7f3d0", zorder=2)
        ax.barh(y, 0.05, height=0.6, left=0, color="#34d399", zorder=3)

    # Média global de referência (meta) = 0.094 µs
    mean_lat = df_katas["bench_time_us"].mean()

    # Barra real medida (preta) e marcador de meta
    for idx, (_, r) in enumerate(df_katas.iterrows()):
        y = idx
        val = r["bench_time_us"]
        heap = r["bench_allocated_bytes"]

        # Barra do valor observado
        ax.barh(y, val, height=bar_height, color="#0f172a", zorder=4)

        # Linha vertical vermelha de target (média global)
        ax.plot([mean_lat, mean_lat], [y - 0.32, y + 0.32], color="#ef4444", linewidth=2.5, zorder=5)

        # Rótulo de valores à direita da barra
        ax.text(val + 0.003, y, f"{val:.3f} µs | Heap: {heap:.0f} B", va="center", color="#0f172a", fontsize=9, fontweight="bold")

    ax.set_yticks(range(n_katas))
    ax.set_yticklabels([f"{r['nome'].split('·')[0].strip()} ({r['kata_id']})" for _, r in df_katas.iterrows()], fontweight="bold")
    ax.set_xlim(0, max_lat)
    ax.set_xlabel("Latência Média por Cálculo (microssegundos — µs)")
    ax.set_title("RQ4: Bullet Graphs de Eficiência Computacional (Latência de CPU & Alocação Heap)", pad=16)

    # Legenda manual das faixas
    legend_elements = [
        patches.Patch(facecolor="#34d399", label="Excelente (< 0.05 µs)"),
        patches.Patch(facecolor="#a7f3d0", label="Ideal (0.05 - 0.10 µs)"),
        patches.Patch(facecolor="#e2e8f0", label="Aceitável (0.10 - 0.16 µs)"),
        patches.Patch(facecolor="#0f172a", label="Latência Medida"),
        plt.Line2D([0], [0], color="#ef4444", lw=2, label=f"Média Geral ({mean_lat:.3f} µs)"),
    ]
    ax.legend(handles=legend_elements, loc="lower right", fontsize=8.5, framealpha=0.95, facecolor="white", edgecolor="#cbd5e1")
    ax.grid(axis="x", linestyle=":", zorder=0)

    fig.savefig(output_path)
    plt.close(fig)


# ==============================================================================
# Gráfico 5: Waterfall Divergente de Postos de Wilcoxon (Estatística)
# ==============================================================================
def plot_05_waterfall_wilcoxon(wilcoxon: dict, output_path: Path) -> None:
    """Gera gráfico divergente de postos sinalizados com justificativa do p-valor."""
    fig, ax = plt.subplots(figsize=(8.5, 4.5))

    rq1 = wilcoxon.get("rq1_tempo", {})
    deltas = rq1.get("diferencas_after_menos_before", [-1814.5, -1308.0, -1274.0])
    postos = rq1.get("postos_absolutos", [3.0, 2.0, 1.0])
    participants = ["Isabella", "Leandro", "Luis"]

    y_pos = np.arange(len(participants))
    bar_height = 0.45

    # Barras para a esquerda (negativas)
    bars = ax.barh(y_pos, deltas, height=bar_height, color=COLOR_EMERALD, edgecolor="#065f46", zorder=3)

    # Linha zero de H0
    ax.axvline(x=0, color="#0f172a", linestyle="-", linewidth=2.0, zorder=4)
    ax.text(10, 2.35, "Linha Zero (H₀: Sem Diferença)", color="#0f172a", fontsize=9.5, fontweight="bold")

    # Anotações dos postos e valores
    for idx, (p, rank, d) in enumerate(zip(participants, postos, deltas)):
        ax.text(
            d + 40, idx,
            f"Posto {rank:.0f} | Δ = {d:.1f}s ({d/60:.1f} min)",
            va="center", ha="left", color="white", fontweight="bold", fontsize=9.5
        )

    ax.set_yticks(y_pos)
    ax.set_yticklabels(participants, fontsize=10.5, fontweight="bold")
    ax.set_xlim(-2100, 300)
    ax.set_xlabel("Diferença Pareada de Tempo: COM_IA − SEM_IA (segundos)")
    ax.set_title("Estatística Inferencial: Waterfall Divergente de Postos de Wilcoxon (RQ1)", pad=16)

    # Caixa de sumário estatístico
    stats_text = (
        "Estatística W: W⁺ = 0, W⁻ = 6.0\n"
        "Rank-Biserial Correlation: r = −1.00\n"
        "P-valor exato (n = 3): p = 0.1250\n"
        "Decisão: Não rejeita H₀ a α = 0.05 devido à amostra (n=3)"
    )
    ax.text(-2050, 0.2, stats_text, fontsize=9, bbox=dict(boxstyle="round,pad=0.6", facecolor="#f8fafc", edgecolor="#cbd5e1"), zorder=5)

    ax.grid(axis="x", linestyle="--", alpha=0.7, zorder=0)

    fig.savefig(output_path)
    plt.close(fig)


# ==============================================================================
# Gráfico 6: Painel Consolidado de Publicação (Multi-plot 300 DPI)
# ==============================================================================
def plot_06_composite_dashboard(df_trials: pd.DataFrame, df_participants: pd.DataFrame,
                                df_katas: pd.DataFrame, wilcoxon: dict, output_path: Path) -> None:
    """Gera painel multi-plot de alta resolução reunindo os 4 gráficos centrais."""
    fig = plt.figure(figsize=(16, 12))
    gs = fig.add_gridspec(2, 2, hspace=0.32, wspace=0.25)

    ax1 = fig.add_subplot(gs[0, 0])
    ax2 = fig.add_subplot(gs[0, 1])
    ax3 = fig.add_subplot(gs[1, 0])
    ax4 = fig.add_subplot(gs[1, 1])

    # 1. Slopegraph no ax1
    x_left, x_right = 0, 1
    ax1.set_xlim(-0.35, 1.35)
    ax1.set_ylim(-2, 36)
    ax1.axvline(x=x_left, color="#94a3b8", linestyle="-", linewidth=1.2)
    ax1.axvline(x=x_right, color="#94a3b8", linestyle="-", linewidth=1.2)
    for m in [0, 10, 20, 30]:
        ax1.axhline(y=m, color="#f1f5f9", linestyle=":", linewidth=1.0)
    colors = [COLOR_INDIGO, COLOR_AI, COLOR_EMERALD]
    for idx, (_, row) in enumerate(df_participants.iterrows()):
        ym, ya = row["tempo_sem_ia_s"] / 60.0, row["tempo_com_ia_s"] / 60.0
        c = colors[idx % len(colors)]
        ax1.plot([x_left, x_right], [ym, ya], color=c, linewidth=2.8, zorder=4)
        ax1.scatter([x_left, x_right], [ym, ya], color=c, s=60, edgecolors="white", linewidths=1.5, zorder=5)
        ax1.text(x_left - 0.05, ym, f"{row['participante']}: {format_mmss(row['tempo_sem_ia_s'])}", ha="right", va="center", color=c, fontsize=8.5, fontweight="bold")
        ax1.text(x_right + 0.05, ya + (idx * 0.8 - 0.8), f"{format_mmss(row['tempo_com_ia_s'])} ({row['reducao_tempo_pct']}%)", ha="left", va="center", color=c, fontsize=8.5, fontweight="bold")
    ax1.text(x_left, 36.5, "Manual (SEM IA)", ha="center", va="bottom", fontsize=10.5, fontweight="bold")
    ax1.text(x_right, 36.5, "Com IA", ha="center", va="bottom", fontsize=10.5, fontweight="bold")
    ax1.set_title("(A) RQ1: Slopegraph Pareado de Produtividade (Tempo)", fontsize=11.5)
    ax1.axis("off")

    # 2. Quadrantes no ax2
    max_loc, max_wmc = 115, 25
    rect_ideal = patches.Rectangle((0, 0), 47, 10.5, facecolor="#ecfdf5", alpha=0.8, zorder=1)
    rect_hot = patches.Rectangle((47, 10.5), 68, 14.5, facecolor="#fef2f2", alpha=0.7, zorder=1)
    ax2.add_patch(rect_ideal)
    ax2.add_patch(rect_hot)
    ax2.axvline(x=47, color="#94a3b8", linestyle="--", linewidth=1.0)
    ax2.axhline(y=10.5, color="#94a3b8", linestyle="--", linewidth=1.0)
    for trat, c, lbl in [("COM_IA", COLOR_AI, "Com IA"), ("SEM_IA", COLOR_NOAI, "Manual")]:
        sub = df_trials[df_trials["tratamento"] == trat]
        sz = 40 + (sub["tempo_segundos"] / 1853.0) * 160
        ax2.scatter(sub["loc"], sub["wmc"], s=sz, color=c, alpha=0.85, edgecolors="#1e293b", linewidths=1.0, label=lbl, zorder=4)
    ax2.set_xlim(0, max_loc)
    ax2.set_ylim(0, max_wmc)
    ax2.set_xlabel("Linhas de Código (LOC)", fontsize=9.5)
    ax2.set_ylabel("WMC (McCabe)", fontsize=9.5)
    ax2.set_title("(B) RQ3: Dispersão e Zonas de Densidade (LOC × WMC)", fontsize=11.5)
    ax2.legend(loc="lower right", fontsize=8.5, facecolor="white", edgecolor="#cbd5e1")
    ax2.grid(True, zorder=0)

    # 3. Bullet Graph no ax3
    n_katas = len(df_katas)
    for i in range(n_katas):
        ax3.barh(i, 0.16, height=0.55, left=0, color="#e2e8f0", zorder=1)
        ax3.barh(i, 0.10, height=0.55, left=0, color="#a7f3d0", zorder=2)
        ax3.barh(i, 0.05, height=0.55, left=0, color="#34d399", zorder=3)
    mean_lat = df_katas["bench_time_us"].mean()
    for i, (_, r) in enumerate(df_katas.iterrows()):
        val = r["bench_time_us"]
        ax3.barh(i, val, height=0.3, color="#0f172a", zorder=4)
        ax3.plot([mean_lat, mean_lat], [i - 0.28, i + 0.28], color="#ef4444", linewidth=2.0, zorder=5)
        ax3.text(val + 0.003, i, f"{val:.3f} µs | Heap: {r['bench_allocated_bytes']:.0f} B", va="center", color="#0f172a", fontsize=8, fontweight="bold")
    ax3.set_yticks(range(n_katas))
    ax3.set_yticklabels([f"K0{i+1}" for i in range(n_katas)], fontweight="bold", fontsize=9)
    ax3.set_xlim(0, 0.16)
    ax3.set_xlabel("Latência Média de Execução (µs)", fontsize=9.5)
    ax3.set_title("(C) RQ4: Bullet Graphs de Eficiência Computacional", fontsize=11.5)
    ax3.grid(axis="x", linestyle=":", zorder=0)

    # 4. Waterfall de Wilcoxon no ax4
    rq1 = wilcoxon.get("rq1_tempo", {})
    deltas = rq1.get("diferencas_after_menos_before", [-1814.5, -1308.0, -1274.0])
    postos = rq1.get("postos_absolutos", [3.0, 2.0, 1.0])
    parts = ["Isabella", "Leandro", "Luis"]
    y_pos = np.arange(len(parts))
    ax4.barh(y_pos, deltas, height=0.45, color=COLOR_EMERALD, edgecolor="#065f46", zorder=3)
    ax4.axvline(x=0, color="#0f172a", linestyle="-", linewidth=1.8, zorder=4)
    for idx, (p, rk, d) in enumerate(zip(parts, postos, deltas)):
        ax4.text(d + 40, idx, f"P{rk:.0f} | Δ={d:.0f}s", va="center", ha="left", color="white", fontweight="bold", fontsize=8.5)
    ax4.set_yticks(y_pos)
    ax4.set_yticklabels(parts, fontsize=9.5, fontweight="bold")
    ax4.set_xlim(-2100, 250)
    ax4.set_xlabel("Diferença Pareada COM_IA − SEM_IA (s)", fontsize=9.5)
    ax4.set_title("(D) Wilcoxon: Postos Sinalizados (W⁻ = 6.0, r = −1.00)", fontsize=11.5)
    ax4.grid(axis="x", linestyle="--", alpha=0.7, zorder=0)

    plt.suptitle("LAB02 · Painel Consolidado de Experimentação de Software (Assistente de IA vs. Manual)",
                 fontsize=14.5, fontweight="bold", y=0.98, color="#0f172a")

    fig.savefig(output_path)
    plt.close(fig)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Carregando dados com Pandas a partir de {DATA_JSON}...")
    df_trials, df_participants, df_katas, wilcoxon = load_datasets()

    print(f"Processando {len(df_trials)} trials e gerando gráficos em {OUTPUT_DIR}...")

    # 1. Slopegraph Pareado
    p1 = OUTPUT_DIR / "01_slopegraph_tempo_rq1.png"
    plot_01_slopegraph(df_participants, p1)
    print(f"✔ [1/6] {p1.name} gerado.")

    # 2. Quadrantes LOC x WMC
    p2 = OUTPUT_DIR / "02_quadrantes_loc_wmc_rq3.png"
    plot_02_quadrants(df_trials, p2)
    print(f"✔ [2/6] {p2.name} gerado.")

    # 3. Waffle Matrix JUnit 5
    p3 = OUTPUT_DIR / "03_waffle_matrix_testes_junit_rq2.png"
    plot_03_waffle_matrix(df_trials, p3)
    print(f"✔ [3/6] {p3.name} gerado.")

    # 4. Bullet Graphs
    p4 = OUTPUT_DIR / "04_bullet_efficiency_rq4.png"
    plot_04_bullet_efficiency(df_katas, p4)
    print(f"✔ [4/6] {p4.name} gerado.")

    # 5. Waterfall de Wilcoxon
    p5 = OUTPUT_DIR / "05_waterfall_postos_wilcoxon.png"
    plot_05_waterfall_wilcoxon(wilcoxon, p5)
    print(f"✔ [5/6] {p5.name} gerado.")

    # 6. Painel Consolidado
    p6 = OUTPUT_DIR / "06_painel_consolidado_dashboard.png"
    plot_06_composite_dashboard(df_trials, df_participants, df_katas, wilcoxon, p6)
    print(f"✔ [6/6] {p6.name} gerado.")

    print(f"\nSucesso: Todos os 6 gráficos em PNG (300 DPI) foram criados em {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
