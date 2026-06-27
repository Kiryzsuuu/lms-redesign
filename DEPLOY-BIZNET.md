# Deploy LMS ke Biznet NEO VPS (Ubuntu)

Arsitektur: **Nginx** (serve React + SSL + reverse proxy) → **Node/Express** (PM2, port 4000) → **MongoDB Atlas**.
Domain: `edulyfe.id`.

---

## 0. Arahkan DNS dulu (di panel NEO Domain)
Buat A record domain ke **IP publik VPS NEO** Anda:

| Type | Name | Value           |
|------|------|-----------------|
| A    | @    | <IP_VPS_NEO>    |
| A    | www  | <IP_VPS_NEO>    |

Tunggu propagasi (cek: `ping edulyfe.id`).

## 1. SSH & install dependency di VPS
```bash
ssh root@<IP_VPS_NEO>

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx

# PM2
sudo npm i -g pm2
```

## 2. Ambil kode & build
```bash
sudo mkdir -p /var/www && cd /var/www
git clone <URL_REPO_ANDA> lms-redesign
cd lms-redesign

# Backend deps
npm install --prefix server

# Frontend deps + build (hasil -> client/dist)
npm install --prefix client
npm run build --prefix client
```

## 3. Konfigurasi environment
```bash
cp .env.biznet.example server/.env
nano server/.env        # isi MONGO_URI (Atlas), JWT_SECRET, CLIENT_ORIGIN=https://edulyfe.id
```
> MongoDB Atlas: di **Network Access** tambahkan IP VPS NEO (atau 0.0.0.0/0 sementara), lalu
> ambil connection string dari **Connect > Drivers**.

## 4. Jalankan backend dengan PM2
```bash
cd /var/www/lms-redesign
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # jalankan perintah yang ditampilkan agar auto-start saat reboot
pm2 logs lms-api   # cek "API listening on http://localhost:4000"
```

## 5. Nginx
```bash
sudo cp deploy/nginx-edulyfe.conf /etc/nginx/sites-available/edulyfe
sudo ln -s /etc/nginx/sites-available/edulyfe /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
Sekarang http://edulyfe.id sudah hidup.

## 6. SSL HTTPS (gratis, Let's Encrypt)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d edulyfe.id -d www.edulyfe.id
```
Certbot otomatis menambah blok `listen 443 ssl` + redirect http→https, dan auto-renew.

## 7. Seed data awal (opsional, sekali saja)
```bash
npm run seed --prefix server
```

---

## Update aplikasi (deploy versi baru)
```bash
cd /var/www/lms-redesign
git pull
npm install --prefix server
npm install --prefix client && npm run build --prefix client
pm2 restart lms-api
```

## Catatan penting
- **Upload file persisten**: tersimpan di `server/uploads/` pada disk VPS (tidak hilang seperti di Vercel). Sertakan folder ini di backup berkala.
- `vercel.json` & `api/index.js` tidak dipakai di VPS — boleh dibiarkan.
- Firewall NEO: pastikan port **80** & **443** terbuka di panel Biznet.
- Cek error backend: `pm2 logs lms-api`. Cek Nginx: `sudo tail -f /var/log/nginx/error.log`.
