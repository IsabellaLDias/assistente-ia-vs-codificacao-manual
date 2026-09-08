package br.ufc.lab02.estacionamento;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;

public class TarifadorEstacionamento {

    private static final BigDecimal TARIFA_PRIMEIRA_HORA = BigDecimal.valueOf(12.00);
    private static final BigDecimal TARIFA_HORA_ADICIONAL = BigDecimal.valueOf(6.00);
    private static final BigDecimal TETO_DIARIA = BigDecimal.valueOf(60.00);
    private static final BigDecimal FATOR_DESCONTO_CONVENIO = BigDecimal.valueOf(0.85);

    public BigDecimal calcularTarifa(LocalDateTime entrada, LocalDateTime saida, TipoVeiculo tipo, boolean possuiConvenio) {
        if (entrada == null || saida == null) {
            throw new IllegalArgumentException("Entrada e saida nao podem ser nulas.");
        }
        if (saida.isBefore(entrada)) {
            throw new IllegalArgumentException("Saida nao pode ser anterior a entrada.");
        }
        if (tipo == null) {
            throw new IllegalArgumentException("Tipo de veiculo obrigatorio.");
        }

        long minutosTotais = Duration.between(entrada, saida).toMinutes();

        // 1. Franquia de 15 minutos
        if (minutosTotais <= 15) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN);
        }

        // 2. Cálculo do total de dias completos e minutos restantes
        long diasCompletos = minutosTotais / (24 * 60);
        long minutosRestantes = minutosTotais % (24 * 60);

        BigDecimal valorBase = TETO_DIARIA.multiply(BigDecimal.valueOf(diasCompletos));

        if (minutosRestantes > 0) {
            BigDecimal valorPeriodoRestante;
            if (minutosRestantes <= 60) {
                valorPeriodoRestante = TARIFA_PRIMEIRA_HORA;
            } else {
                long minutosAposPrimeiraHora = minutosRestantes - 60;
                long horasAdicionais = (minutosAposPrimeiraHora + 59) / 60;
                valorPeriodoRestante = TARIFA_PRIMEIRA_HORA.add(
                    TARIFA_HORA_ADICIONAL.multiply(BigDecimal.valueOf(horasAdicionais))
                );
            }

            // Aplica teto da diária sobre o período restante
            if (valorPeriodoRestante.compareTo(TETO_DIARIA) > 0) {
                valorPeriodoRestante = TETO_DIARIA;
            }
            valorBase = valorBase.add(valorPeriodoRestante);
        }

        // 3. Multiplicador pelo tipo de veículo
        BigDecimal valorComVeiculo = valorBase.multiply(BigDecimal.valueOf(tipo.getFatorMultiplicador()));

        // 4. Desconto de convênio
        BigDecimal valorFinal = possuiConvenio
            ? valorComVeiculo.multiply(FATOR_DESCONTO_CONVENIO)
            : valorComVeiculo;

        return valorFinal.setScale(2, RoundingMode.HALF_EVEN);
    }
}
