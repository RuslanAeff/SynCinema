# SynCinema Teknik Tanıtım Belgesi

## Web Tabanlı Video Oynatımı için Çoklu Cihaz Ses Yönlendirme ve Senkronizasyonu

**Versiyon:** 1.0  
**Tarih:** Ocak 2026  
**Yazar:** Ruslan Aliyev  
**İletişim:** [GitHub](https://github.com/RuslanAeff/SynCinema)

---

## Yönetici Özeti

SynCinema, kullanıcıların video oynatımıyla senkronize kalarak birden fazla ses parçasını farklı çıkış cihazlarına yönlendirmesini sağlayan, açık kaynaklı, tarayıcı tabanlı bir uygulamadır. Tamamen W3C web standartları üzerine inşa edilen SynCinema, ortak izleme ortamlarında kişiselleştirilmiş ses deneyimlerine olan artan ihtiyacı karşılamaktadır.

**Temel İnovasyon:** Standart Web API'leri kullanarak istemci taraflı çoklu ses yönlendirme, özel donanım veya sunucu altyapısı ihtiyacını ortadan kaldırır.

**Birincil Kullanım Senaryoları:**
- 🎬 Çok dilli aile izleme (her izleyici tercih ettiği dili duyar)
- ♿ Erişilebilirlik (kişisel cihazlarda sesli betimleme)
- 🎭 Sessiz sinema etkinlikleri (ses katılımcıların kulaklıklarına dağıtılır)
- 🎓 Dil öğrenimi (orijinal + dublajlı ses karşılaştırması)

---

## 1. Problem Tanımı

### 1.1 Ortak İzleme İkilemi

Çok izleyicili ortamlarda (aileler, sınıflar, sinemalar), temel bir çatışma vardır: **tek video kaynağı, birden fazla ses tercihi**. Mevcut çözümler şunları gerektirir:

- Pahalı tescilli donanım (Sonos, özel sinema ekipmanları)
- Sunucu taraflı akış altyapısı
- Platforma özgü uygulamalar

### 1.2 Pazar Boşluğu

Mevcut hiçbir çözüm şunları sağlayamaz:
- ✅ Sıfır maliyet girişi (sadece tarayıcı, donanım yok)
- ✅ Çapraz platform uyumluluğu (modern tarayıcısı olan her cihaz)
- ✅ Kullanıcı kontrollü ses yönlendirme (servis sağlayıcı kontrolünde değil)
- ✅ Çevrimdışı yetenek (ilk yüklemeden sonra internet gerekmez)

---

## 2. Teknik Mimari

### 2.1 Teknoloji Yığını

| Katman | Teknoloji | Standart/Kaynak |
|--------|-----------|-----------------|
| Ses İşleme | Web Audio API | W3C Tavsiyesi |
| Cihaz Yönlendirme | Audio Output Devices API | W3C Çalışma Taslağı (2015) |
| Medya Oynatma | HTML5 Video/Audio | WHATWG Yaşayan Standart |
| UI Framework | React 18 | MIT Lisansı |
| Derleme Sistemi | Vite | MIT Lisansı |

### 2.2 Temel Bileşenler

```
┌─────────────────────────────────────────────────────────┐
│                    SynCinema Mimarisi                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Video     │    │   Ses       │    │   Ses       │ │
│  │   Kaynağı   │    │   Parça 1   │    │   Parça 2   │ │
│  │   (MP4)     │    │   (MP3)     │    │   (WAV)     │ │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
│         │                  │                  │         │
│         ▼                  ▼                  ▼         │
│  ┌─────────────────────────────────────────────────────┐│
│  │              AudioContext (Web Audio API)           ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              ││
│  │  │ Kaynak  │  │ Kaynak  │  │ Kaynak  │              ││
│  │  │ Düğümü  │  │ Düğümü  │  │ Düğümü  │              ││
│  │  └────┬────┘  └────┬────┘  └────┬────┘              ││
│  │       │            │            │                    ││
│  │       ▼            ▼            ▼                    ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              ││
│  │  │  Ses    │  │  Ses    │  │  Ses    │              ││
│  │  │ Düğümü  │  │ Düğümü  │  │ Düğümü  │              ││
│  │  └────┬────┘  └────┬────┘  └────┬────┘              ││
│  │       │            │            │                    ││
│  │       ▼            ▼            ▼                    ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              ││
│  │  │Biquad   │  │Biquad   │  │Biquad   │  (3-Bant EQ)││
│  │  │ Filtre  │  │ Filtre  │  │ Filtre  │              ││
│  │  └────┬────┘  └────┬────┘  └────┬────┘              ││
│  └───────┼────────────┼────────────┼───────────────────┘│
│          │            │            │                    │
│          ▼            ▼            ▼                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │  Cihaz A  │  │  Cihaz B  │  │  Cihaz C  │           │
│  │(Hoparlör) │  │ (Kulaklık)│  │(Bluetooth)│           │
│  └───────────┘  └───────────┘  └───────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Ses Yönlendirme Uygulaması

SynCinema, W3C tarafından standartlaştırılan `HTMLMediaElement.setSinkId()` metodunu kullanır:

```javascript
// Standart W3C API kullanımı
const audioElement = document.createElement('audio');
audioElement.src = 'ses-parcasi.mp3';

// Belirli cihaza yönlendir
const deviceId = 'abc123-cihaz-id';
await audioElement.setSinkId(deviceId);
```

**Standart Referansı:**
- W3C Audio Output Devices API: https://www.w3.org/TR/audio-output/
- İlk Çalışma Taslağı: 10 Şubat 2015
- Tarayıcı Desteği: Chrome 49+, Edge 79+, Firefox (bayrak), Safari (kısmi)

### 2.4 Senkronizasyon Mekanizması

SynCinema **kullanıcı kontrollü senkronizasyon** modeli kullanır:

```javascript
// Manuel ofset ayarı (kullanıcı kontrollü)
function applyOffset(audioElement, offsetMs) {
    const videoTime = videoElement.currentTime;
    audioElement.currentTime = videoTime + (offsetMs / 1000);
}
```

**Temel Tasarım Kararı:** Otomatik kayma düzeltmesi yerine manuel senkronizasyon tercih edilmiştir:
1. Hesaplama yükünü azaltmak için
2. Kullanıcılara hassas kontrol vermek için
3. Patent korumalı otomatik senkronizasyon algoritmalarından kaçınmak için

---

## 3. Önceki Teknik ve Açık Standartlar

### 3.1 Temel Teknolojiler

SynCinema, yerleşik açık kaynak projeleri ve web standartları üzerine inşa edilmiştir:

| Teknoloji | Yıl | İlgililik |
|-----------|-----|-----------|
| **Popcorn.js** (Mozilla) | 2011 | Video ile senkronize medya olayları |
| **Video.js** | 2010 | HTML5 video oynatıcı çerçevesi |
| **Web Audio API** | 2011 | Ses işleme standardı |
| **Audio Output Devices API** | 2015 | Cihaz yönlendirme yeteneği |

### 3.2 W3C Standartları Zaman Çizelgesi

```
2011 ─── Web Audio API taslağı yayınlandı
         │
2015 ─── Audio Output Devices API ilk çalışma taslağı
         │ - setSinkId() metodu tanımlandı
         │ - Cihaz listeleme için enumerateDevices()
         │
2016 ─── Chrome 49 setSinkId() uyguladı
         │
2020 ─── Yaygın tarayıcı desteği
         │
2026 ─── SynCinema olgun standartları kullanıyor
```

### 3.3 Açık Kaynak Referansları

```
Popcorn.js: https://github.com/mozilla/popcorn-js
Video.js: https://github.com/videojs/video.js
Web Audio API Örnekleri: https://github.com/mdn/webaudio-examples
```

---

## 4. Ayırt Edici Özellikler

### 4.1 İstemci Taraflı Mimari

Sunucuya bağımlı çözümlerin aksine, SynCinema tüm sesi yerel olarak işler:

| Özellik | SynCinema | Geleneksel Çözümler |
|---------|-----------|---------------------|
| Sunucu Gerekli | ❌ Hayır | ✅ Evet |
| İnternet Gerekli | ❌ Hayır (yüklemeden sonra) | ✅ Evet |
| Kullanıcı Verisi Gönderilir | ❌ Hiç | ✅ Akış verisi |
| Gecikme | ~10ms | 100-500ms |
| Maliyet | Ücretsiz | Abonelik/Donanım |

### 4.2 Parça Başına Ses İşleme

Her ses parçası bağımsız olarak sahiptir:
- **Ses kontrolü** (0-100%)
- **3-bant EQ** (Bas/Orta/Tiz, ±12dB)
- **Oynatma hızı** (0.5x - 2.0x)
- **Ofset ayarı** (±10 saniye)
- **Cihaz yönlendirme** (bağlı herhangi bir ses cihazı)

### 4.3 Proje Kalıcılığı

Kullanıcılar tam proje yapılandırmalarını kaydedip yükleyebilir:

```json
{
  "version": "2.0",
  "videoFile": "film.mp4",
  "audioTracks": [
    {
      "id": "track-1",
      "file": "turkce.mp3",
      "deviceId": "hoparlor-123",
      "volume": 0.8,
      "offset": 0.2,
      "eq": { "low": 2, "mid": 0, "high": -1 }
    },
    {
      "id": "track-2", 
      "file": "ingilizce.mp3",
      "deviceId": "kulaklik-456",
      "volume": 1.0,
      "offset": 0.15,
      "eq": { "low": 0, "mid": 0, "high": 0 }
    }
  ]
}
```

---

## 5. Kullanım Senaryoları

### 5.1 Çok Dilli Aile İzleme

**Senaryo:** Bir aile birlikte film izliyor. Baba Türkçe sesi, anne İngilizce sesi, çocuk Almanca sesi tercih ediyor.

**Çözüm:**
1. Video dosyasını yükle
2. Türkçe sesi ekle → TV hoparlörlerine yönlendir
3. İngilizce sesi ekle → Bluetooth kulaklığa yönlendir (anne)
4. Almanca sesi ekle → Kablolu kulaklığa yönlendir (çocuk)
5. Dudak senkronizasyonu için bireysel ofsetleri ayarla

### 5.2 Erişilebilirlik Geliştirmesi

**Senaryo:** Görme engelli bir izleyici, ana sesin yanında sesli betimlemeye ihtiyaç duyuyor.

**Çözüm:**
1. Orijinal sesli videoyu yükle
2. Sesli betimleme parçası ekle → Kişisel kulaklığa yönlendir
3. Ana ses oda hoparlörlerinden çalıyor
4. İzleyici ikisini de duyuyor: oda ortamı + kişisel betimleme

### 5.3 Eğitimsel Ses Karşılaştırması

**Senaryo:** Dil öğrencisi orijinal ve dublajlı versiyonları karşılaştırmak istiyor.

**Çözüm:**
1. Videoyu yükle
2. Orijinal dil sesini ekle (sol kulak)
3. Hedef dil dublajını ekle (sağ kulak)
4. Öğrenci telaffuzu gerçek zamanlı karşılaştırabilir

---

## 6. Teknik Sınırlamalar

### 6.1 Tarayıcı Uyumluluğu

| Tarayıcı | setSinkId Desteği | Notlar |
|----------|-------------------|--------|
| Chrome | ✅ Tam | v49'dan beri |
| Edge | ✅ Tam | v79'dan beri |
| Firefox | ⚠️ Bayrak | Deneysel |
| Safari | ⚠️ Kısmi | WebKit sınırlamaları |

### 6.2 Donanım Kısıtlamaları

- Maksimum eşzamanlı cihaz: İS ses alt sistemiyle sınırlı
- Bluetooth gecikmesi: 40-200ms (cihaza bağlı)
- USB ses gecikmesi: 5-20ms
- Cihazlar arası saat kayması: Periyodik manuel ayar gerektirir

### 6.3 Kasıtlı Dışlamalar

Aşağıdaki özellikler **kasıtlı olarak uygulanmamıştır**:

| Özellik | Neden |
|---------|-------|
| Otomatik senkronizasyon algoritmaları | Patent değerlendirmeleri |
| Ağ ses akışı | Kapsam sınırlaması |
| DRM içerik desteği | Hukuki karmaşıklık |
| Ses parmak izi çıkarma | Gizlilik endişeleri |

---

## 7. Yol Haritası

### Faz 1: Mevcut Sürüm ✅
- Yerel dosya oynatma
- Çoklu cihaz yönlendirme
- Manuel senkronizasyon
- Proje kaydetme/yükleme

### Faz 2: Planlanan
- YouTube URL desteği (gömme yoluyla)
- Altyazı senkronizasyonu
- Geliştirilmiş mobil deneyim

### Faz 3: Gelecek Değerlendirmesi
- WebRTC eşler arası ses paylaşımı
- Bulut proje depolama
- Üçüncü taraf entegrasyonu için API

---

## 8. Lisans ve Fikri Mülkiyet

SynCinema aşağıdaki koşullarla **Özel Lisans** altında yayınlanmıştır:

### İzin Verilen Kullanımlar:
- ✅ Kaynak kodunu görüntüleme ve inceleme
- ✅ Kişisel, ticari olmayan kullanım
- ✅ Eğitim amaçlı kullanım
- ✅ Güvenlik araştırması ve denetimi
- ✅ İyileştirmelerle katkıda bulunma (Yazar onayıyla)

### Kısıtlamalar:
- ❌ Lisans olmadan ticari kullanım
- ❌ İzinsiz türev eserler oluşturma
- ❌ Ticari amaçlı yeniden dağıtım
- ❌ Lisans olmadan SaaS olarak sunma

### Ticari Lisanslama:
Ticari kullanım için lütfen ticari lisans almak üzere Yazar ile iletişime geçin.

**Depo:** https://github.com/RuslanAeff/SynCinema  
**Telif Hakkı:** © 2025-2026 Ruslan Aliyev. Tüm Hakları Saklıdır.

---

## 9. Sonuç

SynCinema, sofistike çoklu ses deneyimlerinin özel altyapı olmadan standart web teknolojileri aracılığıyla sunulabileceğini göstermektedir. 2015'ten beri kurulan W3C standartlarından yararlanarak, proje erişilebilir, çapraz platform ses kişiselleştirmesi için bir temel sağlar.

Otomatik algoritmalar yerine **manuel kullanıcı kontrolleri**nin kasıtlı kullanımı, hem kullanıcı güçlendirmesini hem de patent korumalı metodolojilerden özgürlüğü sağlar.

---

## Referanslar

1. W3C Web Audio API Spesifikasyonu: https://www.w3.org/TR/webaudio/
2. W3C Audio Output Devices API: https://www.w3.org/TR/audio-output/
3. MDN Web Docs - Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
4. Mozilla Popcorn.js (Arşiv): https://github.com/mozilla/popcorn-js
5. WHATWG HTML Yaşayan Standart: https://html.spec.whatwg.org/

---

**Belge Versiyon Geçmişi:**
| Versiyon | Tarih | Değişiklikler |
|----------|-------|---------------|
| 1.0 | Ocak 2026 | İlk sürüm |

---

*Bu belge bilgilendirme amaçlı sunulmakta olup, SynCinema projesinin teknik temelini ve önceki teknik dayanağını ortaya koymaktadır.*
