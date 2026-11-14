# Catail Studio web sitesi

Sitenin bütün dosyaları bu klasörde. Catail uygulamasının deposundan (`clipqueue`) ayrı tutulur.

Depo: [Catail-Studio/catail-studio.github.io](https://github.com/Catail-Studio/catail-studio.github.io). `main` dalına gönderilen her değişiklik https://catail-studio.github.io/ adresinde kendiliğinden yayınlanır (`.github/workflows/pages.yml`).

| Klasör / dosya | Ne işe yarar |
|---|---|
| `public/` | **Yayına yüklenecek site.** Hostinge bu klasörün içindekiler gider, başka hiçbir şey gerekmez. |
| `site/pages/` | Sayfaların kaynağı. HTML'i burada değiştir. |
| `site/partials/` | Her sayfada aynı olan parçalar: üst menü, alt bilgi, `<head>`, ikonlar. |
| `site/site.json` | Sitenin adresi, sayfa çiftleri (Türkçe/İngilizce), eski adreslerden yönlendirmeler. |
| `site/build.mjs` | `site/` içindekilerden `public/` içindeki HTML'i üreten küçük betik. |

Sunucu tarafında kod çalışmaz; düz HTML, CSS ve JavaScript. Yollar görelidir, kökte de alt klasörde de çalışır.

## Sayfalar

| Sayfa | Türkçe | İngilizce |
|---|---|---|
| Stüdyo | `index.html` | `en/index.html` |
| Catail | `catail/index.html` | `en/catail/index.html` |
| Sürümler | `catail/surumler.html` | `en/catail/releases.html` |

## Komutlar

Bu klasörde (Node.js ve Python yeter, `npm install` gerekmez):

```powershell
npm run build   # site/ içindekilerden public/ içindeki sayfaları üretir
npm run check   # public/ kaynaklarıyla aynı mı, denetler
npm run serve   # http://localhost:5180 adresinde açar
```

`public/` içindeki HTML dosyalarını elle değiştirme; her biri `site/pages/` altındaki aynı adlı dosyadan üretilir ve en üstünde bunu söyleyen bir satır vardır. CSS, JS ve `assets/` ise doğrudan `public/` içinde durur ve elle yazılır.

- Sayfada kendi satırında `<!-- include ad -->` yazınca `site/partials/ad.html` (ya da dile özel `ad.tr.html` / `ad.en.html`) oraya girer.
- Sayfalarda `{{root}}` sitenin köküne giden yol, `{{alt}}` aynı sayfanın öbür dili, `{{to:catail/index.html}}` o sayfaya giden bağlantı, `{{url}}` sayfanın tam adresi olur.
- `public/_tasarim.html`, tasarım parçalarının örnek sayfasıdır; elle yazılır, arama motorlarına kapalıdır.

## Tasarım

- `design.css`: ortak tasarım dili (`ui-` ile başlayan sınıflar): yazı ölçeği, düğmeler, kartlar, sekmeler, üst menü, telefon menüsü, alt bilgi.
- `style.css`: kedi renk temaları (`data-cat`), kediler, pati imleçleri, sahnelerin ortak parçaları.
- `catail.css`: yalnız Catail sayfasına özgü düzen.
- `ui.js`: sekmeler, menülerin kapanması, menüde bulunduğun sayfanın işaretlenmesi.

## Sayfa üretiminin kendiliğinden yaptıkları

- **Paylaşım ve arama bilgileri:** Her sayfanın `<head>` kısmına `og:` ve `twitter:` etiketleri girer. Başlık ve açıklama sayfanın kendi `<title>` ve `description` satırından alınır, ayrıca yazılmaz.
- **Yapısal veri:** Stüdyo sayfası Google'a kendini `Organization`, Catail sayfaları `SoftwareApplication` olarak tanıtır (`site/partials/ld-*.html`).
- **Site haritası ve robots:** `sitemap.xml` ile `robots.txt` her derlemede `site.json` içindeki sayfalardan yeniden yazılır.
- **404 sayfası:** `404.html`, `site/pages/404.html` kaynağından üretilir. Her adreste açılabileceği için bağlantıları sitenin kökünden başlar (`<base>`).
- **Üst bardaki Tema menüsü:** Her sayfada; kedilerden birini seçince site o kedinin renklerine bürünür (`site/partials/themes-menu.*.html`).

## Logo

Sitedeki her Catail Studio logosu tek bir `<span class="logo">` ve seçili kedinin renklerine göre değişir. Logonun beş renkli hali `public/assets/logo/catail-studio-<kedi>.png` dosyalarındadır; hangi temada hangisinin görüneceği `style.css` içinde `--logo` ile belirlenir. Logolar özgün `public/assets/catail-studio.png` dosyasından boyanır. Logo ya da tema renkleri değişirse yeniden boya (Pillow ve NumPy gerekir):

```powershell
python site/tools/recolor_logo.py
```

## Paylaşım görselleri

Bir bağlantı paylaşıldığında görünen 1200×630 görseller `public/assets/share/` altında durur (`studio-tr.png`, `catail-en.png` gibi). Bunlar `site/share/card.html` şablonundan çizilir; yazı ya da görünüş değişirse yeniden çiz:

```powershell
npm run share
```

## Canlı sayılar

İndirme ve yıldız sayıları GitHub API'den gelir (`release.js`) ve tarayıcıda birkaç dakika saklanır. Sayı küçükken gösterilmez; `app.js` içindeki `SHOW_FROM` eşiğini (500 indirme, 50 yıldız) geçince kendiliğinden belirir. Hiçbir sayı uydurulmaz ya da tahmin edilmez.

## Gizlilik

`gizlilik.html` ve `en/privacy.html`, stüdyonun bütün araçları ve bu site için tek bir gizlilik metnidir. Bir araç yeni bir yere bağlanırsa ya da siteye bir sayaç eklenirse bu metni ve tarihini güncelle.

## Yayına alırken

1. `site/site.json` içindeki `origin` değerini alan adına çevir (`https://alanadi.com/`), sonra `npm run build`. Bütün tam adresler, site haritası ve 404 sayfası buna göre yeniden yazılır.
2. Plesk'te alan adının **SSL/TLS** ayarından ücretsiz Let's Encrypt sertifikasını aç.
3. `public/` klasörünün **içindekileri** (klasörün kendisini değil) sunucunun `httpdocs` klasörüne yükle. Gizli dosya olan `.htaccess` de gitmeli.
4. Sunucu ayarları hazır:
   - `.htaccess` Apache (Linux) içindir. Her şeyi HTTPS'e çevirir, eski adresleri kalıcı (301) olarak yeni yerlerine yönlendirir ve 404 sayfasını tanıtır. Ayrıca `.js`/`.css` için 5 dakikalık, görseller için bir haftalık önbellek koyar ve dosyaları sıkıştırır.
   - `web.config` aynı ayarların IIS (Windows) karşılığıdır.
   - Sunucu kendine ait olmayan dosyayı yok sayar. IIS'te site 500 hatası verirse sunucuda URL Rewrite yoktur; `web.config` dosyasını sil.

## Eski adresler

Catail'in sayfası önceden kökteydi. Eski adreslerde (`surumler.html`, `en/releases.html`) hemen yeni yere geçen küçük sayfalar üretilir (`site.json` içinde `redirects`). Eski ana sayfa bağlantıları (`/#indir`, `/en/#download` gibi) da stüdyo sayfasında bulunmayan bir bölümü gösteriyorsa Catail'in sayfasına gider.

## İki dil

İki dil aynı CSS, JS ve `assets/` dosyalarını kullanır. Sayfalardaki metin her dilin kendi HTML'inde; betiklerin sayfaya yazdığı metinler (indirme düğmesi, sürüm kartları, sahnelerdeki yazılar) `i18n.js` içinde, iki dilde. Sürüm notları `releases-page.js` içinde `NOTES_TR` ve `NOTES_EN`.

Bir sayfada bir şeyi değiştirdiğinde öbür dildekini de değiştir. Alan adı değişince yalnız `site/site.json` içindeki `origin` değişir, sonra `npm run build`.

## İndirme düğmesi

`release.js`, GitHub API'den yayımlanmış son sürümleri okur ve içinde kurulum dosyası (`Catail_<sürüm>_x64-setup.exe`) olan en yenisine bağlanır. Taslaklar, ön sürümler ve kurulum dosyası henüz yüklenmemiş sürümler atlanır. Sonuç beş dakika tarayıcıda saklanır ve sürümler sayfasıyla paylaşılır. API'ye ulaşılamazsa düğme Releases sayfasına gider. Yeni sürümde sitede bir şey değiştirmek gerekmez.

## Sürümler sayfası

`catail/surumler.html`, kurulum dosyası olan bütün yayımlanmış sürümleri en yeniden eskiye listeler. İndirme bağlantıları doğrudan exe dosyasına gider. Her sürümün kısa notları `releases-page.js` içindeki `NOTES_TR` ve `NOTES_EN` nesnelerinde durur. Orada olmayan bir sürüm için GitHub'daki sürüm notu gösterilir. Yeni bir sürüm çıkınca birkaç maddelik notunu iki dilde de eklemen yeterli.

## Özellik sahneleri

Catail sayfasındaki özellik sekmelerinde, rozet ve gizlilik bölümlerinde her özellik, kendi kendine oynayan küçük bir penceredir. Çoğu yalnızca CSS ile çalışır (`scenes.css`). Kuyruk, rozetteki kedi ve diller sahnelerini `scenes.js` oynatır. Sahneler yalnız ekrandayken oynar. "Daha az hareket" isteyen ziyaretçide her sahne `--freeze` ile seçilmiş bir karede durur. Bir sahnedeki bütün döngüler aynı `--loop` süresiyle ve gecikmesiz çalışmalıdır.

## Sürüme bağlı metin

`app.js` içindeki `LAST_VERSION_WITHOUT_PICKER`: yayımlanan sürüm bundan yeni olana kadar "Kedi seçimi sıradaki sürümle geliyor" yazısı görünür. Kedi seçimi hangi sürümle çıkarsa ona göre ayarla.

## Ekran görüntüleri

`assets/shots/` içindeki dosyaların üzerine yaz. Yeni görsel eklersen `site/pages/catail/index.html` (ve İngilizcesi) içindeki `#ekranlar` bölümüne bir `<figure class="shot">` ekle, `width` ve `height` değerlerini görselin gerçek boyutuna göre yaz.
