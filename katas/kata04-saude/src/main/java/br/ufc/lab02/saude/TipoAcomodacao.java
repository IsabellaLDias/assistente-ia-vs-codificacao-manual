package br.ufc.lab02.saude;

import java.math.BigDecimal;

public enum TipoAcomodacao {
    ENFERMARIA(BigDecimal.valueOf(0.00)),
    APARTAMENTO(BigDecimal.valueOf(90.00));

    private final BigDecimal taxaAcomodacao;

    TipoAcomodacao(BigDecimal taxaAcomodacao) {
        this.taxaAcomodacao = taxaAcomodacao;
    }

    public BigDecimal getTaxaAcomodacao() {
        return taxaAcomodacao;
    }
}
