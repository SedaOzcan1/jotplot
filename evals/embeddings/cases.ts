/**
 * Embedding comparison (T3.2 decision). A small synthetic archive of the kinds of text Jotplot
 * stores: meeting notes, spoken transcripts, lecture notes, and company documents. Names and
 * companies are made up. Each question is worded differently from the passage that answers it
 * (synonyms, Turkish suffixes, English terms), so only meaning can connect them.
 */

export interface Passage {
  id: string
  kind: 'note' | 'transcript' | 'lecture' | 'document'
  text: string
}

export interface Question {
  id: string
  text: string
  /** Passages that answer the question; the first one is the best answer. */
  relevant: string[]
  /** What the question tests, shown in the report. */
  tests: string
}

export const PASSAGES: Passage[] = [
  {
    id: 'p01',
    kind: 'note',
    text: 'Pazarlama toplantısı: Yeni kampanyanın lansmanı 2 Aralık’a ertelendi. Reklam bütçesi 50.000 TL olarak onaylandı.',
  },
  {
    id: 'p02',
    kind: 'note',
    text: 'Ayşe kampanya görsellerini 25 Kasım’a kadar tasarlayacak; Mehmet bütçe raporunu cuma gününe kadar hazırlayacak.',
  },
  {
    id: 'p03',
    kind: 'note',
    text: 'Müşteri deneyimi: geçen ay iade oranı yüzde sekiz arttı, en çok şikayet kargo gecikmelerinden geliyor.',
  },
  {
    id: 'p04',
    kind: 'note',
    text: 'Kargo firmasıyla mevcut sözleşmeye devam etme kararı alındı ama fiyatlar yeniden görüşülecek; bunu Onur üstlendi.',
  },
  {
    id: 'p05',
    kind: 'note',
    text: 'Yeni ofise taşınma konuşuldu: mobilya siparişi verilecek, internet altyapısı için iki firmadan teklif alınacak.',
  },
  {
    id: 'p06',
    kind: 'note',
    text: 'Çağrı merkezinde mesai saatleri uzatılıyor; yeni vardiya düzeni 1 Aralık’ta başlıyor.',
  },
  {
    id: 'p07',
    kind: 'note',
    text: 'Canlı destek yazılımı için iki teklif geldi, fiyatlar karşılaştırılıp bir sonraki toplantıda karar verilecek.',
  },
  {
    id: 'p08',
    kind: 'note',
    text: 'Sprint review: Kerem PR review’larını cuma gününe kadar tamamlayacak, design system güncellemesi sonraki sprint’e kaldı.',
  },
  {
    id: 'p09',
    kind: 'note',
    text: 'Ürün ekibi: Can API dokümantasyonunu bitirecek, Elif test ortamını kuracak, Burak sürüm notlarını yazacak.',
  },
  {
    id: 'p10',
    kind: 'note',
    text: 'Mobil uygulamanın ödeme ekranında kart bilgisi girilince uygulama donuyor; hata Barış’a atandı.',
  },
  {
    id: 'p11',
    kind: 'transcript',
    text: 'yani şöyle düşünüyorum, influencer işini bu çeyrek yapmayalım, bütçeyi biraz daha dijital reklama kaydıralım bence',
  },
  {
    id: 'p12',
    kind: 'transcript',
    text: 'tamam o zaman ben müşteri memnuniyeti anketini haftaya pazartesi herkese mail atarım, sonuçları da bir sonraki toplantıda konuşuruz',
  },
  {
    id: 'p13',
    kind: 'transcript',
    text: 'şimdi logo yenileme konusunu iptal ettik değil mi, evet iptal, o parayı çağrı merkezine aktarıyoruz',
  },
  {
    id: 'p14',
    kind: 'lecture',
    text: 'İkili arama ağacında her düğümün sol alt ağacındaki değerler düğümden küçük, sağ alt ağacındakiler büyüktür; arama ortalama O(log n) sürer.',
  },
  {
    id: 'p15',
    kind: 'lecture',
    text: 'AVL ağaçları her eklemeden sonra döndürme işlemleriyle dengeyi korur; iki alt ağacın yükseklik farkı en fazla birdir.',
  },
  {
    id: 'p16',
    kind: 'lecture',
    text: 'Hash tablolarında çakışmalar zincirleme ya da açık adresleme ile çözülür; yük faktörü arttıkça performans düşer.',
  },
  {
    id: 'p17',
    kind: 'lecture',
    text: 'Talep eğrisi fiyat arttıkça azalır, arz eğrisi ise fiyat arttıkça artar; iki eğrinin kesiştiği nokta piyasa dengesidir.',
  },
  {
    id: 'p18',
    kind: 'lecture',
    text: 'Fiyat esnekliği, fiyattaki yüzde değişime karşı talep edilen miktardaki yüzde değişimdir; esneklik 1’den büyükse talep esnektir.',
  },
  {
    id: 'p19',
    kind: 'lecture',
    text: 'Enflasyon, genel fiyat düzeyinin sürekli artmasıdır; merkez bankası faiz oranlarını yükselterek enflasyonla mücadele eder.',
  },
  {
    id: 'p20',
    kind: 'lecture',
    text: 'Mol, 6,022 × 10²³ tane tanecik içeren madde miktarıdır; bu sayıya Avogadro sayısı denir.',
  },
  {
    id: 'p21',
    kind: 'lecture',
    text: 'Ödev 3: AVL ağacı uygulaması 17 Aralık’ta teslim edilecek; vize sınavı 23 Aralık’ta yapılacak.',
  },
  {
    id: 'p22',
    kind: 'document',
    text: 'İK politikası: yıllık izin talepleri en az iki hafta önceden yöneticiye iletilmeli; uzaktan çalışma haftada iki gün ile sınırlı.',
  },
  {
    id: 'p23',
    kind: 'document',
    text: 'Masraf beyanı: seyahat masrafları fatura ile birlikte ay sonuna kadar muhasebeye gönderilmelidir.',
  },
  {
    id: 'p24',
    kind: 'document',
    text: 'Bilgi güvenliği: şirket bilgisayarlarında parolalar 90 günde bir değiştirilmeli ve iki adımlı doğrulama açık olmalı.',
  },
]

