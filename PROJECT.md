# Jotplot — Proje Planı

> Bu dosya projenin tek kaynak belgesidir. Yeni bir sohbette veya bir agent'a görev verirken önce bu dosyayı paylaş.
> **Proje adı: Jotplot** (*jot* = kısa not almak, *plot* = plan kurmak). AI destekli not ve planlama asistanı.
> Repo: `github.com/SedaOzcan1/jotplot` · Hedef alan adı: `jotplot.app` (kayıt öncesi müsaitlik kontrol edilecek).
> **Platform: yalnızca web** (responsive, mobile-first). Native mobil uygulama kapsam dışı.

---

## 1. Bağlam

- **Geliştirici:** Seda Özcan — 5+ yıllık Frontend Developer (ağırlıklı Vue.js, ayrıca React / Next.js). Backend tarafında temel bilgi: C#, .NET Core, Node.js, MSSQL.
- **Projenin amacı:**
  1. Boş olan GitHub profilini (github.com/SedaOzcan1) gerçek bir projeyle doldurmak.
  2. CV'de "temel" olarak geçen backend bilgisini (PostgreSQL, Supabase) somut bir işle kanıtlamak.
  3. CV'deki **AI agent** ve **MCP** ifadelerini destekleyen çalışan bir örnek ortaya koymak.
  4. CV'deki eksik anahtar kelimeleri gerçek deneyimle kapatmak: **TypeScript, test, CI/CD, Docker**.
  5. Frontend, full stack ve ürün/proje yönetimi başvurularında konuşulabilecek bir proje olmak.
- **Ürün hedefi:** **Responsive web uygulaması** (telefon, tablet ve masaüstü tarayıcılarında rahat kullanılır). Kullanıcılarla doğrulandıktan sonra **web'de premium üyelik** (Faz 5). Native mobil uygulama planlanmıyor.
- **Proje bitince:** CV'ye "Projeler" bölümü eklenecek, GitHub linki aktif kullanılacak.

---

## 2. Ürün Tanımı

Çalışanlar ve öğrenciler için bir **AI not ve bilgi asistanı**.
Akış: **kaydet → anla → sor**

| | Çalışan modu | Öğrenci modu |
|---|---|---|
| Ses kaydı | Toplantı | Ders / seminer |
| Agent çıktısı | Kararlar, görevler, sorumlular, tarihler | Özet, ana kavramlar, çalışma soruları |
| Görünüm | Kanban görev panosu | Ders bazlı panolar (ödev, sınav, çalışılacak konu) |
| Görevler nereye gider | **Uygulama içi proje panoları** ve/veya **dışarıya:** Jira + Google Takvim / Outlook | **Uygulama içine:** ders panoları + uygulama içi takvim |
| Soru-cevap örneği | "Geçen haftaki toplantıda bütçe için ne karar verdik?" | "Hocanın anlattığı normalizasyon konusu neydi?" |

### Personalar
- **Elif, 29, ürün uzmanı:** Haftada 8–10 toplantıya giriyor. Not tutmaktan toplantıya odaklanamıyor, kimin neyi üstlendiğini sonradan unutuyor.
- **Mert, 21, üniversite öğrencisi:** Derslerde hızlı not alamıyor. Sınav öncesi kayıtları dinlemeye vakti yok, konuları özetlenmiş ve soru haline getirilmiş görmek istiyor.

### Başarı metrikleri
- Nottan görev / özet çıkarma süresi (hedef: < 30 sn metin, < 2 dk / saatlik ses)
- Agent çıktısının düzenlenmeden kabul edilme oranı
- RAG cevaplarında kaynak gösterilme oranı
- Haftalık aktif kullanıcı ve kullanıcı başına not sayısı
- Kullanıcı başına aylık API maliyeti (premium fiyatlandırması için)

---

## 3. Özellikler

### Çekirdek (MVP — Faz 1–3)

**F1 — Nottan göreve (AI agent)**
- Kullanıcı metin yapıştırır veya bir transkript seçer, modu seçer (çalışan / öğrenci).
- LLM metni **yapılandırılmış JSON**'a çevirir (özet, kararlar, görevler, kavramlar, sorular).
- Sonuç Supabase'e kaydedilir. Görevler kanban panosunda düzenlenebilir.
- *User story:* Bir çalışan olarak toplantı notumu yapıştırdığımda, kimin neyi ne zamana kadar yapacağını otomatik görmek istiyorum.
- *Kabul kriterleri:* Görevler başlık / sorumlu / tarih alanlarıyla listelenir; kullanıcı her alanı düzenleyebilir; bozuk AI çıktısında anlaşılır hata gösterilir.

