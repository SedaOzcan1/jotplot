# Jotplot — Ürün Dokümanı

> T0.0 çıktısı. Kapsam, mimari ve yol haritasının kaynağı `PROJECT.md`'dir; bu belge onu ürün tarafında netleştirir. Onaylanan kararlar `DECISIONS.md`'de tutulur.

## 1. Ürün özeti

Jotplot, toplantı ve ders notlarını **kaydet → anla → sor** akışıyla işleyen, AI destekli bir not ve planlama asistanıdır. Responsive bir web uygulamasıdır; telefon, tablet ve masaüstü tarayıcısında çalışır.

**İlk sürüm (MVP) odağı: çalışan modu.** Toplantı notundan kararları, görevleri, sorumluları ve tarihleri çıkarıp bir kanban panosunda takip etmek. Öğrenci modu plandadır ama MVP sonrasına kalır (bkz. Bölüm 6).

## 2. Personalar

### Birincil — Elif, 29, ürün uzmanı
- Haftada 8–10 toplantıya giriyor; not tutarken toplantıya odaklanamıyor.
- Kimin neyi üstlendiğini ve hangi kararın alındığını sonradan unutuyor.
- Telefonundan da hızlıca not yapıştırmak veya toplantıyı kaydetmek istiyor; görevleri çoğunlukla masaüstünde düzenliyor.
- **Başarı anı:** Toplantı notunu yapıştırdıktan 30 saniye içinde görevleri sorumlu ve tarihleriyle panoda görmek.

### İkincil (MVP sonrası) — Mert, 21, üniversite öğrencisi
- Derslerde hızlı not alamıyor; sınav öncesi kayıtları dinlemeye vakti yok.
- Konuları özetlenmiş ve çalışma sorusuna dönüşmüş görmek istiyor.

## 3. MVP kapsamı

| Faz | Kapsam | Persona |
|---|---|---|
| Faz 0 | Giriş yapılabilen boş uygulama, layout, CI | — |
| Faz 1 | Metin notu → agent → özet, kararlar, görevler → kanban | Elif |
| Faz 2 | Toplantı kaydı / ses yükleme → transkript → Faz 1 akışı | Elif |
| Faz 3 | Notlar ve PDF'ler üzerinde kaynaklı soru-cevap | Elif |
| Faz 4 | KVKK, analitik, demo hesabı, kalite, deploy | Herkes |

Mod seçici (T0.6) layout'ta yer alır, ancak MVP'de yalnızca **çalışan modu** aktiftir; öğrenci modu "yakında" olarak gösterilir.

## 4. User story'ler ve kabul kriterleri

Her story'nin kabul kriterleri, `PROJECT.md` Bölüm 8'deki "tamamlandı" tanımına ek olarak geçerlidir.

### E0 — Hesap ve oturum (Faz 0)

**US-0.1** Bir kullanıcı olarak e-posta veya Google hesabımla kayıt olup giriş yapmak istiyorum.
- E-posta + şifre ile kayıt, giriş ve çıkış yapılabilir; Google ile giriş çalışır.
- Giriş yapmamış kullanıcı korumalı sayfalara erişemez, giriş sayfasına yönlendirilir.
- Hatalı giriş, kayıtlı e-posta gibi durumlarda anlaşılır Türkçe hata mesajı gösterilir.
- İlk girişte kullanıcı için `profiles` kaydı ve varsayılan pano otomatik oluşur.

### E1 — Nottan göreve (Faz 1)

**US-1.1** Bir çalışan olarak toplantı notumu yapıştırıp kaydetmek istiyorum.
- Başlık (isteğe bağlı) ve metin alanı vardır; boş metin gönderilemez.
- Not kaydedilir ve not listesinde görünür.
- Gönderim sırasında hata olursa yazılan metin kaybolmaz; kullanıcı tekrar deneyebilir.

**US-1.2** Bir çalışan olarak notumdan kimin neyi ne zamana kadar yapacağını otomatik görmek istiyorum.
- Not gönderildikten sonra işleniyor durumu gösterilir.
- Agent çıktısı özet, kararlar ve görevler olarak gösterilir; görevlerde başlık, sorumlu ve tarih alanları bulunur.
- Notta sorumlu veya tarih yoksa alan boş bırakılır; uydurulmaz.
- AI çıktısı bozuk veya servis hatalıysa anlaşılır bir hata ve "tekrar dene" seçeneği gösterilir; not silinmez.
- Hedef: metin notları için sonuç 30 saniyenin altında gelir.

**US-1.3** Bir çalışan olarak agent'ın çıkardığı sonucu kaydetmeden önce düzeltmek istiyorum.
- Özet, kararlar ve her görevin tüm alanları düzenlenebilir.
- Görev silinebilir ve elle yeni görev eklenebilir.
- Onaylanan görevler varsayılan panonun "Yapılacak" kolonuna eklenir.

**US-1.4** Bir çalışan olarak görevlerimi kanban panosunda takip etmek istiyorum.
- Kolonlar: Yapılacak / Devam Ediyor / Tamamlandı.
- Masaüstünde sürükle-bırak ile, mobilde dokunarak kolayca durum değiştirilebilir.
- Görev kartından kaynak nota gidilebilir.
- Değişiklikler kaydedilir; kaydetme hatasında kart eski durumuna döner ve hata gösterilir.

**US-1.5** Bir çalışan olarak geçmiş notlarımı bulmak istiyorum.
- Not listesi tarihe göre sıralıdır; başlıkta ve metinde arama yapılabilir; türe göre (metin / ses / PDF) filtrelenebilir.
- Hiç not yoksa ilk notu oluşturmaya yönlendiren boş durum ekranı gösterilir.

