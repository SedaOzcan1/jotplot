# Jotplot Setup Notes

Bu dosya başlangıçtan itibaren yapılanları, sıradaki adımları ve engelleri kaydeder. Her önemli adım tamamlandığında güncellenecek; sohbet içindeki kısa durum bilgilendirmeleri de devam edecek.

## Hedef

`PROJECT.md` içindeki plana göre Jotplot için GitHub reposunu açmak, geliştirme agent'larını projeye göre ayarlamak ve Faz 0 kurulumuna başlamak.

## Adım Kaydı

1. **Proje planı okundu.** Ürün AI destekli not ve planlama asistanı; kapsam responsive web, teknoloji yönü Nuxt/Vue 3 + strict TypeScript ve Supabase Edge Functions.
2. **Repo görünürlüğü netleştirildi.** Seda, `SedaOzcan1/jotplot` reposunun public olmasını seçti.
3. **GitHub reposu oluşturuldu.** `SedaOzcan1/jotplot` public olarak açıldı: https://github.com/SedaOzcan1/jotplot. Repo boş bırakıldı; README, `.gitignore` ve lisans seçilmedi. `gh` ortamda kurulu değil, ancak tarayıcı oturumu ile oluşturma tamamlandı. Giriş bilgileri istenmedi veya alınmadı.
4. **Agent yapılandırması eklendi.** Kök `AGENTS.md` genel proje kurallarını; `.github/agents/` altındaki Nuxt Frontend, Supabase AI Backend ve Jotplot Code Reviewer profilleri odaklı görevleri tanımlar.
5. **Karar ve ilerleme kayıtları eklendi.** `DECISIONS.md` onaylanan kararları, `PROGRESS.md` yol haritasındaki durumu tutar.
6. **Yerel Git bağlandı.** Workspace `main` dalında Git deposu yapıldı ve GitHub adresi `origin` remote'u olarak eklendi. Dosyalar henüz stage edilmedi, commit veya push yapılmadı.
7. **Push öncesi gözden geçirme yapıldı.** Dosyalarda gerçek anahtar veya gizli bilgi bulunmadı. Global git kimliği iş adresi olduğu için Seda'nın seçimiyle bu repoya özel kimlik `Seda Ozcan <seda.ozcan73665@gmail.com>` olarak ayarlandı. Kısa Türkçe `README.md` eklendi; `.gitignore` ve lisans şimdilik eklenmedi. Seda dosyaları gözden geçirmek istediği için commit ve push bekletiliyor.
8. **Unit test agent'ı eklendi.** `.github/agents/unit-test-writer.agent.md`: Vitest ile birim testleri yazar; yalnızca test dosyalarını değiştirir, bulduğu hataları düzeltmek yerine raporlar. Global git ayarındaki iş adresi de Seda'nın isteğiyle kişisel kimlikle değiştirildi.
9. **İlk commit GitHub'a gönderildi.** `5166873` commit'i `origin/main`'e push edildi (Seda erişim anahtarıyla gönderdi; Homebrew ile `gh` kurulumu ağ hatası nedeniyle başarısız oldu).
10. **Branch düzeni belirlendi.** GitHub Flow, merge commit ile birleştirme ve korumalı `main` seçildi. Kurallar `AGENTS.md`'ye, kararlar `DECISIONS.md`'ye eklendi. Bu değişiklik `docs/branch-workflow` branch'inde.
11. **T0.0 başladı (`docs/t0-0-product-doc`).** İlk sürümün çalışan moduna odaklanması, wireframe için Figma ve bileşen kütüphanesi olarak Nuxt UI seçildi. `docs/PRODUCT.md` yazıldı. Wireframe'ler Seda'nın kişisel Figma hesabında oluşturuldu: https://www.figma.com/design/DEsZWo6cKR4sdOIyax5Giw
12. **T0.0 PR #2 ile `main`'e alındı.**
13. **T0.1 başladı (`feat/t0-1-nuxt-skeleton`).** Nuxt 4.6.3, Nuxt UI 4.12.0 (Tailwind 4), strict TypeScript 6.0.3, ESLint ve Prettier kuruldu; `.gitignore`, `.nvmrc`, `.env.example` ve `app/` klasör yapısı eklendi. Nuxt UI teması taslak palete bağlandı (primary: lacivert, secondary: turkuaz). Lint, tip kontrolü, format kontrolü ve production build başarılı; sayfa masaüstünde ve 500 px genişlikte kontrol edildi. `npm audit` geliştirme araçlarındaki `minimatch` kaynaklı 15 düşük/orta uyarı gösteriyor; zorla düzeltme ESLint'i bir ana sürüm düşüreceği için uygulanmadı.
14. **T0.1 commit edildi ve push edildi (`68fd9f2`).** Seda'nın isteğiyle PR ve merge birkaç görev sonrasına bırakıldı. Sonraki görevler bir önceki görevin branch'inden açılıyor; PR'lar sırayla açılacak.
15. **T0.7 başladı (`chore/t0-7-test-ci`, T0.1'in üstünde).** Vitest + `@nuxt/test-utils`, Playwright (masaüstü 1440 px ve mobil Pixel 7) ve GitHub Actions iş akışı eklendi. Yerelde format, lint, typecheck, birim testleri (2), build ve E2E testleri (2) geçti; birim testinin bozuk metni yakaladığı da denendi. Docker kurulu olmadığı için T0.3 (yerel Supabase) bekliyor.
16. **T0.7 commit edildi (`c6ac572`), push edilmedi.** Seda macOS'u 27.2.1'e güncelledi; güncellemeden sonra lint, typecheck, build ve tüm testler yeniden geçti.
17. **T0.6 başladı (`feat/t0-6-layout`, T0.7'nin üstünde).** Masaüstünde lacivert kenar çubuğu, mobilde üst bar ve alt sekme çubuğu, mod seçici (öğrenci modu "yakında"), Notlar / Yeni not / Pano / Sor / Ayarlar boş durum ekranları eklendi. Birim ve bileşen testleri 8/8, E2E testleri 21/21 geçti (3'ü cihaza özel olduğu için atlandı); 360 px, 390 px ve 1440 px ekran görüntüleri kontrol edildi.
18. **T0.7 ve T0.6 push edildi; T0.1, T0.7 ve T0.6 sırayla PR #3, #4 ve #5 ile `main`'e merge edildi.** Branch'ler silindi. GitHub Actions ilk kez çalıştı; "Lint, typecheck, unit tests, build" ve "End-to-end tests" işleri hem PR'larda hem `main`'de başarılı.
19. **T0.2, T0.3, T0.4 ve T0.5 tamamlandı; Faz 0 bitti.**
    - T0.2 (PR #7): `AGENTS.md`'ye klasör yapısı, isimlendirme, kütüphane ve test kuralları eklendi. `CLAUDE.md` yalnızca `AGENTS.md`'yi içe aktarıyor.
    - T0.3 (PR #8): Docker Desktop kuruldu. Supabase yerelde Supabase CLI ile çalışıyor; uygulama `@nuxtjs/supabase` modülüyle bağlanıyor.
    - T0.4 (PR #9): 9 tablolu ilk şema, her tabloda RLS ve 27 pgTAP testi eklendi. CI'a "Database tests" işi eklendi; Seda bu kontrolü `main-protection` kuralına zorunlu olarak ekledi.
    - T0.5 (PR #10): E-posta/şifre ve Google ile giriş, korumalı sayfalar ve çıkış eklendi. Seda Google Cloud'da test modunda bir OAuth istemcisi oluşturdu. Değerler git'e girmeyen `supabase/.env` dosyasında; sohbette paylaşılmadı. Google girişi Seda'nın hesabıyla elle denendi.
    - Birleştirme sırasında `DECISIONS.md`'deki kararlar, "Pending" listesinin altından kararlar tablosuna taşındı.
    - CI'da iki E2E sorunu düzeltildi: form, sayfa hazır olmadan dolduruluyordu; Google testi de yönlendirme yüzünden gerçek Google'a bağlanıyordu. Testler artık Google'a hiç bağlanmıyor.

## Sıradaki Adımlar

- Faz 1: T1.1 (not oluşturma ekranı) ile başlamak.
- T1.2 (Agent Edge Function'ı) için LLM sağlayıcısını Seda ile netleştirmek; karar hâlâ açık.
- Yayına çıkmadan önce barındırılan bir Supabase projesi ve Google OAuth istemcisinin üretim ayarları gerekecek.

## Bilgilendirme Şekli

Her dış sistem adımı, önemli karar, tamamlanan kurulum ve doğrulama sonucu hem bu dosyada hem sohbet güncellemesinde belirtilecek. Tamamlanmayan veya doğrulanamayan işler tamamlandı olarak işaretlenmeyecek.