**F2 — Sesten not çıkarma**
- Ses dosyası yükleme veya tarayıcıda kayıt (MediaRecorder API).
- Dosya Supabase Storage'a yüklenir; speech-to-text ile transkripsiyon (**Türkçe desteği şart**; adaylar: OpenAI Whisper API, Deepgram).
- Uzun kayıtlar parçalara bölünerek arka planda işlenir (Whisper API dosya sınırı: 25 MB).
- Kayıttan önce **katılımcı onayı uyarısı** gösterilir (KVKK).
- Transkript doğrudan F1 akışına girer.
- *User story:* Bir öğrenci olarak ders kaydımı yüklediğimde, dersin özetini ve çalışma sorularını görmek istiyorum.

**F3 — Dokümana soru sor (RAG)**
- PDF'ler, notlar ve transkriptler parçalara bölünür, embedding üretilir, **pgvector**'da saklanır.
- Soru → anlamsal arama → LLM cevabı **kaynak göstererek** ve **akışlı (streaming)** verir.
- *User story:* Bir kullanıcı olarak geçmiş notlarıma soru sorduğumda, cevabın hangi nottan geldiğini görmek istiyorum.

### F4 — Entegrasyonlar ve panolar (Faz 4+, ilk ek özellik)

İki persona aynı ihtiyaca sahip — "agent'ın çıkardığı görevler bir yere gitsin":
- **Panolar herkes için:** Hem çalışan hem öğrenci uygulama içinde kendi panolarını oluşturabilir.
- **Jira ve takvim çalışan için ek seçenek:** Kurumsal araç kullanan çalışan görevleri dışarıya da aktarabilir; kullanmayan (Jira'sı olmayan küçük ekipler, freelancer'lar, kişisel işler) yalnızca uygulama içi panolarla çalışır.

**Çalışan — Proje panoları**
- Çalışan kendi panolarını oluşturur (örn. "Kampanya Lansmanı", "Q1 Hedefleri", "Kişisel İşler"). Kolonlar özelleştirilebilir (varsayılan: Yapılacak / Devam Ediyor / Tamamlandı).
- Agent toplantıdan çıkan görevler için hedef pano önerir (toplantı başlığı ve geçmiş eşleşmelere göre); kullanıcı onaylar veya değiştirir.
- Görevler sorumlu, son tarih, öncelik ve kaynak toplantı linkiyle tutulur.
- Jira bağlıysa bir pano bir Jira projesiyle eşleştirilebilir; o panodaki görevler tek tıkla Jira'ya aktarılır.
- *User story:* Jira kullanmayan bir çalışan olarak toplantılardan çıkan görevleri proje bazlı panolarımda takip etmek istiyorum.

**Çalışan — Jira ve takvim entegrasyonu (isteğe bağlı)**
- **Jira:** Kullanıcı Jira hesabını OAuth 2.0 ile bağlar, proje seçer. Agent'ın çıkardığı görevler seçilerek Jira'ya issue olarak aktarılır (başlık, açıklama, son tarih, kaynak toplantı linki). Aktarılan görevde Jira issue anahtarı (örn. PRJ-123) ve linki gösterilir.
- **Takvim:** Google Takvim ve **Outlook / Microsoft 365** (kurumsal kullanıcıların çoğu Outlook kullanır). Görev tarihleri takvime etkinlik olarak eklenir; agent'ın yakaladığı "bir sonraki toplantı" bilgisi için toplantı daveti taslağı oluşturulur.
- Aktarım her zaman **kullanıcı onayıyla** yapılır (önizleme → seç → aktar); otomatik toplu aktarım yok.
- *User story:* Bir çalışan olarak toplantıdan çıkan görevleri tek tıkla ekibimin Jira projesine aktarmak ve tarihleri takvimime eklemek istiyorum.
- *Kabul kriterleri:* Bağlantı ayarlardan yönetilir ve kaldırılabilir; aynı görev iki kez aktarılmaz; aktarım hatası görev bazında gösterilir.

**Öğrenci — Ders panoları ve uygulama içi takvim**
- Her ders için bir **pano** (örn. "Veritabanı Sistemleri"). Kolonlar: Yapılacak / Çalışılıyor / Tamamlandı.
- Agent, ders kaydı veya notundan **ödev, sınav, proje teslimi ve çalışılacak konuları** kart olarak çıkarır ve ilgili dersin panosuna ekler (ders, kayıt başlığından veya kullanıcı seçiminden belirlenir).
- **Uygulama içi takvim görünümü:** Tüm derslerin sınav ve teslim tarihleri tek takvimde (ay / hafta).
- İsteğe bağlı: tarihleri **.ics** olarak dışa aktarma veya Google Takvim'e ekleme (öğrenciler genelde kişisel Google Takvim kullanır).
- B2 (flashcard) ve B6 (haftalık özet) ile doğal bağlantı: "Bu hafta 2 sınavın var, çalışılacak 5 konu" gibi.
- *User story:* Bir öğrenci olarak ders kayıtlarımdan çıkan ödev ve sınav tarihlerini her ders için ayrı bir panoda ve tek bir takvimde görmek istiyorum.

