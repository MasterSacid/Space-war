## 1. Proje Özeti (Project Overview)
- **Proje Adı:** Space-war
- **Proje Türü:** Web tabanlı, entity (varlık) odaklı oyun.
- **Temel Teknolojiler:** Vanilla JavaScript (ES6+ Modülleri), HTML5 Canvas, CSS3.

## 2. Mimari Kurallar (Architecture Guidelines)
- **Event-Driven Architecture (Olay Güdümlü Mimari):** Sistemler arası iletişim doğrudan fonksiyon çağrılarıyla DEĞİL, Event System üzerinden yapılır. Örneğin, bir ses çalınacaksa `soundManager.play()` çağırmak yerine, ilgili event fırlatılır (`entity:move`) ve ses sistemi bunu dinler.
- **Performans ve Önbellekleme (Caching/Preloading):** Oyundaki varlıklar (özellikle sesler) oyun sırasında gecikme (latency) yaratmaması için tembel yükleme (lazy loading) ile DEĞİL, oyun başlangıcında `preload="auto"` ile belleğe alınır (Örn: `audioCache`). Yeni bir medya eklendiğinde mutlaka cache sistemine entegre edilmelidir.
- **Entity Sistemi:** Oyundaki nesneler ve karakterler modüler yapılar halindedir. Tur sistemi (turn-based) dinamikleri mevcuttur.

## 3. Kodlama Standartları (Coding Standards)
- **Modern JS:** Arrow function'lar, destructuring, ES6 sınıfları (class) ve modül (import/export) yapısını kullan.
- **Sınıf Metotları:** Event listener'lar için arrow function bağlamaları kullan (Örn: `handleMovement = () => this.playSound("move")`) ki `this` context'i kaybolmasın.
- **Temiz Kod:** Fonksiyonlar tek bir işi yapmalı (Single Responsibility). Uzun ve karmaşık metotlar yerine yardımcı (helper) fonksiyonlara böl.

## 4. AI İçin Özel Talimatlar (Specific Instructions for AI)
1. **Bozmadan Geliştir:** Mevcut sistemlerin (özellikle Event System ve Cache) nasıl çalıştığını incelemeden yeni baştan kod yazma. Var olan yardımcı metotları (utils) kullan.
2. **Medya Yönetimi:** Yeni bir ses eklendiğinde doğrudan çalmaya çalışma. Dosya yolunu `soundCatalogue`'a ekle, `preloadAll()` sistemi onu otomatik olarak cache'e alacaktır.
3. **Açıklayıcı Ol:** Karmaşık bir algoritma yazarken koda mutlaka Türkçe/İngilizce kısa ve öz yorum satırları ekle.
4. **Hata Yakalama (Error Handling):** Asenkron işlemlerde ve asset yüklemelerinde oyunun çökmesini engelleyecek defensive programming teknikleri kullan.

---

## 5. AI Sohbet Linkleri ve Referanslar (AI Chat History)
Geçmişte geliştirilen özellikler, çözülen bug'lar ve mimari kararlar için yapay zeka ile yapılan konuşmaların referans linkleri:

### Claude AI Linkleri
* [Sohbet Referansı 1 - Genel Mimari/Bugfix](https://claude.ai/share/cca87180-f43c-4429-8e39-ff24416b7901)
* [Sohbet Referansı 2 - Optimizasyon/Sistem](https://claude.ai/share/c0194ac5-ff68-4099-9dc6-e0b988080cfe)
* [Sohbet Referansı 3 - Mekanikler](https://claude.ai/share/3410dd36-233d-4b56-8c8f-668e16fa7ee4)
* [Sohbet Referansı 4 - Refactoring](https://claude.ai/share/96295240-fa79-48d1-8b37-5380f43704d7)

### OpenAI Codex (Logu Olmayan İşlemler)
* **Tile Panel Arayüzü (UI):** Ekranda sol tarafta bulunan harita/karo (tile) düzenleme paneli, işlevsellik olmadan sadece UI (Arayüz) olarak OpenAI Codex kullanılarak oluşturulmuştur. Bu işleme ait kaydedilmiş bir sohbet geçmişi veya referans linki bulunmamaktadır.
