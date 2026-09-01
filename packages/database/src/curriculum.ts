import { PrismaClient } from "@prisma/client";

type Choice = { id: string; text: string };

const NODES = [
  { slug: "logic", title: "Lógica de programação", area: "foundations", sortOrder: 10, summary: "Sequência, condições, repetição e decomposição de problemas." },
  { slug: "algorithms", title: "Algoritmos", area: "foundations", sortOrder: 20, summary: "Passos explícitos, complexidade informal e rastreio de estado." },
  { slug: "data-structures", title: "Estruturas de dados", area: "foundations", sortOrder: 30, summary: "Listas, mapas e quando escolher cada estrutura." },
  { slug: "java", title: "Java", area: "language", sortOrder: 40, summary: "Sintaxe, tipos, JVM e o ciclo compile → execute." },
  { slug: "oop", title: "OOP", area: "language", sortOrder: 50, summary: "Classes, objetos, encapsulamento e herança com critério." },
  { slug: "java-collections", title: "Collections", area: "language", sortOrder: 60, summary: "List, Set, Map e iteração na biblioteca Java." },
  { slug: "java-exceptions", title: "Exceptions", area: "language", sortOrder: 70, summary: "Erros verificados, não verificados e tratamento explícito." },
  { slug: "git", title: "Git", area: "tooling", sortOrder: 80, summary: "Commit, branch e histórico local." },
  { slug: "sql", title: "SQL", area: "data", sortOrder: 90, summary: "Consultas, chaves e o modelo relacional." },
  { slug: "testing", title: "Testes", area: "engineering", sortOrder: 100, summary: "Asserções, testes unitários e evidência de comportamento." },
  { slug: "rest", title: "REST", area: "engineering", sortOrder: 110, summary: "Recursos, métodos HTTP e contratos de API." },
  { slug: "spring", title: "Spring", area: "java-backend", sortOrder: 120, summary: "Injeção de dependências e o contentor Spring." },
  { slug: "spring-boot", title: "Spring Boot", area: "java-backend", sortOrder: 130, summary: "Aplicações executáveis, configuração e starters." },
  { slug: "docker", title: "Docker", area: "tooling", sortOrder: 140, summary: "Imagens, contentores e isolamento do runtime." },
  {
    slug: "java-backend",
    title: "Java Backend",
    area: "java-backend",
    sortOrder: 200,
    summary: "Ponta da formação Java: OOP, collections, exceções, testes, REST e Spring Boot.",
  },
] as const;

const EDGES: Array<{ node: string; prereq: string; nature: "required" | "recommended" }> = [
  { node: "algorithms", prereq: "logic", nature: "required" },
  { node: "data-structures", prereq: "algorithms", nature: "required" },
  { node: "java", prereq: "data-structures", nature: "required" },
  { node: "oop", prereq: "java", nature: "required" },
  { node: "java-collections", prereq: "oop", nature: "required" },
  { node: "java-exceptions", prereq: "java", nature: "required" },
  { node: "git", prereq: "logic", nature: "recommended" },
  { node: "sql", prereq: "data-structures", nature: "recommended" },
  { node: "testing", prereq: "oop", nature: "required" },
  { node: "rest", prereq: "java", nature: "required" },
  { node: "spring", prereq: "oop", nature: "required" },
  { node: "spring", prereq: "rest", nature: "required" },
  { node: "spring-boot", prereq: "spring", nature: "required" },
  { node: "docker", prereq: "java", nature: "recommended" },
  // Tip do objetivo "Java": puxa a trilha completa sem inventar atalho.
  { node: "java-backend", prereq: "spring-boot", nature: "required" },
  { node: "java-backend", prereq: "java-collections", nature: "required" },
  { node: "java-backend", prereq: "java-exceptions", nature: "required" },
  { node: "java-backend", prereq: "testing", nature: "required" },
  { node: "java-backend", prereq: "git", nature: "recommended" },
  { node: "java-backend", prereq: "sql", nature: "recommended" },
  { node: "java-backend", prereq: "docker", nature: "recommended" },
];

function q(
  slug: string,
  node: string,
  prompt: string,
  choices: Choice[],
  correct: string,
  explanation: string,
  code?: string,
) {
  return { slug, node, prompt, choices, correct, explanation, code };
}

