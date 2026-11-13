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
| `npm test` | Vitest birim ve bileşen testleri (`test/nuxt`, `test/unit`) |
| `npm run test:e2e` | Playwright uçtan uca testleri (`test/e2e`); önce `npm run build` gerekir ve yerel Supabase çalışıyor olmalı (testler kendi deneme kullanıcılarını oluşturur) |
| `npm run db:reset` | Yerel veritabanını sıfırlar ve migration'ları yeniden uygular |
| `npm run test:db` | Veritabanı testleri (pgTAP, `supabase/tests`): RLS ve yeni kullanıcı kurulumu |
| `npm run db:types` | Veritabanı şemasından TypeScript tiplerini üretir (`app/types/database.types.ts`); her migration'dan sonra çalıştır |

Playwright tarayıcısını ilk seferde kurmak için: `npx playwright install chromium`.

Her pull request'te ve `main`'e her push'ta GitHub Actions bu kontrollerin hepsini çalıştırır (`.github/workflows/ci.yml`).

### Yerel Supabase

Docker Desktop çalışırken:

```bash
npm run db:start    # Supabase'i yerelde başlatır (ilk seferde imajları indirir)
npm run db:status   # adresleri ve anahtarları gösterir
npm run db:stop     # durdurur
```

`.env.example` dosyasını `.env` olarak kopyala; `SUPABASE_URL` için API adresini, `SUPABASE_KEY` için publishable (anon) anahtarı `npm run db:status` çıktısından al. `.env` dosyası repoya eklenmez. Secret / service role anahtarı hiçbir zaman `.env`'e veya tarayıcı koduna girmez.

Google ile giriş için Google Cloud'da bir OAuth istemcisi (Web application) oluştur. Yetkili yönlendirme adresi `http://127.0.0.1:54321/auth/v1/callback`, JavaScript kaynağı `http://localhost:3000` olmalı. İstemci kimliğini ve gizli anahtarı `supabase/.env` dosyasına `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` ve `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` olarak yaz; bu dosya da repoya eklenmez. Değerleri değiştirdikten sonra `npm run db:stop` ve `npm run db:start` çalıştır. Uygulamayı `localhost:3000` adresinden aç.

Supabase Studio: http://127.0.0.1:54323 · Yerel e-postalar (Mailpit): http://127.0.0.1:54324

## Belgeler

- [PROJECT.md](PROJECT.md): kapsam, kabul kriterleri, mimari ve yol haritası
- [DECISIONS.md](DECISIONS.md): onaylanan kararlar
- [PROGRESS.md](PROGRESS.md): güncel ilerleme
- [AGENTS.md](AGENTS.md): geliştirme agent'ları için proje kuralları
