# ToDoForMe

Klasör bazlı, sade bir yapılacaklar listesi. Her proje klasörünün kendi iş listesi vardır; genel bir tablo yerine, hangi klasörde çalışıyorsan o klasörün işlerini görürsün.

## Özellikler

- **Klasör bazlı listeler:** Soldaki listeden bir proje klasörü seç, yalnızca o projenin işleri görünür.
- **Alt işler:** Bir işin yazısına tıklayınca alt işleri hemen altında açılır. Tüm alt işler bitince ana iş otomatik tiklenir.
- **Kategoriler:** İşlere kategori ver (ör. `güvenlik`) ve üstteki filtre düğmeleriyle yalnızca o kategoriyi listele. Bir iş birden fazla kategoride olabilir.
- **Renkler:** Her kategori kendi rengini alır. Birden fazla kategorisi olan işin rengi, kategori renklerinin boya mantığıyla karışımıdır (mavi + sarı = yeşil).
- **Bağlantı çizgileri:** Aynı kategorideki işler solda ince, kesikli bir çizgiyle birbirine bağlanır.
- **Sıralama:** İşleri sürükleyip bırakarak sırala.
- **Düzenleme:** İşleri ve alt işleri `✎` düğmesiyle düzenle, `×` ile sil.

## Kurulum

1. Sağdaki **Releases** bölümünden en son `ToDoForMe Setup x.y.z.exe` dosyasını indir.
2. Çalıştır, lisans sözleşmesini onayla ve kurulum klasörünü seç.
3. Kurulum bitince uygulama açılır. Masaüstünde ve Başlat menüsünde kısayol oluşur.

Kurulum dosyası kod imzalı değildir. Windows SmartScreen "bilinmeyen yayıncı" uyarısı gösterirse **Daha fazla bilgi**, ardından **Yine de çalıştır** seçeneğini kullan.

## Kullanım

İlk açılışta `Belgelerim\ToDoForMe\Genel` klasörü otomatik oluşturulur ve soldaki listede hazır gelir; hemen iş yazmaya başlayabilirsin.

Kendi projelerini eklemek için soldaki **+ klasör ekle** düğmesiyle bir klasör seç. Klasörü listeden çıkarmak için üzerine gelince beliren `×` düğmesini kullan. Bu işlem klasörün kendisine ya da içindeki dosyalara dokunmaz.

Uygulamayı belirli bir klasörle başlatmak için klasör yolunu argüman olarak ver:

```
ToDoForMe.exe C:\Dev\cvfit
```

## Veriler nerede saklanır?

İşler, ait oldukları klasörün içindeki `.todo.json` dosyasında tutulur. Klasörü taşırsan işler de onunla taşınır. Git kullanan bir projede bu dosyayı paylaşmak istemiyorsan `.gitignore` dosyana `.todo.json` satırını ekle.

Eklenen klasörlerin listesi uygulamanın kendi ayar klasöründe (`%APPDATA%\todoforme\projects.json`) durur.

## Geliştirme

Gereksinim: [Node.js](https://nodejs.org) (22 ya da üstü önerilir).

```
npm install
npm start
```

Windows kurulum dosyasını üretmek için:

```
npm run dist
```

Çıktı `dist` klasörüne yazılır.

## Lisans

[MIT](build/license.txt)