**Not:** Panolar iki modda da aynı altyapıyı kullanır (`boards` tablosu). MVP'deki kanban her kullanıcı için oluşturulan varsayılan panodur; F4 ile kullanıcı istediği kadar pano açabilir.

### Feature Backlog (MVP sonrası)

| # | Özellik | Mod | Zorluk | Öncelik |
|---|---|---|---|---|
| B1 | **Takip e-postası taslağı** — toplantı sonrası katılımcılara özet e-posta | Çalışan | Kolay | Yüksek |
| B2 | **Flashcard ve quiz** — ders notundan çalışma kartları, yanlışları tekrar | Öğrenci | Kolay | Yüksek |
| B3 | **Notlar arası bağlantılar** — yeni nota ilgili eski notları önerme | İkisi | Orta | Yüksek |
| B4 | **Konuşmacı ayrımı** — etiketleri isimle eşleyip görevleri doğru kişiye atama | Çalışan | Kolay–orta | Orta |
| B5 | **Zaman damgalı transkript** — karara/göreve tıklayınca sesin ilgili anına atlama | İkisi | Orta | Orta |
| B6 | **Haftalık özet** — açık görevler, yaklaşan tarihler, tekrar edilecek konular | İkisi | Kolay–orta | Orta |
| B7 | **Çok adımlı agent (tool use)** — "bütçe görevlerini bul, önceliklendir, plan çıkar" | İkisi | Zor | CV için yüksek |
| B8 | **MCP sunucusu** — kullanıcının notlarını Claude gibi AI istemcilerine açma | İkisi | Orta | CV için yüksek |
| B9 | **Çelişki ve takip uyarısı** — değişen kararlar, tarihi geçen görevler | Çalışan | Orta–zor | Düşük |
| B11 | **Paylaşım** — notu salt okunur linkle paylaşma | İkisi | Orta | Düşük |
| B12 | **Çoklu dil** — Türkçe kaydı İngilizce özetleme ve tersi | İkisi | Kolay | Düşük |

---

## 4. Teknoloji

| Katman | Seçim | Not |
|---|---|---|
| Dil | **TypeScript** (strict mod) | Tüm proje (ön yüz + Edge Functions); `.vue` dosyalarında da `lang="ts"`, CI'da `nuxi typecheck` |
| Ön yüz | **Nuxt (Vue 3)** — güncel kararlı sürüm | **Karar verildi.** Composition API + `<script setup lang="ts">`. Supabase için `@nuxtjs/supabase` modülü, durum yönetimi için Pinia (gerektiğinde). |
| UI | Tailwind CSS + **Nuxt UI** | Mobile-first, responsive. **Karar verildi** (2026-11-12): bileşen kütüphanesi Nuxt UI. |
| Auth | Supabase Auth | E-posta + Google ile giriş |
| Veritabanı | Supabase PostgreSQL | Row Level Security (RLS) zorunlu |
| Dosya | Supabase Storage | Ses ve PDF |
| Vektör | pgvector (Supabase) | RAG için |
| **Backend mantığı** | **Supabase Edge Functions** | **Karar verildi:** Agent, STT ve RAG ön yüzden bağımsız API katmanında. API anahtarları tarayıcıya hiç inmez; ileride başka bir istemci (örn. MCP sunucusu, B8) aynı backend'i kullanabilir. |
| LLM | Claude API (veya muadili) | Özet, görev çıkarma, RAG cevapları |
| Embedding | Bir embedding API'si | Karar bekliyor |
| STT | Whisper API veya Deepgram | Türkçe kalitesi test edilecek |
| Doğrulama | Zod | LLM çıktıları ve API girdileri |
| Test | Vitest (birim), Playwright (uçtan uca) | |
| CI/CD | GitHub Actions | Her push'ta lint, type check, test |
| Yerel geliştirme | Supabase CLI (Docker) | |
| Analitik | PostHog veya Google Analytics | Ürün metrikleri için |
| Entegrasyonlar *(F4)* | Jira Cloud REST API, Google Calendar API, Microsoft Graph (Outlook) | OAuth 2.0; erişim token'ları şifreli saklanır (Supabase Vault) |
| Deploy | Vercel + Supabase | Canlı demo linki README'de |