const QUESTIONS = [
  q(
    "logic-sequence",
    "logic",
    "O que descreve melhor um algoritmo?",
    [
      { id: "a", text: "Uma sequência finita de passos para resolver um problema" },
      { id: "b", text: "Um tipo de variável em Java" },
      { id: "c", text: "Um erro de compilação" },
      { id: "d", text: "Um sistema operativo" },
    ],
    "a",
    "Um algoritmo é um procedimento explícito e finito — não uma construção de linguagem específica.",
  ),
  q(
    "logic-branch",
    "logic",
    "Para executar um bloco só quando uma condição é verdadeira, usas:",
    [
      { id: "a", text: "Um ciclo infinito" },
      { id: "b", text: "Uma decisão (if / else)" },
      { id: "c", text: "Um commit" },
      { id: "d", text: "Um contentor Docker" },
    ],
    "b",
    "A ramificação condicional escolhe o próximo passo com base num predicado.",
  ),
  q(
    "algo-trace",
    "algorithms",
    "Qual é o valor final de x?",
    [
      { id: "a", text: "1" },
      { id: "b", text: "2" },
      { id: "c", text: "3" },
      { id: "d", text: "0" },
    ],
    "c",
    "Começa em 1, soma 1 → 2, soma 1 → 3.",
    "x = 1\nx = x + 1\nx = x + 1",
  ),
  q(
    "ds-list-map",
    "data-structures",
    "Que estrutura usas para associar uma chave única a um valor?",
    [
      { id: "a", text: "Lista ordenada apenas por inserção" },
      { id: "b", text: "Mapa / dicionário" },
      { id: "c", text: "Pilha sem chaves" },
      { id: "d", text: "Fila FIFO sem chaves" },
    ],
    "b",
    "Mapas (Map) modelam pares chave-valor; listas modelam sequência.",
  ),
  q(
    "java-jvm",
    "java",
    "O que faz a JVM?",
    [
      { id: "a", text: "Substitui o Git" },
      { id: "b", text: "Executa bytecode Java de forma portátil" },
      { id: "c", text: "Compila SQL" },
      { id: "d", text: "Serve páginas HTML" },
    ],
    "b",
    "javac gera bytecode; a JVM (Java Virtual Machine) executa-o.",
  ),
  q(
    "oop-class",
    "oop",
    "Em OOP, uma classe é principalmente:",
    [
      { id: "a", text: "Um molde que define estado e comportamento" },
      { id: "b", text: "Um ficheiro .git" },
      { id: "c", text: "Um contentor Docker" },
      { id: "d", text: "Uma linha de SQL" },
    ],
    "a",
    "A classe descreve o tipo; o objeto é uma instância concreta.",
  ),
  q(
    "collections-list-set",
    "java-collections",
    "Que coleção Java garante elementos únicos (sem duplicados)?",
    [
      { id: "a", text: "List" },
      { id: "b", text: "Set" },
      { id: "c", text: "Queue sem contrato de unicidade" },
      { id: "d", text: "Array de primitivos int" },
    ],
    "b",
    "Set modela um conjunto: cada elemento aparece no máximo uma vez.",
  ),
  q(
    "exceptions-checked",
    "java-exceptions",
    "Em Java, uma checked exception tipicamente:",
    [
      { id: "a", text: "Obriga a declarar throws ou a tratar com try/catch" },
      { id: "b", text: "Substitui o compilador" },
      { id: "c", text: "É o mesmo que um commit Git" },
      { id: "d", text: "Corre só dentro do Docker" },
    ],
    "a",
    "Checked exceptions fazem parte do contrato do método; o compilador exige tratamento explícito.",
  ),
  q(
    "git-commit",
    "git",
    "Um commit no Git representa:",
    [
      { id: "a", text: "Um snapshot do projeto com mensagem e autor" },
      { id: "b", text: "A compilação obrigatória do javac" },
      { id: "c", text: "Um SELECT em SQL" },
      { id: "d", text: "Um bean Spring" },
    ],
    "a",
    "O commit é um objeto de histórico: árvore de ficheiros + metadados.",
  ),
  q(
    "sql-select",
    "sql",
    "Qual instrução lê linhas de uma tabela relacional?",
    [
      { id: "a", text: "COMMIT" },
      { id: "b", text: "SELECT" },
      { id: "c", text: "javac" },
      { id: "d", text: "docker build" },
    ],
    "b",
    "SELECT consulta; INSERT/UPDATE/DELETE modificam; COMMIT confirma uma transação.",
  ),
];

