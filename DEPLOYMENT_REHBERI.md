# 🚀 Akademik Portfolyo & CMS Deploy ve Kurulum Rehberi

Bu belge, **Muhammed Akan Akademik Görsel Özgeçmiş ve CMS** uygulamasını **GitHub**, **Supabase** ve **Vercel** üzerinde yayına almak için adım adım hazırlanmış kapsamlı rehberdir.

---

## 1. 📂 GitHub Repository Kurulumu ve Kodların Yüklenmesi

Proje dizininde yerel Git deposu ilklendirilmiştir (`git init`). Kodu kendi GitHub hesabınıza yüklemek için aşağıdaki adımları sırasıyla uygulayın:

1. [GitHub](https://github.com/new) adresine gidin ve **`academic-portfolio`** adında yeni bir repository (depo) oluşturun (*Public* veya *Private* seçebilirsiniz).
2. Terminalde proje dizinine gidin:
   ```bash
   cd /Users/byakan7/menu/academic-portfolio
   ```
3. Oluşturduğunuz GitHub reposunu uzak sunucu (remote) olarak ekleyin ve kodu gönderin:
   ```bash
   git remote add origin https://github.com/KULLANICI_ADINIZ/academic-portfolio.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. 🗄️ Supabase Veritabanı ve Storage (Medya Deposu) Kurulumu

Uygulamanız Supabase olmadan da çalışabilen akıllı bir yedekleme mekanizmasına sahiptir. Ancak kalıcı SQL veritabanı ve resim depolama için Supabase kurulumu aşağıdaki gibidir:

### A. Supabase Projesi Oluşturma
1. [Supabase Console](https://supabase.com) adresine gidin ve yeni bir **Project** başlatın.
2. Proje ayarlarından **API URL** ve **anon / public key** değerlerinizi kopyalayın:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://xxxx.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJhbGciOiJKV1Qi...`

### B. Veritabanı Tablolarını Oluşturma (SQL Migration)
1. Supabase sol panelinden **SQL Editor** bölümüne girin.
2. Projenizdeki `supabase/schema.sql` dosyasının içeriğini kopyalayıp buraya yapıştırın ve **Run** butonuna basın.
3. Bu işlem aşağıdaki tabloları ve izinleri (RLS) otomatik oluşturacaktır:
   - `public_profile`
   - `education`
   - `publications`
   - `projects`
   - `conferences`
   - `activities`
   - `references_list`
   - `social_links`
   - `seo_settings`
   - `admin_credentials`
   - `avatars` (Storage Bucket)

---

## 3. 🔺 Vercel Üzerinde Otomatik Deploy (Yayına Alma)

1. [Vercel Dashboard](https://vercel.com/new) adresine gidin.
2. GitHub hesabınızı bağlayıp **`academic-portfolio`** reposunu seçin ve **Import** butonuna tıklayın.
3. **Environment Variables** (Ortam Değişkenleri) bölümüne aşağıdaki iki değişkeni ekleyin:

   | Değişken Adı | Değer |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJKV1Qi...` |

4. **Deploy** butonuna tıklayın. Vercel yaklaşık 45 saniye içinde uygulamanızı canlı ortama alacaktır!

---

## 4. 🔐 Yönetim Paneli (CMS) Kullanımı & Şifre Yönetimi

- **CMS Giriş Adresi**: `https://siteniz.vercel.app/admin`
- **Varsayılan Giriş Bilgileri**:
  - **E-posta**: `admin@cedkan.com`
  - **Şifre**: `admin`
- **Şifre ve E-posta Değiştirme**:
  - CMS paneline giriş yaptıktan sonra üstteki **"Güvenlik & Giriş"** sekmesine geçin.
  - Yeni e-posta adresinizi ve yeni şifrenizi girerek kaydet butonuna basın. Yeni bilgileriniz anında geçerli olacaktır.

---

## 5. 🛠️ Yerel Geliştirme (Local Dev)

Yerelde çalıştırmak istediğinizde:
```bash
cd /Users/byakan7/menu/academic-portfolio
npm run dev
```
Uygulama `http://localhost:3000` adresinde çalışacaktır.