**Maliyet notu:** LLM ve STT API'leri ücretli. Kullanıcı başına kullanım limiti en baştan uygulanacak (`usage` tablosu). Her isteğin token / dakika maliyeti kaydedilecek.

---

## 5. Veri Modeli (taslak)

Tüm tablolarda `id`, `user_id` (auth.users referansı), `created_at` bulunur. Her tabloda RLS: kullanıcı yalnızca kendi kayıtlarını görür.

| Tablo | Amaç | Önemli alanlar |
|---|---|---|
| `profiles` | Kullanıcı ayarları ve plan | `display_name`, `default_mode`, `plan` (free / premium), `plan_renews_at` — planın **tek doğruluk kaynağı** |
| `subscriptions` *(Faz 5)* | Abonelik kayıtları | `provider` (iyzico / paytr), `provider_subscription_id`, `status` (active / canceled / past_due), `current_period_end` |
| `payment_events` *(Faz 5)* | Ödeme webhook kayıtları | `provider`, `event_type`, `payload` (jsonb), `processed_at` |
| `usage` | Kullanım ve maliyet takibi | `period` (ay), `stt_minutes`, `ai_requests`, `tokens_in`, `tokens_out`, `cost_usd` |
| `sources` | Not, ses veya PDF kaynağı | `type` (text / audio / pdf), `title`, `mode` (work / student), `storage_path`, `raw_text`, `status` |
| `transcripts` | Ses transkriptleri | `source_id`, `text`, `language`, `duration_sec`, `segments` (jsonb: zaman damgası, konuşmacı) |
| `summaries` | Agent çıktısı | `source_id`, `summary`, `decisions` (jsonb), `concepts` (jsonb), `questions` (jsonb) |
| `boards` | Panolar (iki mod) | `name`, `mode` (work / student), `course_name` (öğrenci), `color`, `columns` (jsonb: özelleştirilebilir kolonlar), `is_default`, `jira_project_key` (çalışan, isteğe bağlı) |
| `tasks` | Görevler / kartlar | `board_id`, `source_id`, `title`, `type` (task / assignment / exam / study_topic), `assignee`, `due_date`, `status` (todo / doing / done), `position`, `external_provider` (jira / null), `external_id`, `external_url`, `calendar_event_id` |
| `integrations` *(F4)* | Bağlı hesaplar | `provider` (jira / google_calendar / outlook), `access_token` ve `refresh_token` (Vault'ta şifreli), `expires_at`, `settings` (jsonb: varsayılan Jira projesi, takvim id) |
| `chunks` | RAG parçaları | `source_id`, `content`, `embedding` (vector), `chunk_index` |
| `chat_messages` | Soru-cevap geçmişi | `role`, `content`, `cited_chunk_ids` (uuid[]) |

`transcripts.segments` alanı baştan eklendi; B4 (konuşmacı ayrımı) ve B5 (zaman damgası) için şema değişikliği gerekmez.
`boards` ve `tasks` içindeki tür / dış bağlantı alanları da baştan eklendi; MVP kanbanı her kullanıcı için otomatik oluşturulan varsayılan panoyu kullanır, F4'te şema değişikliği gerekmez.

---

## 6. Yol Haritası

Her faz tek başına çalışan ve GitHub'a yüklenebilen bir sürüm olmalı.

| Faz | Kapsam | Çıktı |
|---|---|---|
| **Faz 0** | Ürün dokümanı, iskelet, Supabase, auth, CI, layout | Giriş yapılabilen boş uygulama, çalışan CI |
| **Faz 1** | F1: metin → agent → özet + görevler + kanban | **CV'ye eklenebilir ilk sürüm (MVP)** |
| **Faz 2** | F2: ses yükleme / kayıt + transkripsiyon → F1 akışı | Sesten görev çıkarma |
| **Faz 3** | F3: PDF + notlar üzerinden RAG soru-cevap | Kaynaklı soru-cevap |
| **Faz 4** | Yayın: README, demo hesabı, deploy, KVKK, analitik, kalite | **Portföye hazır responsive web uygulaması** |
| **Faz 4+** | **F4: Jira + takvim (çalışan), ders panoları + uygulama içi takvim (öğrenci)**; ardından backlog'dan seçilenler (önerilen: B1, B2, B3; CV için B7, B8) | İki persona için de görevlerin "gittiği yer" |
| **Faz 5** *(gelecek)* | Web'de premium üyelik | Ödeme alan web uygulaması (Bölüm 10) |

---

## 7. Agent Görevleri

Her görev bir agent'a ayrı ayrı verilebilecek şekilde yazıldı. Bağımlılıklar parantez içinde.
Her görev Bölüm 8'deki **"tamamlandı" tanımına** uymalı.

### Faz 0 — Altyapı
- [x] **T0.0 Ürün dokümanı** — Personaları, user story'leri ve kabul kriterlerini `docs/PRODUCT.md` olarak netleştir. Ana ekranlar için kaba wireframe (Figma veya kâğıt).
- [x] **T0.1 Proje iskeleti** — Nuxt + TypeScript (strict), Tailwind, ESLint (`@nuxt/eslint`)/Prettier, klasör yapısı, `.env.example`.
- [x] **T0.2 Agent kuralları dosyası** (T0.1) — Repoda `CLAUDE.md` / `AGENTS.md`: klasör yapısı, isimlendirme, kullanılacak kütüphaneler, test ve commit kuralları. Ayrıca `DECISIONS.md` (karar kaydı) ve `PROGRESS.md` (ilerleme notu).
- [x] **T0.3 Supabase kurulumu** (T0.1) — Supabase CLI ile yerel ortam (Docker), client, ortam değişkenleri, migration klasörü.
- [x] **T0.4 Veritabanı şeması** (T0.3) — Bölüm 5'teki tüm tablolar (`profiles` ve `usage` dahil), RLS politikaları, pgvector eklentisi, yeni kullanıcı için otomatik `profiles` kaydı.
- [x] **T0.5 Auth** (T0.3) — Kayıt / giriş / çıkış, korumalı sayfalar, Google ile giriş.
- [x] **T0.6 Layout** (T0.1) — Navigasyon, mod seçici (çalışan / öğrenci), boş durum ekranları, mobile-first responsive yapı.
- [x] **T0.7 Test ve CI** (T0.1) — Vitest ve Playwright kurulumu, GitHub Actions: lint + type check + test.

### Faz 1 — Nottan göreve
- [ ] **T1.1 Not oluşturma ekranı** (T0.4, T0.6) — Metin girişi, başlık, mod seçimi, `sources` tablosuna kayıt.
- [ ] **T1.2 Agent Edge Function'ı** (T0.4) — Metin + mod alır, LLM'e gönderir, **Zod şemasına uygun JSON** döner. Mod başına ayrı prompt. Hata yönetimi. Token kullanımını `usage` tablosuna yazar.
- [ ] **T1.3 AI kalite test seti** (T1.2) — 5–10 örnek not (her iki mod) ve beklenen çıktı özellikleri; prompt değişikliklerinde çalıştırılacak script.
- [ ] **T1.4 Kullanım limiti** (T1.2) — Plan bazlı limit kontrolü (free için aylık sınır), limit aşımında kullanıcıya anlaşılır mesaj.
- [ ] **T1.5 Sonuçları kaydetme** (T1.2) — Agent çıktısını `summaries` ve `tasks` tablolarına yazma.
- [ ] **T1.6 Özet ekranı** (T1.5) — Özet, kararlar / kavramlar, sorular; düzenlenebilir alanlar.
- [ ] **T1.7 Kanban panosu** (T1.5) — Sürükle-bırak, durum güncelleme, görev düzenleme, mobilde kullanılabilir.
- [ ] **T1.8 Not listesi** (T1.1) — Kullanıcının tüm kaynakları, filtre (mod, tür), arama.
- [ ] **T1.9 E2E testi** (T1.7) — Giriş → not oluştur → görevleri gör akışı için Playwright testi.

### Faz 2 — Ses
- [ ] **T2.1 STT servisi seçimi** — Whisper ve Deepgram'ı Türkçe örnek kayıtlarla karşılaştır (kalite, konuşmacı ayrımı, zaman damgası, maliyet). Sonucu `DECISIONS.md`'ye yaz.
- [ ] **T2.2 Ses yükleme ve kayıt** (T0.4) — Dosya yükleme + MediaRecorder ile kayıt, kayıt sırasında Screen Wake Lock (telefonda ekran kapanıp kayıt kesilmesin), kayıttan önce onay uyarısı, Storage'a yükleme, ilerleme göstergesi.
- [ ] **T2.3 Transkripsiyon Edge Function'ı** (T2.1, T2.2) — Uzun kayıtları parçalara bölme, arka planda işleme, `transcripts` tablosu (segments dahil), durum takibi (işleniyor / hazır / hata), dakika kullanımını `usage`'a yazma.
- [ ] **T2.4 F1'e bağlama** (T2.3, T1.2) — Transkript hazır olunca agent'ı otomatik çalıştır.
- [ ] **T2.5 Transkript ekranı** (T2.3) — Transkripti okuma, ses oynatıcı.

### Faz 3 — RAG
- [ ] **T3.1 PDF yükleme ve metin çıkarma** (T0.4) — Storage'a yükleme, PDF'ten metin çıkarma.
- [ ] **T3.2 Chunking + embedding** (T3.1) — Metni parçalara böl, embedding üret, `chunks` tablosuna yaz. Notlar ve transkriptler için de çalışsın.
- [ ] **T3.3 Benzerlik araması** (T3.2) — pgvector ile Postgres fonksiyonu (RPC), kullanıcıya göre filtre.
- [ ] **T3.4 Soru-cevap Edge Function'ı** (T3.3) — Soru → arama → **akışlı** LLM cevabı + kaynak chunk id'leri.
- [ ] **T3.5 Sohbet ekranı** (T3.4) — Akışlı cevap gösterimi, kaynak gösterimi, geçmiş (`chat_messages`).

### Faz 4 — Yayın
- [ ] **T4.1 KVKK ve gizlilik** — Gizlilik politikası sayfası, uygulama içinden **hesap ve tüm verileri silme**, ses dosyaları için saklama süresi.
- [ ] **T4.2 Analitik** — Temel ürün olayları (not oluşturma, görev kabul/düzenleme, soru sorma) ve Bölüm 2'deki metrikler.
- [ ] **T4.3 Demo hesabı** — Örnek verilerle dolu, kayıt olmadan denenebilen hesap (seed script).
- [ ] **T4.4 Kalite** — Hata ve yükleme durumları, erişilebilirlik, mobil cihazlarda kontrol.
- [ ] **T4.5 Deploy** — Vercel + Supabase production, ortam değişkenleri, kullanım limitleri.
- [ ] **T4.6 README** — Proje açıklaması, ekran görüntüleri/GIF, 1–2 dk tanıtım videosu, teknoloji listesi, mimari diyagramı, kurulum adımları, canlı demo ve demo hesabı.
- [ ] **T4.7 CV ve LinkedIn güncellemesi** — "Projeler" bölümü, GitHub linki; Beceriler'e TypeScript, Vitest, Playwright, GitHub Actions, Docker eklenmesi.

### Faz 4+ — Entegrasyonlar ve panolar (F4)

*Ortak*
- [ ] **TF.1 Pano altyapısı** (T1.7) — İki mod için çoklu pano oluşturma / düzenleme / silme, özelleştirilebilir kolonlar, pano seçici, MVP kanbanının varsayılan panoya taşınması, kart türleri (görev / ödev / sınav / çalışılacak konu).
- [ ] **TF.2 Agent'ı panolara bağlama** (TF.1, T1.2) — Agent çıktısına kart türü ve hedef pano önerisi eklenmesi; kullanıcı onaylayınca kartların ilgili panoya yazılması.
- [ ] **TF.3 Entegrasyon altyapısı** (T0.4) — `integrations` tablosu, OAuth akışı için ortak Edge Function yapısı, token'ların Supabase Vault'ta şifreli saklanması ve yenilenmesi, ayarlar sayfasında "bağla / bağlantıyı kaldır".

*Çalışan*
- [ ] **TF.1b Proje panoları** (TF.1) — Çalışan modunda proje panoları; kartlarda sorumlu, son tarih, öncelik ve kaynak toplantı linki; pano bazlı filtreleme. Jira olmadan da tek başına kullanılabilir.
- [ ] **TF.4 Jira bağlantısı** (TF.3) — Jira Cloud OAuth 2.0 (3LO), proje listesi, varsayılan proje seçimi.
- [ ] **TF.5 Jira'ya aktarım** (TF.4, TF.1b) — Panoyu bir Jira projesiyle eşleştirme (isteğe bağlı); görev seçme → önizleme → issue oluşturma; issue anahtarı ve linkinin karta yazılması; tekrar aktarımı engelleme; görev bazında hata gösterimi.
- [ ] **TF.6 Takvim bağlantısı** (TF.3) — Google Calendar API ve Microsoft Graph (Outlook) OAuth akışları, takvim seçimi.
- [ ] **TF.7 Takvime ekleme** (TF.6) — Görev tarihlerini etkinlik olarak ekleme, `calendar_event_id` kaydı, tarih değişince etkinliği güncelleme; "bir sonraki toplantı" için davet taslağı.

*Öğrenci*
- [ ] **TF.8 Ders panoları** (TF.1) — Ders bazlı pano oluşturma (ders adı, renk), ders kaydı / notunun bir derse bağlanması, ödev / sınav / konu kartları.
- [ ] **TF.9 Uygulama içi takvim** (TF.8) — Tüm panolardaki tarihli kartların ay / hafta görünümü, ders rengine göre ayırma, karta tıklayınca ilgili panoya gitme.
- [ ] **TF.10 Takvim dışa aktarma** (TF.9) — .ics dışa aktarma; isteğe bağlı olarak TF.6 altyapısıyla Google Takvim'e ekleme.

*Kalite*
- [ ] **TF.11 Testler** — Jira ve takvim API'leri için mock'lu entegrasyon testleri; pano ve takvim akışları için E2E testleri.

---

## 8. Kurallar (tüm agent görevleri için)

- API anahtarları **asla** ön yüzde veya repoda olmayacak; yalnızca `.env` ve Edge Functions.
- İş mantığı (AI, STT, RAG) **Edge Functions'ta**; ön yüz yalnızca bu API'yi çağırır (anahtarlar sunucuda kalır, iş mantığı ön yüz çatısından bağımsız olur).
- Her tabloda RLS açık olacak.
- LLM çıktıları her zaman **Zod şeması ile doğrulanacak**; bozuk JSON'da kullanıcıya anlaşılır hata gösterilecek.
- Arayüz **mobile-first ve responsive** olacak.
- Kod ve commit mesajları İngilizce, arayüz dili Türkçe (ileride İngilizce eklenebilir).
- Küçük ve anlamlı commit'ler; her faz sonunda bir release/tag.
- Önemli teknik kararlar gerekçesiyle `DECISIONS.md`'ye, her görevin sonucu `PROGRESS.md`'ye yazılacak.

### "Tamamlandı" tanımı
- [ ] TypeScript hatası yok, lint temiz
- [ ] İlgili testler yazıldı ve geçiyor
- [ ] Mobil ve masaüstü görünümde kontrol edildi
- [ ] Hata ve yükleme durumları ele alındı
- [ ] `PROGRESS.md` güncellendi, commit atıldı

---

## 9. Açık Kararlar

- [x] ~~Nuxt mı, Next.js mi?~~ → **Nuxt (Vue 3) + TypeScript** (2026-11). Gerekçe: 5+ yıllık Vue deneyimiyle MVP'ye en hızlı yol; proje yalnızca web olduğu için mobil yol kriteri ortadan kalktı.
- [x] ~~Uygulamanın adı~~ → **Jotplot** (2026-11). App Store, Product Hunt ve GitHub'da aynı adlı ürün bulunmadı. `jotplot.com` "premium domain for sale" olarak listeleniyor; `jotplot.app` / `.io` kayıt sitesinden kontrol edilecek. Elenen adaylar: Jottask (jottask.app'te aktif AI görev yönetimi ürünü), Unjumble (aynı işi yapan iOS uygulaması), Clarinote, Debrief, Quillo vb.
- [x] ~~Platform~~ → **Yalnızca web** (responsive). Native mobil (Capacitor / React Native) kapsam dışı.
- [x] ~~İlk sürümde hangi mod?~~ → **Çalışan modu** (2026-11-12). Öğrenci modu MVP sonrasına kalır.
- [x] ~~UI bileşen kütüphanesi~~ → **Nuxt UI** (2026-11-12), Tailwind tabanlı.
- [ ] LLM ve embedding sağlayıcısı
- [ ] STT servisi (T2.1 sonucuna göre)
- [ ] Analitik aracı (PostHog mu, Google Analytics mi)
- [ ] *(F4)* Sadece Jira Cloud mu, Jira Server / Data Center da mı? (Öneri: yalnızca Cloud.) Outlook ilk sürümde mi, sonra mı?
- [ ] *(Faz 5)* Ödeme sağlayıcısı (iyzico mu, PayTR mi) ve fiyatlar

