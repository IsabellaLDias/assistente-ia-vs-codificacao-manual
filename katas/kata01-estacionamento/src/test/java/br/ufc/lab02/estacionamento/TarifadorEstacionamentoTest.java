package br.ufc.lab02.estacionamento;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TarifadorEstacionamentoTest {

    private TarifadorEstacionamento tarifador;
    private final LocalDateTime base = LocalDateTime.of(2026, 9, 8, 8, 0);

    @BeforeEach
    void setUp() {
        tarifador = new TarifadorEstacionamento();
    }

    private BigDecimal valor(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_EVEN);
    }

    @Test
    @DisplayName("Caso 1: Tolerância até 15 minutos é gratuita")
    void testeToleranciaAte15Minutos() {
        LocalDateTime saida = base.plusMinutes(15);
        BigDecimal tarifa = tarifador.calcularTarifa(base, saida, TipoVeiculo.CARRO_PASSEIO, false);
        assertEquals(valor(0.00), tarifa);
    }

    @Test
    @DisplayName("Caso 2: Primeira hora (16 a 60 min) cobra tarifa base de R$ 12,00 para carro")
    void testePrimeiraHora() {
        LocalDateTime saida = base.plusMinutes(45);
        BigDecimal tarifa = tarifador.calcularTarifa(base, saida, TipoVeiculo.CARRO_PASSEIO, false);
        assertEquals(valor(12.00), tarifa);
    }

    @Test
    @DisplayName("Caso 3: Hora adicional fracionada cobra acréscimo de R$ 6,00 por hora")
    void testeHoraAdicionalFracionada() {
        // 1h10min -> 1ª hora (12,00) + 1 hora extra (6,00) = 18,00
        LocalDateTime saida = base.plusMinutes(70);
        BigDecimal tarifa = tarifador.calcularTarifa(base, saida, TipoVeiculo.CARRO_PASSEIO, false);
        assertEquals(valor(18.00), tarifa);
    }

    @Test
    @DisplayName("Caso 4: Moto tem fator multiplicador de 0.5 (50% de desconto)")
    void testeTarifaMoto() {
        // 1h10min para moto -> 18,00 * 0.5 = 9,00
        LocalDateTime saida = base.plusMinutes(70);
        BigDecimal tarifa = tarifador.calcularTarifa(base, saida, TipoVeiculo.MOTO, false);
        assertEquals(valor(9.00), tarifa);
    }

    @Test
    @DisplayName("Caso 5: Caminhonete tem adicional de 25% (fator 1.25)")
    void testeTarifaCaminhonete() {
        // 1h (12,00) * 1.25 = 15,00
        LocalDateTime saida = base.plusMinutes(60);
        BigDecimal tarifa = tarifador.calcularTarifa(base, saida, TipoVeiculo.CAMINHONETE, false);
        assertEquals(valor(15.00), tarifa);
    }

    @Test
    @DisplayName("Caso 6: Teto diário de R$ 60,00 por período de 24 horas")
    void testeTetoDiaria() {
        // 10 horas de permanência daria 12 + 9*6 = 66,00, mas deve limitar a 60,00
        LocalDateTime saida = base.plusHours(10);
        BigDecimal tarifa = tarifador.calcularTarifa(base, saida, TipoVeiculo.CARRO_PASSEIO, false);
        assertEquals(valor(60.00), tarifa);
    }

    @Test
    @DisplayName("Caso 7: Selo de convênio aplica 15% de desconto sobre valor final")
    void testeDescontoConvenio() {
        // 1h para carro = 12,00 * 0.85 = 10,20
        LocalDateTime saida = base.plusMinutes(60);
        BigDecimal tarifa = tarifador.calcularTarifa(base, saida, TipoVeiculo.CARRO_PASSEIO, true);
        assertEquals(valor(10.20), tarifa);
    }

    @Test
    @DisplayName("Caso 8: Exceção se saída for anterior à entrada ou parâmetros nulos")
    void testeValidacaoExcecoes() {
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularTarifa(base, base.minusMinutes(1), TipoVeiculo.CARRO_PASSEIO, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularTarifa(null, base, TipoVeiculo.CARRO_PASSEIO, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularTarifa(base, base.plusHours(1), null, false)
        );
    }
}