**US-1.6** Bir kullanıcı olarak kullanım limitime yaklaştığımı ve aştığımı anlamak istiyorum.
- Limit aşıldığında yeni AI isteği yapılmaz ve nedenini açıklayan mesaj gösterilir.
- Kullanıcının yazdığı not limit aşımında kaybolmaz.

### E2 — Sesten not (Faz 2)

**US-2.1** Bir çalışan olarak toplantıyı tarayıcıdan kaydetmek veya ses dosyası yüklemek istiyorum.
- Kayıt başlamadan önce katılımcıların onayının alınması gerektiğini anlatan uyarı gösterilir ve kullanıcı onaylamadan kayıt başlamaz (KVKK).
- Kayıt sırasında süre gösterilir; telefonda ekran kapanıp kayıt kesilmez.
- Yükleme ilerlemesi gösterilir; yükleme hatasında kayıt cihazda kaybolmadan tekrar denenebilir.

**US-2.2** Bir çalışan olarak kaydın transkriptini ve ondan çıkan görevleri görmek istiyorum.
- Transkripsiyon durumu (işleniyor / hazır / hata) not listesinde ve detayda görünür.
- Transkript hazır olunca US-1.2 akışı otomatik başlar.
- Transkript okunabilir ve ses oynatılabilir.
- Hedef: bir saatlik kayıt için sonuç 2 dakikanın altında gelir.

### E3 — Notlarıma soru sor (Faz 3)

**US-3.1** Bir çalışan olarak geçmiş notlarıma soru sorduğumda cevabın hangi nottan geldiğini görmek istiyorum.
- Cevap akışlı olarak (yazılırken) gösterilir.
- Her cevap kaynak notlara bağlantı verir; kaynak bulunamazsa uydurmak yerine bunu açıkça söyler.
- PDF yüklenip soru-cevaba dahil edilebilir.
- Yalnızca kullanıcının kendi notları aranır.

### E4 — Gizlilik ve hesap (Faz 4)

**US-4.1** Bir kullanıcı olarak hesabımı ve tüm verilerimi silebilmek istiyorum.
- Ayarlardan, onay adımıyla hesap ve tüm veriler (notlar, kayıtlar, transkriptler, görevler) silinir.
- Gizlilik politikası uygulama içinden erişilebilir.
- Ses dosyaları belirlenen saklama süresi sonunda silinir.

## 5. Ana ekranlar

Wireframe'ler kaba yerleşimi gösterir; görsel tasarım (renk, tipografi) sonraki adımdır. Bileşenler Nuxt UI ile kurulacak.

| # | Ekran | Faz | Story |
|---|---|---|---|
| 1 | Giriş / kayıt | 0 | US-0.1 |
| 2 | Notlar (ana sayfa) ve boş durum | 0–1 | US-1.5 |
| 3 | Yeni not | 1 | US-1.1 |
| 4 | Sonuç inceleme: özet, kararlar, görevler | 1 | US-1.2, US-1.3 |
| 5 | Pano (kanban) | 1 | US-1.4 |
| 6 | Toplantı kaydı ve onay uyarısı | 2 | US-2.1 |
| 7 | Soru-cevap | 3 | US-3.1 |
| 8 | Ayarlar: kullanım, hesap silme | 1, 4 | US-1.6, US-4.1 |

**Navigasyon:** Mobilde alt sekme çubuğu (Notlar, Pano, Sor, Ayarlar) ve öne çıkan "Yeni not" butonu; masaüstünde sol kenar çubuğu.

**Wireframe dosyası (Figma):** [Jotplot — Wireframes](https://www.figma.com/design/DEsZWo6cKR4sdOIyax5Giw)

Dosyada kaba wireframe'ler var: 10 mobil çerçeve (375 px; ekran 2 ve 4 için iki durum) ve masaüstü için Notlar ile Pano (1440 px). Yeniden kullanılan parçalar (Button, Input, TaskCard, TopBar, TabBar) "Bileşenler" bölümünde. Yazı tipi olarak geçici Inter kullanıldı.

**Renk yönü (taslak):** lacivert, mavi ve turkuaz.

| Rol | Renk |
|---|---|
| Lacivert (ana) | `#0B1F4B` |
| Mavi | `#1D4ED8` |
| Turkuaz (vurgu) | `#14B8A6` |
| Arka plan | `#F1F5FB` |
| Kenarlık | `#CBD5E1` |
| Metin / ikincil metin | `#0F172A` / `#64748B` |

Ana butonlar, "+" butonu ve seçili filtreler lacivert → mavi → turkuaz gradient kullanır; görev kartlarında turkuaz bir sol şerit vardır. Masaüstü kenar çubuğu laciverttir.

## 6. Kapsam dışı (MVP)

- Öğrenci modu akışları, ders panoları ve takvim (F4 ve sonrası).
- Çoklu pano, Jira ve takvim entegrasyonları (F4).
- Feature backlog maddeleri (B1–B12).
- Premium üyelik ve ödeme (Faz 5).
- Native mobil uygulama.

## 7. Açık sorular

- Ücretsiz plan için aylık AI isteği ve ses dakikası limitleri.
- Ses dosyalarının saklama süresi.
- LLM, embedding ve STT sağlayıcıları (STT için T2.1).
- Analitik aracı.
- Görsel kimlik: tipografi, logo, karanlık tema; renk paletinin kontrast (erişilebilirlik) kontrolü.
