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

## Sıradaki Adımlar

- GitHub'da `main` için koruma kuralını (ruleset) açmak ve yalnızca merge commit'e izin vermek.
- `docs/branch-workflow` branch'ini PR ile `main`'e almak.
- Nuxt iskeleti kurulmadan önce `.gitignore` ekleme kararını yeniden sormak (`.env` dosyalarının yanlışlıkla public repoya gitmemesi için).
- T0.0–T0.7 işlerini `PROJECT.md` sırasına göre yürütmek; başlangıçta Nuxt iskeleti, Supabase yerel yapılandırması, auth, şema ve CI kapsamını netleştirmek.

## Bilgilendirme Şekli

Her dış sistem adımı, önemli karar, tamamlanan kurulum ve doğrulama sonucu hem bu dosyada hem sohbet güncellemesinde belirtilecek. Tamamlanmayan veya doğrulanamayan işler tamamlandı olarak işaretlenmeyecek.