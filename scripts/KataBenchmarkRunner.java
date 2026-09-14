package br.ufc.lab02.benchmark;

import java.io.File;
import java.lang.management.ManagementFactory;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class KataBenchmarkRunner {

    private static final int WARMUP_ITERATIONS = 5000;
    private static final int BENCHMARK_ITERATIONS = 20000;

    public static void main(String[] args) {
        if (args.length == 0) {
            System.err.println("Uso: java KataBenchmarkRunner <diretorio_classes> [nome_kata]");
            System.out.println("{\"benchmark_executed\":false,\"reason\":\"Nenhum diretorio informado\"}");
            return;
        }

        String classesDir = args[0];
        String kataHint = args.length > 1 ? args[1].toLowerCase() : "";

        try {
            File dir = new File(classesDir);
            URL[] urls = new URL[]{dir.toURI().toURL()};
            ClassLoader parent = KataBenchmarkRunner.class.getClassLoader();
            try (URLClassLoader loader = new URLClassLoader(urls, parent)) {
                BenchmarkTarget target = findTarget(loader, kataHint);
                if (target == null) {
                    System.out.println("{\"benchmark_executed\":false,\"reason\":\"Nenhum tarifador identificado para benchmark\"}");
                    return;
                }

                // 1. Warmup da JVM (compilação JIT)
                target.runBatch(WARMUP_ITERATIONS);

                // 2. Medição com ThreadMXBean e System.nanoTime()
                com.sun.management.ThreadMXBean threadBean = null;
                boolean trackMemory = false;
                try {
                    java.lang.management.ThreadMXBean baseBean = ManagementFactory.getThreadMXBean();
                    if (baseBean instanceof com.sun.management.ThreadMXBean) {
                        threadBean = (com.sun.management.ThreadMXBean) baseBean;
                        if (threadBean.isThreadAllocatedMemorySupported()) {
                            threadBean.setThreadAllocatedMemoryEnabled(true);
                            trackMemory = true;
                        }
                    }
                } catch (Throwable ignored) {}

                long threadId = Thread.currentThread().threadId();
                long startAlloc = trackMemory ? threadBean.getThreadAllocatedBytes(threadId) : 0;
                long startTime = System.nanoTime();

                target.runBatch(BENCHMARK_ITERATIONS);

                long elapsedNs = System.nanoTime() - startTime;
                long endAlloc = trackMemory ? threadBean.getThreadAllocatedBytes(threadId) : 0;

                double avgNs = (double) elapsedNs / BENCHMARK_ITERATIONS;
                double avgUs = avgNs / 1000.0;
                double allocatedBytes = trackMemory ? (double) (endAlloc - startAlloc) / BENCHMARK_ITERATIONS : 0.0;
                double throughput = avgNs > 0 ? (1_000_000_000.0 / avgNs) : 0.0;

                String json = String.format(java.util.Locale.US,
                    "{\"benchmark_executed\":true,\"kata\":\"%s\",\"iterations\":%d,\"warmup_iterations\":%d," +
                    "\"bench_time_ns\":%.2f,\"bench_time_us\":%.4f,\"bench_allocated_bytes\":%.2f,\"bench_throughput_ops\":%.0f}",
                    target.name, BENCHMARK_ITERATIONS, WARMUP_ITERATIONS, avgNs, avgUs, allocatedBytes, throughput);

                System.out.println(json);
            }
        } catch (Throwable e) {
            System.out.println(String.format("{\"benchmark_executed\":false,\"error\":\"%s\"}", e.getMessage() != null ? e.getMessage().replace("\"", "'") : "Erro desconhecido"));
        }
    }

    private static BenchmarkTarget findTarget(ClassLoader loader, String hint) {
        String h = hint != null ? hint.toLowerCase() : "";
        boolean isKata1 = h.contains("1") || h.contains("estacionamento") || h.contains("smartpark");
        boolean isKata2 = h.contains("2") || h.contains("logistica") || h.contains("ecofrete");
        boolean isKata3 = h.contains("3") || h.contains("hospedagem") || h.contains("bellavista");
        boolean isKata4 = h.contains("4") || h.contains("saude") || h.contains("vidaplus");

        if (isKata1) {
            BenchmarkTarget t = tryKata1(loader);
            if (t != null) return t;
        }
        if (isKata2) {
            BenchmarkTarget t = tryKata2(loader);
            if (t != null) return t;
        }
        if (isKata3) {
            BenchmarkTarget t = tryKata3(loader);
            if (t != null) return t;
        }
        if (isKata4) {
            BenchmarkTarget t = tryKata4(loader);
            if (t != null) return t;
        }

        // Se o hint não correspondeu ou não foi informado, testa todas as opções
        BenchmarkTarget t = tryKata1(loader);
        if (t != null) return t;
        t = tryKata2(loader);
        if (t != null) return t;
        t = tryKata3(loader);
        if (t != null) return t;
        t = tryKata4(loader);
        if (t != null) return t;

        return null;
    }

    private static BenchmarkTarget tryKata1(ClassLoader loader) {
        try {
            Class<?> clazz = loader.loadClass("br.ufc.lab02.estacionamento.TarifadorEstacionamento");
            Class<?> enumClass = loader.loadClass("br.ufc.lab02.estacionamento.TipoVeiculo");
            Object[] enumConstants = enumClass.getEnumConstants();
            Object instance = clazz.getDeclaredConstructor().newInstance();
            Method method = clazz.getMethod("calcularTarifa", LocalDateTime.class, LocalDateTime.class, enumClass, boolean.class);
            LocalDateTime base = LocalDateTime.of(2026, 9, 8, 8, 0);
            return new BenchmarkTarget("kata01-estacionamento", () -> {
                for (int i = 0; i < BENCHMARK_ITERATIONS; i++) {
                    LocalDateTime entrada = base.plusMinutes(i % 120);
                    LocalDateTime saida = entrada.plusMinutes(10 + (i % 300));
                    Object tipo = enumConstants[i % enumConstants.length];
                    boolean convenio = (i % 2 == 0);
                    method.invoke(instance, entrada, saida, tipo, convenio);
                }
            });
        } catch (Throwable ignored) {
            return null;
        }
    }

    private static BenchmarkTarget tryKata2(ClassLoader loader) {
        try {
            Class<?> clazz = loader.loadClass("br.ufc.lab02.logistica.TarifadorLogistica");
            Class<?> modalidadeClass = loader.loadClass("br.ufc.lab02.logistica.ModalidadeEntrega");
            Class<?> cargaClass = loader.loadClass("br.ufc.lab02.logistica.TipoCarga");
            Object[] modalidades = modalidadeClass.getEnumConstants();
            Object[] cargas = cargaClass.getEnumConstants();
            Object instance = clazz.getDeclaredConstructor().newInstance();
            Method method = clazz.getMethod("calcularFrete", double.class, double.class, modalidadeClass, cargaClass, boolean.class);
            return new BenchmarkTarget("kata02-logistica", () -> {
                for (int i = 0; i < BENCHMARK_ITERATIONS; i++) {
                    double distancia = 5.0 + (i % 100);
                    double peso = 1.0 + (i % 45);
                    Object mod = modalidades[i % modalidades.length];
                    Object carga = cargas[i % cargas.length];
                    boolean fidelidade = (i % 2 == 0);
                    method.invoke(instance, distancia, peso, mod, carga, fidelidade);
                }
            });
        } catch (Throwable ignored) {
            return null;
        }
    }

    private static BenchmarkTarget tryKata3(ClassLoader loader) {
        try {
            Class<?> clazz = loader.loadClass("br.ufc.lab02.hospedagem.TarifadorHospedagem");
            Class<?> quartoClass = loader.loadClass("br.ufc.lab02.hospedagem.CategoriaQuarto");
            Object[] quartos = quartoClass.getEnumConstants();
            Object instance = clazz.getDeclaredConstructor().newInstance();
            Method method = clazz.getMethod("calcularHospedagem", LocalDate.class, LocalDate.class, int.class, quartoClass, boolean.class);
            LocalDate baseDate = LocalDate.of(2026, 10, 1);
            return new BenchmarkTarget("kata03-hospedagem", () -> {
                for (int i = 0; i < BENCHMARK_ITERATIONS; i++) {
                    LocalDate entrada = baseDate.plusDays(i % 30);
                    LocalDate saida = entrada.plusDays(1 + (i % 14));
                    int hospedes = 1 + (i % 5);
                    Object quarto = quartos[i % quartos.length];
                    boolean convenio = (i % 2 == 0);
                    method.invoke(instance, entrada, saida, hospedes, quarto, convenio);
                }
            });
        } catch (Throwable ignored) {
            return null;
        }
    }

    private static BenchmarkTarget tryKata4(ClassLoader loader) {
        try {
            Class<?> clazz = loader.loadClass("br.ufc.lab02.saude.TarifadorPlanoSaude");
            Class<?> planoClass = loader.loadClass("br.ufc.lab02.saude.CategoriaPlano");
            Class<?> acomodacaoClass = loader.loadClass("br.ufc.lab02.saude.TipoAcomodacao");
            Object[] planos = planoClass.getEnumConstants();
            Object[] acomodacoes = acomodacaoClass.getEnumConstants();
            Object instance = clazz.getDeclaredConstructor().newInstance();
            Method method = clazz.getMethod("calcularMensalidade", int.class, planoClass, acomodacaoClass, boolean.class, boolean.class);
            return new BenchmarkTarget("kata04-saude", () -> {
                for (int i = 0; i < BENCHMARK_ITERATIONS; i++) {
                    int idade = i % 90;
                    Object plano = planos[i % planos.length];
                    Object acomodacao = acomodacoes[i % acomodacoes.length];
                    boolean odonto = (i % 2 == 0);
                    boolean copart = (i % 3 == 0);
                    method.invoke(instance, idade, plano, acomodacao, odonto, copart);
                }
            });
        } catch (Throwable ignored) {
            return null;
        }
    }

    private static class BenchmarkTarget {
        final String name;
        final BenchmarkAction action;

        BenchmarkTarget(String name, BenchmarkAction action) {
            this.name = name;
            this.action = action;
        }

        void runBatch(int iterations) throws Exception {
            action.run();
        }
    }

    @FunctionalInterface
    private interface BenchmarkAction {
        void run() throws Exception;
    }
}