const CHECK_QUESTIONS = [
  q(
    "check-logic-finitude",
    "logic",
    "O que distingue um algoritmo de uma lista vaga de ideias?",
    [
      { id: "a", text: "Passos explícitos, ordem e um critério de paragem" },
      { id: "b", text: "Estar escrito em Java" },
      { id: "c", text: "Usar Docker" },
      { id: "d", text: "Ter um repositório Git" },
    ],
    "a",
    "O algoritmo é o procedimento; a linguagem e as ferramentas são veículos.",
  ),
  q(
    "check-algo-trace",
    "algorithms",
    "Se um procedimento nunca pára, o que falha?",
    [
      { id: "a", text: "A finitude — não é um algoritmo" },
      { id: "b", text: "A JVM" },
      { id: "c", text: "O protocolo HTTP" },
      { id: "d", text: "A chave primária" },
    ],
    "a",
    "Algoritmo implica terminar após um número finito de passos para entradas válidas.",
  ),
  q(
    "check-ds-map",
    "data-structures",
    "Precisas de obter o valor associado a um código de produto. Que estrutura descreve melhor isto?",
    [
      { id: "a", text: "Um mapa (chave → valor)" },
      { id: "b", text: "Uma fila só com ordem de chegada" },
      { id: "c", text: "Uma pilha só LIFO" },
      { id: "d", text: "Um ficheiro .class" },
    ],
    "a",
    "Mapas modelam associação; filas e pilhas modelam ordem de acesso.",
  ),
  q(
    "check-java-jvm",
    "java",
    "Depois de javac gerar bytecode, quem o executa?",
    [
      { id: "a", text: "A JVM (máquina virtual Java)" },
      { id: "b", text: "O servidor SMTP" },
      { id: "c", text: "O browser, obrigatoriamente" },
      { id: "d", text: "O Git" },
    ],
    "a",
    "javac compila; a JVM interpreta/compila em tempo de execução o bytecode.",
  ),
  q(
    "check-oop-instance",
    "oop",
    "Se `Conta a = new Conta()` e `Conta b = new Conta()`, o que é verdade?",
    [
      { id: "a", text: "a e b são duas instâncias; cada uma tem o seu estado" },
      { id: "b", text: "a e b são a mesma variável na JVM" },
      { id: "c", text: "new só cria ficheiros .git" },
      { id: "d", text: "O compilador ignora o new" },
    ],
    "a",
    "Cada new cria um objeto distinto. A classe é o molde; a instância guarda o estado concreto.",
  ),
  q(
    "check-collections-map",
    "java-collections",
    "Precisas de associar um código de produto a um preço. Que interface Java descreve isto melhor?",
    [
      { id: "a", text: "Map" },
      { id: "b", text: "Set sem chaves" },
      { id: "c", text: "List só com índices sequenciais" },
      { id: "d", text: "Throwable" },
    ],
    "a",
    "Map<K,V> modela chave → valor. List é sequência; Set é unicidade sem associação.",
  ),
  q(
    "check-exceptions-try",
    "java-exceptions",
    "Para tratar uma falha recuperável no sítio da chamada, usas tipicamente:",
    [
      { id: "a", text: "try / catch (e eventualmente finally)" },
      { id: "b", text: "Só System.exit sem mensagem" },
      { id: "c", text: "Um SELECT em SQL" },
      { id: "d", text: "Um commit forçado" },
    ],
    "a",
    "try delimita o risco; catch decide a recuperação; finally corre de qualquer forma.",
  ),
  q(
    "check-git-snapshot",
    "git",
    "O que um commit NÃO é?",
    [
      { id: "a", text: "Um snapshot addressável do projeto com mensagem" },
      { id: "b", text: "Uma cópia automática para a cloud sem configuração" },
      { id: "c", text: "Um ponto do histórico local" },
      { id: "d", text: "Um objeto com autor e data" },
    ],
    "b",
    "Commit é local até fazeres push. Sem remoto configurado, não há publicação.",
  ),
  q(
    "check-sql-where",
    "sql",
    "A cláusula WHERE num SELECT serve para:",
    [
      { id: "a", text: "Filtrar as linhas que entram no resultado" },
      { id: "b", text: "Compilar bytecode Java" },
      { id: "c", text: "Criar um branch Git" },
      { id: "d", text: "Arrancar a JVM" },
    ],
    "a",
    "WHERE restringe o conjunto de linhas; sem WHERE, o SELECT devolve (em princípio) todas.",
  ),
  q(
    "testing-assert",
    "testing",
    "Um teste automatizado serve sobretudo para:",
    [
      { id: "a", text: "Fixar um comportamento esperado com evidência repetível" },
      { id: "b", text: "Substituir o diagnóstico do aluno" },
      { id: "c", text: "Gerar commits Git sozinho" },
      { id: "d", text: "Compilar o sistema operativo" },
    ],
    "a",
    "O teste é um contrato executável: dado X, esperas Y. Sem asserção, não há evidência.",
  ),
  q(
    "rest-method",
    "rest",
    "Em REST sobre HTTP, GET tipicamente:",
    [
      { id: "a", text: "Lê um recurso sem efeitos colaterais previstos" },
      { id: "b", text: "Apaga sempre a base de dados" },
      { id: "c", text: "Compila bytecode" },
      { id: "d", text: "Cria um branch Git" },
    ],
    "a",
    "GET é seguro e idempotente no modelo REST comum; mutações usam POST/PUT/PATCH/DELETE.",
  ),
  q(
    "spring-di",
    "spring",
    "No Spring, injeção de dependências serve para:",
    [
      { id: "a", text: "O contentor fornecer colaborações em vez de new espalhado" },
      { id: "b", text: "Substituir a JVM" },
      { id: "c", text: "Evitar escrever SQL para sempre" },
      { id: "d", text: "Gerar imagens Docker automaticamente" },
    ],
    "a",
    "DI desacopla criação de uso: o contentor monta o grafo de beans.",
  ),
  q(
    "spring-boot-starter",
    "spring-boot",
    "Spring Boot destaca-se por:",
    [
      { id: "a", text: "Convenções e starters que empacotam uma app executável" },
      { id: "b", text: "Eliminar a necessidade de testes" },
      { id: "c", text: "Ser um sistema operativo" },
      { id: "d", text: "Substituir o Git" },
    ],
    "a",
    "Boot reduz configuração ritual: jar executável, auto-config, starters por domínio.",
  ),
  q(
    "docker-image",
    "docker",
    "Uma imagem Docker é principalmente:",
    [
      { id: "a", text: "Um filesystem em camadas + metadados para criar contentores" },
      { id: "b", text: "Um commit Git" },
      { id: "c", text: "Um SELECT SQL" },
      { id: "d", text: "A JVM em si" },
    ],
    "a",
    "A imagem é o molde; o contentor é a instância em execução.",
  ),
  q(
    "check-testing-fail",
    "testing",
    "Se a asserção falha, o teste deve:",
    [
      { id: "a", text: "Falhar de forma visível (exit ≠ 0 / vermelho)" },
      { id: "b", text: "Engolir o erro e imprimir OK" },
      { id: "c", text: "Apagar o repositório Git" },
      { id: "d", text: "Reiniciar o Docker Host" },
    ],
    "a",
    "Um teste que nunca falha não dá evidência. Falhar é o sinal útil.",
  ),
  q(
    "check-rest-status",
    "rest",
    "O código HTTP 404 indica tipicamente:",
    [
      { id: "a", text: "Recurso não encontrado" },
      { id: "b", text: "Compilação Java bem-sucedida" },
      { id: "c", text: "Commit criado" },
      { id: "d", text: "Contentor a correr" },
    ],
    "a",
    "4xx = problema do cliente; 404 = URI sem recurso correspondente.",
  ),
  q(
    "check-spring-bean",
    "spring",
    "Um bean no Spring é:",
    [
      { id: "a", text: "Um objeto gerido pelo contentor de IoC" },
      { id: "b", text: "Um ficheiro .class na JDK" },
      { id: "c", text: "Uma tabela SQL" },
      { id: "d", text: "Uma imagem Docker" },
    ],
    "a",
    "Beans são componentes cuja vida e dependências o contentor administra.",
  ),
  q(
    "check-boot-jar",
    "spring-boot",
    "Um fat JAR do Spring Boot tipicamente permite:",
    [
      { id: "a", text: "Correr a aplicação com `java -jar` incluindo dependências" },
      { id: "b", text: "Evitar ter JVM instalada" },
      { id: "c", text: "Substituir o protocolo HTTP" },
      { id: "d", text: "Ignorar configuração de segurança" },
    ],
    "a",
    "O repackaging empacota classes + libs; a JVM continua a ser necessária.",
  ),
  q(
    "check-docker-container",
    "docker",
    "A diferença imagem vs contentor:",
    [
      { id: "a", text: "Imagem é o molde; contentor é a instância em execução" },
      { id: "b", text: "São sinónimos exactos" },
      { id: "c", text: "Contentor compila Java; imagem só faz Git" },
      { id: "d", text: "Imagem é um SELECT" },
    ],
    "a",
    "Analogia útil: classe/objeto — mas o isolamento é de processo e filesystem.",
  ),
  q(
    "check-java-backend-path",
    "java-backend",
    "Na trilha Java Backend desta plataforma, Spring Boot vem depois de:",
    [
      { id: "a", text: "Fundamentos, Java/OOP, REST e o contentor Spring" },
      { id: "b", text: "Só Docker, sem programar" },
      { id: "c", text: "Apenas HTML" },
      { id: "d", text: "Nada — é o primeiro nó" },
    ],
    "a",
    "Boot assenta em Spring + HTTP/REST + OOP. Fundamentos primeiro.",
  ),
];

