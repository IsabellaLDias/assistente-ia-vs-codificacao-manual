package br.ufc.lab02;

/**
 * Fixture intencionalmente pequeno para validar o coletor do LAB02.
 * Os dois métodos abaixo têm um bloco duplicado maior que 50 tokens.
 */
public final class MetricsFixture {
    private static final String URL_EXAMPLE = "https://example.invalid/a//b";

    public int calculateFirstScore(int base, int bonus, int limit, int[] values) {
        int score = base;
        if (bonus > 0) {
            score += bonus;
        }
        for (int value : values) {
            if (value % 2 == 0) {
                score += value;
            } else {
                score -= value;
            }
        }
        if (score < limit) {
            return score + limit;
        }
        return score;
    }

    public int calculateSecondScore(int base, int bonus, int limit, int[] values) {
        int score = base;
        if (bonus > 0) {
            score += bonus;
        }
        for (int value : values) {
            if (value % 2 == 0) {
                score += value;
            } else {
                score -= value;
            }
        }
        if (score < limit) {
            return score + limit;
        }
        return score;
    }

    public String marker() {
        return URL_EXAMPLE;
    }
}