---

## 10. Gelecek Faz ve Kapsam Dışı (web MVP kullanıcılarla doğrulandıktan sonra)

### Faz 5 — Web'de premium üyelik

**Neden web'de:**
- Mağaza komisyonu yok (mağazalar abonelikten genelde %15–30 alır; ödeme sağlayıcısı komisyonu çok daha düşük).
- Mağaza incelemesi ve uygulama içi satın alma kuralları olmadan daha hızlı yayına alınır.
- Altyapı hazır: `profiles.plan`, `usage` ve plan bazlı limitler Faz 0–1'den beri mevcut.

**Fiyatlandırma:**
- Asıl maliyet STT ve LLM. Ücretsiz plan aylık dakika sınırıyla (örn. 60 dk), premium daha yüksek limit + B1/B2/B6 gibi özelliklerle.
- Fiyat, `usage` verisinden hesaplanan kullanıcı başına maliyete göre belirlenecek. Aylık ve yıllık seçenek.

**Ödeme:**
- Stripe Türkiye'de kurulu işletmeleri desteklemiyor; **iyzico** veya **PayTR** değerlendirilecek.
- Seçilen sağlayıcının **tekrarlayan ödeme (abonelik)** desteği şart (iyzico'nun abonelik ürünü var).
- Plan değişiklikleri yalnızca **sunucu tarafında, doğrulanmış webhook'lar** ile yapılır; ön yüz planı asla kendisi değiştirmez.

**Yasal (satıştan önce tamamlanmalı):**
- Şirket veya şahıs şirketi, e-fatura / e-arşiv.
- Mesafeli satış sözleşmesi, ön bilgilendirme formu, dijital hizmetlerde cayma hakkına ilişkin bilgilendirme.
- KVKK aydınlatma metni, kullanım koşulları.

**Agent görevleri:**
- [ ] **T5.1 Ödeme sağlayıcısı seçimi** — iyzico ve PayTR'yi abonelik desteği, komisyon, test ortamı ve dokümantasyon açısından karşılaştır; `DECISIONS.md`'ye yaz.
- [ ] **T5.2 Abonelik şeması** (T5.1) — `subscriptions` ve `payment_events` tabloları, RLS (kullanıcı yalnızca okuyabilir; yazma yalnızca sunucu).
- [ ] **T5.3 Fiyatlandırma sayfası** — Free / Premium karşılaştırması, aylık / yıllık seçimi, SSS.
- [ ] **T5.4 Ödeme akışı** (T5.2) — Edge Function ile ödeme başlatma, sağlayıcının ödeme formu, başarılı / başarısız dönüş ekranları.
- [ ] **T5.5 Webhook işleyici** (T5.2) — İmza doğrulama, tekrar eden olaylara karşı koruma (idempotency), `payment_events` kaydı, `subscriptions` ve `profiles.plan` güncelleme.
- [ ] **T5.6 Abonelik yönetimi** (T5.5) — Mevcut plan, yenileme tarihi, ödeme geçmişi, kullanıcının kendi kendine iptal edebilmesi.
- [ ] **T5.7 Premium özellik kilitleri** (T5.5) — Plan bazlı limitler ve premium özelliklerde yükseltme yönlendirmesi; ödeme başarısız olursa (past_due) bilgilendirme ve geçiş süresi.
- [ ] **T5.8 Yasal sayfalar** — Mesafeli satış sözleşmesi, ön bilgilendirme, kullanım koşulları, KVKK aydınlatma metni (içerik bir hukukçuya kontrol ettirilmeli).
- [ ] **T5.9 Test** — Sağlayıcının test ortamında başarılı ödeme, başarısız ödeme, iptal ve yenileme senaryoları için E2E testleri.
- [ ] **T5.10 Gelir ve dönüşüm metrikleri** — Free → Premium dönüşüm oranı, aylık tekrarlayan gelir (MRR), iptal oranı, kullanıcı başına maliyet / gelir.

### Kapsam dışı: native mobil uygulama
Jotplot yalnızca web olarak geliştirilecek; Capacitor / React Native, mağaza yayını ve mağaza ödemeleri planda yok. Telefondan kullanım responsive web arayüzüyle karşılanır. Bununla ilgili bilinmesi gereken web kısıtları:
- **Telefonda uzun ses kaydı:** Mobil tarayıcılar ekran kilitlenince veya sekme arka plana geçince kaydı durdurabilir. Bu yüzden tarayıcıda kayıt sırasında **Screen Wake Lock API** ile ekran açık tutulur ve kullanıcı uyarılır; uzun dersler için asıl önerilen yol, telefonun kendi ses kaydedicisiyle kaydedip **dosya yüklemek** (F2 zaten destekliyor).
- **İsteğe bağlı PWA:** Ana ekrana eklenebilir uygulama (manifest + service worker) web kapsamında kalır; ihtiyaç olursa Faz 4+ sonrasında eklenebilir.

---

## 11. CV'ye Eklenecek Madde (taslak, proje bitince güncellenecek)

> **Jotplot** — AI destekli not ve planlama asistanı | github.com/SedaOzcan1/jotplot | [Canlı demo]
> - Nuxt/Vue, TypeScript, Supabase (PostgreSQL, Auth, Storage, pgvector, Edge Functions) ve LLM API'leri ile uçtan uca geliştirdiğim full stack, responsive web uygulaması.
> - Ses kayıtlarını transkripte, notları AI agent ile görev ve özetlere dönüştüren; dokümanlar üzerinde kaynaklı soru-cevap (RAG) sunan yapı.
> - Vitest ve Playwright ile test, GitHub Actions ile CI/CD; persona, user story ve ürün metrikleriyle planlanan ürün süreci.
