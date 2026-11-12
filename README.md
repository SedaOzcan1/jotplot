# Jotplot

Çalışanlar ve öğrenciler için AI destekli not ve planlama asistanı. Akış: **kaydet → anla → sor**.

> Proje erken kurulum aşamasındadır (Faz 0). Henüz çalışan bir uygulama yoktur.

## Teknoloji

- Nuxt (Vue 3, Composition API) ve strict TypeScript
- Supabase: PostgreSQL, Auth, Row Level Security ve Edge Functions
- AI, konuşmadan metne dönüştürme ve RAG işlemleri sunucu tarafında, Edge Functions içinde

Jotplot responsive bir web uygulamasıdır; native mobil uygulama planlanmamaktadır.

## Yerel geliştirme

Gereksinim: Node.js 24.15 (sürüm `.nvmrc` içinde). nvm kullanıyorsan:

```bash
nvm use
npm install
npm run dev
```

Uygulama http://localhost:3000 adresinde açılır. Diğer komutlar:

| Komut | Ne yapar |
|---|---|
| `npm run build` | Production build |
| `npm run lint` | ESLint kontrolü |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run format` / `npm run format:check` | Prettier ile biçimlendirme / kontrol |

Ortam değişkenleri için `.env.example` dosyasını `.env` olarak kopyala. `.env` dosyası repoya eklenmez.

## Belgeler

- [PROJECT.md](PROJECT.md): kapsam, kabul kriterleri, mimari ve yol haritası
- [DECISIONS.md](DECISIONS.md): onaylanan kararlar
- [PROGRESS.md](PROGRESS.md): güncel ilerleme
- [AGENTS.md](AGENTS.md): geliştirme agent'ları için proje kuralları
