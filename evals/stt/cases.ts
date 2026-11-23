/**
 * Speech-to-text comparison cases (T2.1). Each case is a synthetic script that Seda reads aloud;
 * names and companies are made up. The script is the reference transcript the providers are
 * scored against, so a recording must follow its script word for word.
 *
 * Recordings live in evals/stt/recordings/ (git-ignored) and start with the case's file prefix,
 * for example 1-is-notu.m4a.
 */

export interface Turn {
  speaker: string
  text: string
}

export interface SttCase {
  id: string
  /** Recording file names start with this prefix. */
  filePrefix: string
  purpose: string
  /** What was said, in order. Cases with one speaker have a single turn. */
  turns: Turn[]
  /** Names and terms that must be written correctly; Turkish case is ignored. */
  keyTerms: string[]
}

export const STT_CASES: SttCase[] = [
  {
    id: 'work-note',
    filePrefix: '1-',
    purpose: 'Tek kişi, iş notu: isimler, tarihler, sayılar',
    turns: [
      {
        speaker: 'A',
        text: `Pazartesi sabahı ürün toplantısını yaptık. Yeni sürümün çıkış tarihi on iki Aralık olarak belirlendi. Ece mağaza görsellerini çarşambaya kadar hazırlayacak. Barış ödeme sayfasındaki hatayı yarın düzeltecek. Reklam bütçesi otuz beş bin liradan kırk iki bin liraya çıkarıldı. Müşteri memnuniyeti anketinde ortalama puan dört virgül bir çıktı. Derya basın bültenini gelecek hafta pazartesiye kadar yazacak. İnfluencer iş birliği konusu netleşmedi, bir sonraki toplantıda tekrar konuşulacak. Son olarak, İzmir ofisindeki ekip de sprint planlamasına katılacak.`,
      },
    ],
    keyTerms: ['Ece', 'Barış', 'Derya', 'İzmir', 'influencer', 'sprint', 'bülten'],
  },
  {
    id: 'dialogue',
    filePrefix: '2-',
    purpose: 'İki kişi: konuşmacı ayrımı',
    turns: [
      { speaker: 'A', text: 'Günaydın Kaan, müşteri raporuna bakabildin mi?' },
      {
        speaker: 'B',
        text: 'Baktım, iade oranı geçen aya göre yüzde sekiz artmış. Özellikle kargo gecikmelerinden şikâyet var.',
      },
      {
        speaker: 'A',
        text: 'Kargo firmasıyla sözleşmeyi yeniden görüşmemiz lazım. Bunu sen üstlenebilir misin?',
      },
      {
        speaker: 'B',
        text: "Olur, ama önce Selin'den son üç ayın verilerini almam gerekiyor.",
      },
      {
        speaker: 'A',
        text: "Tamam, Selin'e ben yazarım. Cuma gününe kadar bir sunum hazırlayabilir misin?",
      },
      { speaker: 'B', text: 'Cuma biraz zor, pazartesi olsa daha iyi olur.' },
      {
        speaker: 'A',
        text: 'Peki, pazartesi olsun. Bir de canlı destek yazılımı için iki teklif gelmişti, onları da karşılaştırmamız gerekiyor.',
      },
      { speaker: 'B', text: 'Fiyatları tabloya döktüm, akşam sana e-postayla gönderirim.' },
    ],
    keyTerms: ['Kaan', 'Selin', 'kargo', 'sözleşme', 'canlı destek'],
  },
  {
    id: 'lecture',
    filePrefix: '3-',
    purpose: 'Ders notu: terimler ve İngilizce kelimeler',
    turns: [
      {
        speaker: 'A',
        text: `Veri Yapıları dersinin beşinci haftasında ikili arama ağaçlarını işledik. Bir düğümün sol alt ağacındaki değerler her zaman düğümden küçük, sağ alt ağacındaki değerler ise büyüktür. Arama işleminin ortalama karmaşıklığı O log n'dir. Hoca dengeli ağaçlara örnek olarak AVL ve red-black tree yapılarını gösterdi. Üçüncü ödev, bir binary search tree implementasyonu ve on yedi Aralık'ta teslim edilecek. Vize sınavı ise yirmi üç Aralık'ta.`,
      },
    ],
    keyTerms: ['ikili arama', 'düğüm', 'AVL', 'red black', 'binary search tree', 'vize'],
  },
]