const LESSONS: Array<{ node: string; title: string; summary: string; body: string; check: string }> = [
  {
    node: "logic",
    title: "Lógica de programação",
    summary: "Sequência, decisão, repetição e o hábito de decompor o problema.",
    check: "check-logic-finitude",
    body: `Programar começa por descrever um processo de forma que outra pessoa — ou uma máquina — consiga seguir.

Há três blocos elementares: sequência (fazer A, depois B), decisão (se a condição for verdadeira, faz X; senão, Y) e repetição (enquanto a condição se mantiver, faz Z). Quase todos os programas combinam só isto.

Decompor um problema não é «escrever código». É nomear os passos, as entradas e o critério de paragem. Se não consegues dizer quando o processo termina, ainda não tens um algoritmo.

Isto é independente de Java. A linguagem vem depois; a lógica é o que decide se o programa faz o que prometeste.`,
  },
  {
    node: "algorithms",
    title: "Algoritmos",
    summary: "Passos explícitos, rastreio de estado e a exigência de terminar.",
    check: "check-algo-trace",
    body: `Um algoritmo é uma sequência finita de passos inequívocos que, para uma classe de entradas, produz um resultado definido.

«Inequívoco» significa que, no mesmo estado, o próximo passo é o mesmo. «Finito» significa que não podes deixar um ciclo sem uma condição de saída que eventualmente se torne verdadeira.

Rastrear (tracing) é executar o algoritmo à mão, anotando o valor de cada variável. Se não consegues prever o estado, o procedimento ainda não está explícito.

\`\`\`
x = 1
x = x + 1
x = x + 1
\`\`\`

Começa em 1; depois de dois incrementos, x é 3. Este hábito evita «achar que o código faz» sem evidência.

Complexidade formal (O-grande) virá mais tarde. Agora o critério é: passos claros, estado visível, paragem garantida.`,
  },
  {
    node: "data-structures",
    title: "Estruturas de dados",
    summary: "Lista, mapa e a pergunta: que operação queres barata?",
    check: "check-ds-map",
    body: `Uma estrutura de dados não é um enfeite: escolhe-se pela operação que precisas de fazer bem.

Lista (ou array): elementos em ordem. Boa para percorrer do início ao fim ou aceder por posição. Má se a pergunta for «qual o valor da chave X?» e X não for um índice.

Mapa (dicionário): pares chave → valor. A operação natural é «dado este identificador, devolve o associado». Em Java isto aparece como Map; a ideia é a mesma em qualquer linguagem.

Pilha e fila restringem a ordem de acesso (último a entrar / primeiro a entrar). Usa-as quando essa disciplina é a regra do problema, não por hábito.

Antes de nomear a classe Java, escreve a operação: inserir no fim, procurar por chave, tirar o mais antigo. A estrutura segue a operação.`,
  },
  {
    node: "java",
    title: "Java e a JVM",
    summary: "Texto-fonte, bytecode e o papel da máquina virtual.",
    check: "check-java-jvm",
    body: `Um programa Java começa num ficheiro de texto (.java). O compilador \`javac\` não gera um executável nativo: gera bytecode (.class), um formato intermédio.

Quem corre o bytecode é a JVM (Java Virtual Machine). É por isso que o mesmo .class pode correr em sistemas diferentes — desde que haja uma JVM. A portabilidade não é magia; é este contrato.

Tipos primitivos (int, boolean, …) e objetos (instâncias de classes) convivem. Ainda não precisas de Spring para perceber isto: um \`main\` que imprime uma conta já exercita compile → execute.

Git, SQL e Docker são ferramentas à volta. Não substituem javac nem a JVM. Se o código não compila ou a JVM não arranca, o resto da stack é irrelevante.`,
  },
  {
    node: "oop",
    title: "OOP em Java",
    summary: "Classe, objeto, encapsulamento e quando a herança é (ou não) a ferramenta certa.",
    check: "check-oop-instance",
    body: `Orientação a objetos não é «pôr tudo numa class». É decidir que dados e operações pertencem juntos.

A **classe** é o molde: campos (estado) e métodos (comportamento). O **objeto** é uma instância criada com \`new\` — cada uma com o seu estado. Duas contas bancárias da mesma classe não partilham o saldo.

**Encapsulamento** significa expor o que o cliente precisa e esconder o resto (\`private\` + métodos). Não é formalismo: reduz o sítio onde um bug de estado pode aparecer.

**Herança** (\`extends\`) partilha comportamento quando existe uma relação «é um» estável. Preferir composição («tem um») quando estás só a reutilizar código. Herança mal usada cria hierarquias frágeis.

\`\`\`
public class Contador {
  private int valor;
  public void incrementa() { valor++; }
  public int getValor() { return valor; }
}
\`\`\`

No lab vais implementar um contador mínimo: estado privado, métodos públicos, evidência nos testes ocultos.`,
  },
  {
    node: "java-collections",
    title: "Collections em Java",
    summary: "List, Set, Map — escolhe pela operação, não pelo hábito.",
    check: "check-collections-map",
    body: `O pacote \`java.util\` oferece interfaces; as implementações (\`ArrayList\`, \`HashSet\`, \`HashMap\`) são detalhes.

**List** — sequência com ordem e índices. Duplicados permitidos. Percorrer e aceder por posição são naturais.

**Set** — conjunto: cada elemento no máximo uma vez. A pergunta é «já existe?», não «qual o índice?».

**Map** — chave → valor. A operação natural é «dado este identificador, devolve o associado».

Antes de escrever \`new ArrayList<>()\`, escreve a operação: inserir no fim, garantir unicidade, procurar por chave. A interface segue a operação; a implementação segue o perfil de custo.

\`\`\`
Set<String> vistos = new HashSet<>();
vistos.add("a");
vistos.add("a"); // tamanho continua 1
\`\`\`

No lab contás elementos únicos — evidência de Set, não de teoria decorada.`,
  },
  {
    node: "java-exceptions",
    title: "Exceptions em Java",
    summary: "Falhas explícitas: checked, unchecked, try/catch e o contrato do método.",
    check: "check-exceptions-try",
    body: `Uma exceção interrompe o fluxo normal para sinalizar que algo falhou. Ignorar o problema com um valor mágico («devolve -1») esconde a falha; uma exceção torna-a visível.

**Unchecked** (\`RuntimeException\` e subclasses): erros de programação ou estados que normalmente não queres obrigar o chamador a declarar (ex.: \`NullPointerException\`, \`IllegalArgumentException\`).

**Checked**: o compilador exige \`throws\` ou \`try/catch\`. Usam-se quando o chamador tem uma recuperação razoável (I/O é o exemplo clássico).

\`\`\`
try {
  int n = Integer.parseInt(texto);
} catch (NumberFormatException e) {
  // recuperação local — não engolir sem critério
}
\`\`\`

\`finally\` (ou try-with-resources) garante limpeza. Não uses exceções para controlo de fluxo normal.

No lab vais fazer parsing defensivo: entrada inválida não rebenta o processo sem tratamento.`,
  },
  {
    node: "git",
    title: "Git — histórico local",
    summary: "Commit como snapshot; branch como linha de trabalho; remoto é outro passo.",
    check: "check-git-snapshot",
    body: `Git grava **snapshots** do projeto. Um **commit** é um objeto: árvore de ficheiros + autor + mensagem + apontador para o(s) pai(s).

Trabalhar sem commits é trabalhar sem evidência. A mensagem descreve o *porquê* da mudança, não a lista de ficheiros (isso o próprio diff já mostra).

Um **branch** é um ponteiro móvel para um commit. Criar um branch não copia o projeto: só nomeia uma linha de trabalho. Merge (ou rebase) junta histórias — conflitos são evidência de edições concorrentes no mesmo sítio, não um bug do Git.

Remoto (\`origin\`) e \`push\` / \`pull\` são transporte. Sem remoto configurado, o histórico continua válido e local. Nesta plataforma, ligar o GitHub é uma integração separada (OAuth); commit local não implica publicação.`,
  },
  {
    node: "sql",
    title: "SQL e o modelo relacional",
    summary: "Tabelas, chaves e SELECT com filtro — a base antes de qualquer ORM.",
    check: "check-sql-where",
    body: `Uma base relacional organiza dados em **tabelas** (relações): linhas e colunas com tipos. A **chave primária** identifica a linha; a **chave estrangeira** aponta para outra tabela.

\`SELECT\` lê. \`WHERE\` filtra linhas. \`JOIN\` combina tabelas pela relação. \`INSERT\`/\`UPDATE\`/\`DELETE\` modificam; \`COMMIT\`/\`ROLLBACK\` fecham a transação.

\`\`\`
SELECT id, nome FROM produtos WHERE ativo = TRUE;
\`\`\`

ORMs e Spring Data vêm depois. Se não consegues escrever o SELECT que responde à pergunta, o mapeamento objeto-relacional só esconde a lacuna.

Nesta fase o módulo é conceptual e de verificação — não executamos SQL no sandbox Java. A biblioteca liga à documentação oficial do PostgreSQL.`,
  },
  {
    node: "testing",
    title: "Testes como evidência",
    summary: "Asserções, falha visível e o hábito de não mentir ao runner.",
    check: "check-testing-fail",
    body: `Um teste não é cerimónia: é um **contrato executável**. Dados de entrada, acção, asserção. Se a asserção falha, o processo deve sair com código ≠ 0.

Nos labs desta plataforma, \`Check.java\` é exactamente isso — testes ocultos que não vão ao cliente. O teu código ou cumpre o contrato, ou falha. Não há «quase».

Pirâmide clássica: muitos testes rápidos de unidade; menos de integração; poucos de ponta a ponta. Aqui começas pelo nível mais baixo: uma função, vários casos, falha explícita.

\`\`\`
if (Solution.twice(3) != 6) { System.out.println("FAIL"); System.exit(1); }
\`\`\`

Engolir excepções para «passar a verde» destrói a evidência. O lab pede o contrário.`,
  },
  {
    node: "rest",
    title: "REST e HTTP",
    summary: "Recursos, métodos e códigos de estado — o contrato antes do framework.",
    check: "check-rest-status",
    body: `REST organiza a API em **recursos** identificados por URI. Os métodos HTTP expressam a intenção: GET lê, POST cria/acção, PUT/PATCH actualizam, DELETE remove.

Códigos de estado comunicam o resultado: 2xx sucesso, 4xx erro do cliente (404 recurso ausente, 400 pedido inválido), 5xx falha do servidor.

Idempotência e segurança (no sentido HTTP) importam: repetir um GET não deve criar efeitos; repetir um PUT do mesmo corpo deve convergir.

Spring Web vem depois. Se não consegues dizer qual o método e o status de um caso, o \`@RestController\` só esconde a lacuna.

Neste módulo praticas o mapeamento método/status em código puro — sem Tomcat no sandbox.`,
  },
  {
    node: "spring",
    title: "Spring e IoC",
    summary: "Contentor, beans e injeção de dependências — o grafo em vez do new espalhado.",
    check: "check-spring-bean",
    body: `O Spring Core gira em torno de **Inversão de Controlo**: em vez de cada classe fazer \`new\` dos colaboradores, o **contentor** instancia e injeta dependências (construtor preferível).

Um **bean** é um objeto gerido. Scopes (singleton, etc.), ciclos de vida e proxies aparecem depois; o essencial é: o grafo de colaboração deixa de estar hardcoded.

Não precisas de Boot para perceber IoC — mas quase todo o ecossistema Java backend actual chega via Boot. Este módulo fixa o vocabulário antes dos starters.

Não corremos o contentor Spring no sandbox de lab (seria um runtime pesado e frágil aqui). A verificação é conceptual; a prática de wiring vem no projecto quando o ambiente o permitir.`,
  },
  {
    node: "spring-boot",
    title: "Spring Boot",
    summary: "Starters, auto-config e o jar executável — produtividade com trade-offs explícitos.",
    check: "check-boot-jar",
    body: `Spring Boot aplica **convenção sobre configuração**: starters puxam dependências coerentes; auto-configuration liga peças quando as classes estão no classpath; \`spring-boot:repackage\` gera um jar «fat» corrível com \`java -jar\`.

Trade-off: magia útil até falhar. Saber ler as condições de auto-config e o \`application.properties\`/\`yaml\` evita debug às cegas.

Actuator, segurança e dados são módulos à parte. Aqui o objectivo é: o que Boot resolve e o que ainda é tua responsabilidade (modelo de domínio, testes, limites de API).

Como no módulo Spring, não levantamos um servidor Boot no lab isolado desta fase — a evidência é a verificação + o projecto de catálogo já exercita OOP sem fingir um \`@SpringBootApplication\` fantasma.`,
  },
  {
    node: "docker",
    title: "Docker — imagem e contentor",
    summary: "Isolamento do runtime: o mesmo contrato que o lab já usa contra a JVM.",
    check: "check-docker-container",
    body: `Uma **imagem** é um filesystem em camadas + metadados. Um **contentor** é uma instância em execução dessa imagem, com isolamento de processo, rede e montagens.

\`Dockerfile\` descreve o build; \`docker run\` (ou Compose) instancia. Recursos (CPU, memória, pids) limitam o blast radius — exactamente o que o lab Java desta plataforma faz com Temurin num contentor.

Docker não substitui testes nem boa API. É empacotamento e isolamento. Nesta máquina de desenvolvimento o motor usa Lima/Docker; Firecracker/gVisor ficam para produção Linux endurecida.

Não aninhamos Docker-in-Docker no exercício: a verificação é conceptual, ancorada no que já viste ao correr labs.`,
  },
  {
    node: "java-backend",
    title: "Fecho — Java Backend",
    summary: "Reúne a trilha: do fundamento ao Boot, com honestidade sobre o que ainda é prática em projecto.",
    check: "check-java-backend-path",
    body: `Chegaste ao tip da formação **Java Backend** neste grafo.

Percorreste lógica, algoritmos, estruturas, Java, OOP, collections, excepções, testes, REST, Spring e Boot — com Git/SQL/Docker como recomendados à volta.

O que isto **não** é: um diploma. Evidência continua a ser labs a verde, projecto no portfólio, commits reais quando o GitHub estiver ligado.

Próximos passos naturais fora deste tip: segurança de APIs, persistência com migrações, CI/CD e cloud. O sistema está pronto para receber esses nós sem reconstruir o motor.`,
  },
];

