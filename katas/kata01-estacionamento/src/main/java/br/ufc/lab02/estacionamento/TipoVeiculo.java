package br.ufc.lab02.estacionamento;

public enum TipoVeiculo {
    MOTO(0.50),
    CARRO_PASSEIO(1.00),
    CAMINHONETE(1.25);

    private final double fatorMultiplicador;

    TipoVeiculo(double fatorMultiplicador) {
        this.fatorMultiplicador = fatorMultiplicador;
    }

    public double getFatorMultiplicador() {
        return fatorMultiplicador;
    }
}
