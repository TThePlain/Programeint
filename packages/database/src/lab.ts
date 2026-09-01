import { PrismaClient } from "@prisma/client";

type LabFile = { path: string; content: string };

const EXERCISES: Array<{
  slug: string;
  node: string;
  title: string;
  prompt: string;
  entryClass: string;
  starterFiles: LabFile[];
  hiddenFiles: LabFile[];
}> = [
  {
    slug: "algo-twice",
    node: "algorithms",
    title: "Dobrar um número",
    prompt:
      "Implementa `Solution.twice(n)` para devolver o dobro de n. Os testes correm numa JVM isolada (Docker): o teu código não executa no servidor da API. Compilar e passar os testes é evidência de habilidade, não de um projeto completo.",
    entryClass: "Check",
    starterFiles: [
      {
        path: "Solution.java",
        content: `public class Solution {
  public static int twice(int n) {
    return 0;
  }
}
`,
      },
    ],
    hiddenFiles: [
      {
        path: "Check.java",
        content: `public class Check {
  public static void main(String[] args) {
    int fails = 0;
    if (Solution.twice(3) != 6) { System.out.println("FAIL twice(3)"); fails++; }
    if (Solution.twice(0) != 0) { System.out.println("FAIL twice(0)"); fails++; }
    if (Solution.twice(-4) != -8) { System.out.println("FAIL twice(-4)"); fails++; }
    if (fails == 0) System.out.println("PASS");
    System.exit(fails == 0 ? 0 : 1);
  }
}
`,
      },
    ],
  },
  {
    slug: "java-hello",
    node: "java",
    title: "Olá, JVM",
    prompt:
      "A classe `Main` deve imprimir exactamente `Olá, JVM` seguido de nova linha. javac + java correm dentro de um contentor Temurin 21, sem rede.",
    entryClass: "Main",
    starterFiles: [
      {
        path: "Main.java",
        content: `public class Main {
  public static void main(String[] args) {
    System.out.println("TODO");
  }
}
`,
      },
    ],
    hiddenFiles: [],
  },
  {
    slug: "oop-counter",
    node: "oop",
    title: "Contador encapsulado",
    prompt:
      "Implementa a classe `Counter` com estado privado: `increment()` soma 1 e `getValue()` devolve o valor actual (começa em 0). Os testes ocultos correm na JVM isolada — encapsulamento conta: o campo não deve ser público.",
    entryClass: "Check",
    starterFiles: [
      {
        path: "Counter.java",
        content: `public class Counter {
  // TODO: estado privado + increment() + getValue()
}
`,
      },
    ],
    hiddenFiles: [
      {
        path: "Check.java",
        content: `import java.lang.reflect.Field;
import java.lang.reflect.Modifier;

public class Check {
  public static void main(String[] args) throws Exception {
    int fails = 0;
    Counter c = new Counter();
    if (c.getValue() != 0) { System.out.println("FAIL initial"); fails++; }
    c.increment();
    c.increment();
    if (c.getValue() != 2) { System.out.println("FAIL after two increments"); fails++; }
    for (Field f : Counter.class.getDeclaredFields()) {
      if (!Modifier.isPrivate(f.getModifiers())) {
        System.out.println("FAIL field not private: " + f.getName());
        fails++;
      }
    }
    if (fails == 0) System.out.println("PASS");
    System.exit(fails == 0 ? 0 : 1);
  }
}
`,
      },
    ],
  },
  {
    slug: "collections-unique",
    node: "java-collections",
    title: "Contar únicos",
    prompt:
      "Implementa `Solution.uniqueCount(String[] items)` para devolver quantos valores distintos existem no array (null conta como um valor). Usa a ideia de Set — os testes ocultos não vão ao cliente.",
    entryClass: "Check",
    starterFiles: [
      {
        path: "Solution.java",
        content: `public class Solution {
  public static int uniqueCount(String[] items) {
    return 0;
  }
}
`,
      },
    ],
    hiddenFiles: [
      {
        path: "Check.java",
        content: `public class Check {
  public static void main(String[] args) {
    int fails = 0;
    if (Solution.uniqueCount(new String[] {}) != 0) { System.out.println("FAIL empty"); fails++; }
    if (Solution.uniqueCount(new String[] {"a", "b", "a"}) != 2) { System.out.println("FAIL ab"); fails++; }
    if (Solution.uniqueCount(new String[] {null, null, "x"}) != 2) { System.out.println("FAIL null"); fails++; }
    if (fails == 0) System.out.println("PASS");
    System.exit(fails == 0 ? 0 : 1);
  }
}
`,
      },
    ],
  },
  {
    slug: "exceptions-parse",
    node: "java-exceptions",
    title: "Parse defensivo",
    prompt:
      "Implementa `Solution.parseOrZero(String text)`: se `text` for um inteiro válido em decimal, devolve-o; caso contrário (null, vazio ou formato inválido) devolve 0 sem deixar a exceção escapar. try/catch é a ferramenta — engolir sem critério noutros sítios continua a ser mau hábito.",
    entryClass: "Check",
    starterFiles: [
      {
        path: "Solution.java",
        content: `public class Solution {
  public static int parseOrZero(String text) {
    return -1;
  }
}
`,
      },
    ],
    hiddenFiles: [
      {
        path: "Check.java",
        content: `public class Check {
  public static void main(String[] args) {
    int fails = 0;
    if (Solution.parseOrZero("42") != 42) { System.out.println("FAIL 42"); fails++; }
    if (Solution.parseOrZero("-3") != -3) { System.out.println("FAIL -3"); fails++; }
    if (Solution.parseOrZero(null) != 0) { System.out.println("FAIL null"); fails++; }
    if (Solution.parseOrZero("") != 0) { System.out.println("FAIL empty"); fails++; }
    if (Solution.parseOrZero("x") != 0) { System.out.println("FAIL x"); fails++; }
    if (fails == 0) System.out.println("PASS");
    System.exit(fails == 0 ? 0 : 1);
  }
}
`,
      },
    ],
  },
  {
    slug: "testing-assert",
    node: "testing",
    title: "Asserções mínimas",
    prompt:
      "Implementa `Solution.max(int a, int b)` (o maior dos dois) e garante que os testes ocultos falham se mentires. O runner só imprime PASS com exit 0 quando todas as asserções passam.",
    entryClass: "Check",
    starterFiles: [
      {
        path: "Solution.java",
        content: `public class Solution {
  public static int max(int a, int b) {
    return a;
  }
}
`,
      },
    ],
    hiddenFiles: [
      {
        path: "Check.java",
        content: `public class Check {
  static void assertEq(int expected, int actual, String name) {
    if (expected != actual) {
      System.out.println("FAIL " + name + " expected=" + expected + " actual=" + actual);
      System.exit(1);
    }
  }
  public static void main(String[] args) {
    assertEq(5, Solution.max(5, 3), "max(5,3)");
    assertEq(5, Solution.max(3, 5), "max(3,5)");
    assertEq(-1, Solution.max(-1, -4), "max negatives");
    assertEq(0, Solution.max(0, 0), "max equal");
    System.out.println("PASS");
  }
}
`,
      },
    ],
  },
  {
    slug: "rest-status",
    node: "rest",
    title: "Mapear status HTTP",
    prompt:
      "Implementa `Solution.statusFor(String situation)` devolvendo o código HTTP adequado como int: `ok`→200, `created`→201, `bad_request`→400, `not_found`→404, `error`→500. Qualquer outra situação → 400.",
    entryClass: "Check",
    starterFiles: [
      {
        path: "Solution.java",
        content: `public class Solution {
  public static int statusFor(String situation) {
    return 0;
  }
}
`,
      },
    ],
    hiddenFiles: [
      {
        path: "Check.java",
        content: `public class Check {
  public static void main(String[] args) {
    int fails = 0;
    if (Solution.statusFor("ok") != 200) { System.out.println("FAIL ok"); fails++; }
    if (Solution.statusFor("created") != 201) { System.out.println("FAIL created"); fails++; }
    if (Solution.statusFor("bad_request") != 400) { System.out.println("FAIL bad_request"); fails++; }
    if (Solution.statusFor("not_found") != 404) { System.out.println("FAIL not_found"); fails++; }
    if (Solution.statusFor("error") != 500) { System.out.println("FAIL error"); fails++; }
    if (Solution.statusFor("weird") != 400) { System.out.println("FAIL weird"); fails++; }
    if (fails == 0) System.out.println("PASS");
    System.exit(fails == 0 ? 0 : 1);
  }
}
`,
      },
    ],
  },
];

export async function seedLabExercises(prisma: PrismaClient) {
  const nodes = await prisma.knowledgeNode.findMany({ select: { id: true, slug: true } });
  const bySlug = new Map(nodes.map((node) => [node.slug, node.id]));

  for (const item of EXERCISES) {
    const nodeId = bySlug.get(item.node);
    if (!nodeId) continue;
    await prisma.labExercise.upsert({
      where: { slug: item.slug },
      create: {
        slug: item.slug,
        nodeId,
        title: item.title,
        prompt: item.prompt,
        language: "java",
        entryClass: item.entryClass,
        starterFiles: item.starterFiles,
        hiddenFiles: item.hiddenFiles,
        published: true,
      },
      update: {
        title: item.title,
        prompt: item.prompt,
        entryClass: item.entryClass,
        starterFiles: item.starterFiles,
        hiddenFiles: item.hiddenFiles,
        published: true,
        nodeId,
      },
    });
  }
}
