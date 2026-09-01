/**
 * Fontes focadas em programação, tecnologia e actualizações do ramo.
 */
export type NewsFeed = {
  id: string;
  label: string;
  url: string;
  hosts?: string[];
};

export const TECH_NEWS_FEEDS: NewsFeed[] = [
  {
    id: "ars-software",
    label: "Ars Technica · Software",
    url: "https://feeds.arstechnica.com/arstechnica/software",
    hosts: ["arstechnica.com"],
  },
  {
    id: "ars",
    label: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    hosts: ["arstechnica.com"],
  },
  {
    id: "register",
    label: "The Register",
    url: "https://www.theregister.com/headlines.atom",
    hosts: ["theregister.com"],
  },
  {
    id: "infoq",
    label: "InfoQ",
    url: "https://feed.infoq.com/",
    hosts: ["infoq.com"],
  },
  {
    id: "hn",
    label: "Hacker News",
    url: "https://hnrss.org/frontpage",
    hosts: ["news.ycombinator.com", "ycombinator.com"],
  },
  {
    id: "github-blog",
    label: "GitHub Blog",
    url: "https://github.blog/feed/",
    hosts: ["github.blog", "github.com"],
  },
  {
    id: "stackoverflow-blog",
    label: "Stack Overflow Blog",
    url: "https://stackoverflow.blog/feed/",
    hosts: ["stackoverflow.blog", "stackoverflow.com"],
  },
  {
    id: "mit-tr",
    label: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    hosts: ["technologyreview.com"],
  },
  {
    id: "tomshardware",
    label: "Tom's Hardware",
    url: "https://www.tomshardware.com/feeds/all",
    hosts: ["tomshardware.com"],
  },
  {
    id: "google-programming",
    label: "Google News · programação",
    url: "https://news.google.com/rss/search?q=%28programming+OR+%22software+engineering%22+OR+%22open+source%22+OR+developer+OR+JavaScript+OR+Python+OR+TypeScript+OR+Java+OR+Rust+OR+GitHub%29+when:5d&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "google-tech-updates",
    label: "Google News · actualizações tech",
    url: "https://news.google.com/rss/search?q=%28%22software+update%22+OR+%22new+release%22+OR+%22version%22+OR+SDK+OR+API+OR+framework+OR+runtime%29+%28tech+OR+software+OR+developer%29+when:5d&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "google-ai",
    label: "Google News · IA",
    url: "https://news.google.com/rss/search?q=%28%22artificial+intelligence%22+OR+LLM+OR+%22machine+learning%22+OR+OpenAI+OR+Anthropic%29+%28model+OR+API+OR+developer+OR+research%29+when:5d&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "google-pt-dev",
    label: "Google News · prog BR",
    url: "https://news.google.com/rss/search?q=%28programa%C3%A7%C3%A3o+OR+desenvolvedor+OR+%22c%C3%B3digo+aberto%22+OR+JavaScript+OR+Python+OR+IA+OR+tecnologia%29+when:5d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
  },
];

export const TRUSTED_NEWS_HOSTS = [
  "bbc.co.uk",
  "bbc.com",
  "reuters.com",
  "arstechnica.com",
  "theverge.com",
  "wired.com",
  "techcrunch.com",
  "technologyreview.com",
  "mit.edu",
  "nature.com",
  "ieee.org",
  "spectrum.ieee.org",
  "theregister.com",
  "tomshardware.com",
  "anandtech.com",
  "infoq.com",
  "github.blog",
  "github.com",
  "stackoverflow.blog",
  "stackoverflow.com",
  "dev.to",
  "css-tricks.com",
  "smashingmagazine.com",
  "zdnet.com",
  "cnet.com",
  "venturebeat.com",
  "nvidia.com",
  "openai.com",
  "deepmind.google",
  "blog.google",
  "microsoft.com",
  "aws.amazon.com",
  "cloud.google.com",
  "developer.mozilla.org",
  "news.ycombinator.com",
  "ycombinator.com",
  "tecmundo.com.br",
  "olhardigital.com.br",
  "canaltech.com.br",
  "tecnoblog.net",
] as const;