export const QUESTIONS: Question[] = [
  {
    id: 'q01',
    text: 'Kampanya ne zamana kaydırıldı?',
    relevant: ['p01'],
    tests: 'eş anlamlı (ertelendi → kaydırıldı)',
  },
  { id: 'q02', text: 'Bütçe raporunu kim hazırlıyor?', relevant: ['p02'], tests: 'kişi' },
  {
    id: 'q03',
    text: 'Ürün iadeleri neden artmış?',
    relevant: ['p03'],
    tests: 'ek değişimi (iade oranı → iadeleri)',
  },
  {
    id: 'q04',
    text: 'Taşımacılık şirketiyle anlaşma ne oldu?',
    relevant: ['p04'],
    tests: 'eş anlamlı (kargo firması, sözleşme)',
  },
  {
    id: 'q05',
    text: 'Yeni çalışma alanı için hangi işler yapılacak?',
    relevant: ['p05'],
    tests: 'eş anlamlı (ofis → çalışma alanı)',
  },
  {
    id: 'q06',
    text: 'Destek ekibinin çalışma saatleri değişiyor mu?',
    relevant: ['p06'],
    tests: 'eş anlamlı (çağrı merkezi, mesai)',
  },
  {
    id: 'q07',
    text: 'Sohbet tabanlı müşteri desteği aracı seçildi mi?',
    relevant: ['p07'],
    tests: 'açıklama (canlı destek)',
  },
  {
    id: 'q08',
    text: 'Kod incelemelerini kim bitirecek?',
    relevant: ['p08'],
    tests: 'Türkçe soru, İngilizce terim (PR review)',
  },
  {
    id: 'q09',
    text: 'Uygulama satın alma sırasında çöküyor',
    relevant: ['p10'],
    tests: 'eş anlamlı (ödeme, donuyor)',
  },
  {
    id: 'q10',
    text: 'Sosyal medya fenomenleriyle çalışacak mıyız?',
    relevant: ['p11'],
    tests: 'konuşma dili, İngilizce terim (influencer)',
  },
  {
    id: 'q11',
    text: 'Memnuniyet anketi ne zaman gönderilecek?',
    relevant: ['p12'],
    tests: 'konuşma dili',
  },
  {
    id: 'q12',
    text: 'Marka kimliği çalışması iptal mi edildi?',
    relevant: ['p13'],
    tests: 'kavram (logo yenileme)',
  },
  {
    id: 'q13',
    text: 'Dengeli ağaç yapısı nasıl korunur?',
    relevant: ['p15'],
    tests: 'kavram (AVL)',
  },
  {
    id: 'q14',
    text: 'Binary search tree’de arama karmaşıklığı nedir?',
    relevant: ['p14'],
    tests: 'İngilizce terimle soru',
  },
  { id: 'q15', text: 'Hash çakışması nasıl çözülür?', relevant: ['p16'], tests: 'terim' },
  {
    id: 'q16',
    text: 'Bir ürünün fiyatı artınca satışlar ne kadar etkilenir?',
    relevant: ['p18', 'p17'],
    tests: 'kavram (esneklik)',
  },
  { id: 'q17', text: 'Faiz artışı neden yapılır?', relevant: ['p19'], tests: 'neden-sonuç' },
  { id: 'q18', text: 'Avogadro sayısı kaç?', relevant: ['p20'], tests: 'sayı' },
  {
    id: 'q19',
    text: 'Veri yapıları ödevinin teslim tarihi ne?',
    relevant: ['p21'],
    tests: 'tarih, benzer konular arasında',
  },
  {
    id: 'q20',
    text: 'Kaç gün evden çalışabilirim?',
    relevant: ['p22'],
    tests: 'eş anlamlı (uzaktan çalışma)',
  },
  {
    id: 'q21',
    text: 'Yol masraflarımı nasıl geri alırım?',
    relevant: ['p23'],
    tests: 'eş anlamlı (seyahat masrafı)',
  },
  {
    id: 'q22',
    text: 'Şifremi ne sıklıkla değiştirmeliyim?',
    relevant: ['p24'],
    tests: 'eş anlamlı (parola → şifre)',
  },
]