export const GOAL_SLUG_TO_NODE: Record<string, string> = {
  java: "java-backend",
};

export async function seedCurriculum(prisma: PrismaClient) {
  for (const node of NODES) {
    await prisma.knowledgeNode.upsert({
      where: { slug: node.slug },
      create: { ...node },
      update: { title: node.title, summary: node.summary, area: node.area, sortOrder: node.sortOrder },
    });
  }

  const all = await prisma.knowledgeNode.findMany();
  const bySlug = new Map(all.map((node) => [node.slug, node.id]));

  // Só limpa arestas do currículo global — não apaga grafos gerados por objetivo.
  await prisma.nodePrerequisite.deleteMany({
    where: { node: { goalId: null }, prerequisite: { goalId: null } },
  });
  for (const edge of EDGES) {
    const nodeId = bySlug.get(edge.node);
    const prerequisiteId = bySlug.get(edge.prereq);
    if (!nodeId || !prerequisiteId) continue;
    await prisma.nodePrerequisite.create({
      data: { nodeId, prerequisiteId, nature: edge.nature },
    });
  }

  for (const item of QUESTIONS) {
    const nodeId = bySlug.get(item.node);
    if (!nodeId) continue;
    await prisma.question.upsert({
      where: { slug: item.slug },
      create: {
        slug: item.slug,
        nodeId,
        prompt: item.prompt,
        code: item.code,
        choices: item.choices,
        correctChoiceId: item.correct,
        explanation: item.explanation,
        kind: "diagnosis",
      },
      update: {
        prompt: item.prompt,
        code: item.code,
        choices: item.choices,
        correctChoiceId: item.correct,
        explanation: item.explanation,
        nodeId,
        active: true,
        kind: "diagnosis",
      },
    });
  }

  for (const item of CHECK_QUESTIONS) {
    const nodeId = bySlug.get(item.node);
    if (!nodeId) continue;
    await prisma.question.upsert({
      where: { slug: item.slug },
      create: {
        slug: item.slug,
        nodeId,
        prompt: item.prompt,
        code: item.code,
        choices: item.choices,
        correctChoiceId: item.correct,
        explanation: item.explanation,
        kind: "check",
      },
      update: {
        prompt: item.prompt,
        code: item.code,
        choices: item.choices,
        correctChoiceId: item.correct,
        explanation: item.explanation,
        nodeId,
        active: true,
        kind: "check",
      },
    });
  }

  const questions = await prisma.question.findMany({ select: { id: true, slug: true } });
  const questionBySlug = new Map(questions.map((item) => [item.slug, item.id]));

  for (const lesson of LESSONS) {
    const nodeId = bySlug.get(lesson.node);
    const checkQuestionId = questionBySlug.get(lesson.check);
    if (!nodeId || !checkQuestionId) continue;
    await prisma.learningModule.upsert({
      where: { slug: lesson.node },
      create: {
        slug: lesson.node,
        nodeId,
        title: lesson.title,
        summary: lesson.summary,
        body: lesson.body,
        checkQuestionId,
        published: true,
      },
      update: {
        title: lesson.title,
        summary: lesson.summary,
        body: lesson.body,
        checkQuestionId,
        published: true,
        nodeId,
      },
    });
  }
}
