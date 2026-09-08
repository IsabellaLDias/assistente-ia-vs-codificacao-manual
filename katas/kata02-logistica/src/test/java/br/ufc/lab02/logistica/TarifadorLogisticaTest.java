package br.ufc.lab02.logistica;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TarifadorLogisticaTest {

    private TarifadorLogistica tarifador;

    @BeforeEach
    void setUp() {
        tarifador = new TarifadorLogistica();
    }

    private BigDecimal valor(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_EVEN);
    }

    @Test
    @DisplayName("Caso 1: Envio curto (<= 15 km) e leve (<= 5 kg) padrão sem adicional")
    void testeEnvioCurtoLeve() {
        // Distância: 10km (R$ 10,00), Peso: 3kg (R$ 0,00). Padrão (1.0). Total: R$ 10,00
        BigDecimal frete = tarifador.calcularFrete(10.0, 3.0, ModalidadeEntrega.PADRAO, TipoCarga.NORMAL, false);
        assertEquals(valor(10.00), frete);
    }

    @Test
    @DisplayName("Caso 2: Envio médio (15 a 50 km) com tarifa fixa de R$ 25,00")
    void testeEnvioMedio() {
        // Distância: 30km (R$ 25,00), Peso: 4kg (R$ 0,00). Padrão (1.0). Total: R$ 25,00
        BigDecimal frete = tarifador.calcularFrete(30.0, 4.0, ModalidadeEntrega.PADRAO, TipoCarga.NORMAL, false);
        assertEquals(valor(25.00), frete);
    }

    @Test
    @DisplayName("Caso 3: Envio longo (> 50 km) cobra adicional de R$ 1,50 por km excedente")
    void testeEnvioLongoComKmExcedente() {
        // Distância: 70km (R$ 25 + 20*1.50 = 55,00), Peso: 5kg (R$ 0). Total: R$ 55,00
        BigDecimal frete = tarifador.calcularFrete(70.0, 5.0, ModalidadeEntrega.PADRAO, TipoCarga.NORMAL, false);
        assertEquals(valor(55.00), frete);
    }

    @Test
    @DisplayName("Caso 4: Adicional por peso excedente (> 5 kg) a R$ 3,00 por kg")
    void testeAdicionalPesoExcedente() {
        // Distância: 10km (R$ 10,00), Peso: 8kg (3kg excedentes * 3,00 = 9,00). Total: R$ 19,00
        BigDecimal frete = tarifador.calcularFrete(10.0, 8.0, ModalidadeEntrega.PADRAO, TipoCarga.NORMAL, false);
        assertEquals(valor(19.00), frete);
    }

    @Test
    @DisplayName("Caso 5: Modalidade expressa aplica multiplicador de 1.40")
    void testeModalidadeExpressa() {
        // Distância 10km (10) + Peso 5kg (0) = 10,00 * 1.40 = 14,00
        BigDecimal frete = tarifador.calcularFrete(10.0, 5.0, ModalidadeEntrega.EXPRESSA, TipoCarga.NORMAL, false);
        assertEquals(valor(14.00), frete);
    }

    @Test
    @DisplayName("Caso 6: Carga frágil adiciona taxa de manuseio de R$ 15,00")
    void testeCargaFragil() {
        // Base: 10,00 + Frágil: 15,00 = 25,00
        BigDecimal frete = tarifador.calcularFrete(10.0, 5.0, ModalidadeEntrega.PADRAO, TipoCarga.FRAGIL, false);
        assertEquals(valor(25.00), frete);
    }

    @Test
    @DisplayName("Caso 7: Cliente fidelidade tem 10% de desconto sobre o valor final")
    void testeDescontoFidelidade() {
        // Base 10,00 + Frágil 15,00 = 25,00 * 0.90 = 22,50
        BigDecimal frete = tarifador.calcularFrete(10.0, 5.0, ModalidadeEntrega.PADRAO, TipoCarga.FRAGIL, true);
        assertEquals(valor(22.50), frete);
    }

    @Test
    @DisplayName("Caso 8: Validações de entradas inválidas lançam IllegalArgumentException")
    void testeValidacaoExcecoes() {
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularFrete(0.0, 10.0, ModalidadeEntrega.PADRAO, TipoCarga.NORMAL, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularFrete(10.0, 0.0, ModalidadeEntrega.PADRAO, TipoCarga.NORMAL, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularFrete(10.0, 50.1, ModalidadeEntrega.PADRAO, TipoCarga.NORMAL, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularFrete(10.0, 5.0, null, TipoCarga.NORMAL, false)
        );
    }
}
