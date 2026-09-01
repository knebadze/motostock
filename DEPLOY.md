# გაშვება Contabo VPS-ზე (Docker)

ივარაუდება: Ubuntu 24.04, root ან sudo წვდომა. **სატესტო ფაზა — domain ჯერ არ არის**, საიტი
წვდომადია პირდაპირ VPS-ის IP-ზე plain HTTP-ით (`http://<VPS_IP>/`). `Caddyfile` ერთ პორტზეა
(`:80`) აწყობილი და path-ის მიხედვით მიმართავს `/api/*` და `/uploads/*` backend-ისკენ, დანარჩენს
frontend-ისკენ — ასე რომ testerს ერთი მისამართის მეტი არაფერი სჭირდება. დომენის გამოჩენის შემდეგ
რაც უნდა შეიცვალოს, იხ. ბოლოში „რეალურ დომენზე გადასვლა".

## 1. Docker-ის დაყენება (ერთხელ)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# საჭიროა ხელახლა login, რომ ჯგუფის ცვლილება ამოქმედდეს
```

## 2. კოდის ატვირთვა

```bash
git clone <your-repo-url> motostock
cd motostock
```

## 3. Env ფაილები

```bash
cp .env.example .env                  # docker-compose-ის ცვლადები
cp backend/.env.example backend/.env  # backend-ის ცვლადები
```

(`frontend/.env.local.example` docker-ის აწყობისას არ გამოიყენება — `NEXT_PUBLIC_*` ცვლადები
`docker-compose.yml`-ის build args-იდან მოდის, `.env`-ის (root) მეშვეობით.)

**`.env`** (root) — `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` შეავსეთ ძლიერი პაროლით.
`NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SITE_URL`-ში ჩასვით VPS-ის რეალური IP:

```
NEXT_PUBLIC_API_URL=http://<VPS_IP>/api
NEXT_PUBLIC_SITE_URL=http://<VPS_IP>
```

**`backend/.env`** — შეავსეთ `JWT_SECRET` (32+ სიმბოლო, შემთხვევითი),
`FRONTEND_ORIGIN=http://<VPS_IP>`, `BACKEND_PUBLIC_URL=http://<VPS_IP>`, `NODE_ENV=production`,
და დანარჩენი (SMTP, FINA, OAuth credentials და ა.შ.) რაც გაქტიურებული გინდათ ტესტირებისთვის —
დანარჩენი ცარიელი დატოვება უსაფრთხოა, შესაბამისი ფუნქცია უბრალოდ გამორთული დარჩება.
`DATABASE_URL`-ის დატოვება შეგიძლიათ default-ზე — docker-compose.yml ავტომატურად გადააწერს Docker
ქსელში სწორ მისამართზე.

`Caddyfile`-ის შეცვლა ამ ფაზაზე არ სჭირდება — `:80`-ზეა უკვე მორგებული, domain-ის გარეშე.

## 4. აწყობა და გაშვება

```bash
docker compose build
docker compose up -d db
docker compose run --rm migrate
docker compose run --rm migrate npx prisma db seed
docker compose up -d
```

`migrate` სერვისი ერთჯერადია — უშვებს `prisma migrate deploy`-ს ბაზაზე, სანამ backend/frontend
ამუშავდება. ყოველ ახალ deploy-ზე, თუ ახალი მიგრაცია დაემატა, იგივე ბრძანება ხელახლა გაუშვით.

`prisma db seed` (იგივე `migrate` კონტეინერით, command override-ით) ავსებს საბაზისო მონაცემებს —
როლები, ადმინის ანგარიში, კლასიფიკატორები (საწვავის ტიპები, ფერები, ზომები, ქალაქები,
თანამდებობები და ა.შ.), კატეგორიების ხე, მახასიათებლები, ერთეულები, homepage სექციები. Idempotent
არის (`upsert`-ზეა აწყობილი) — ხელახლა გაშვება უსაფრთხოა. **დემო პროდუქტები/ტრანსპორტი ცალკეა და
ამ ბრძანებაში არ შედის** — თუ საჭიროა სატესტოდ, ცალკე გაუშვით:

```bash
docker compose run --rm migrate npx tsx prisma/seed-products.ts
docker compose run --rm migrate npx tsx prisma/seed-vehicles.ts
```

⚠️ **ადმინის ანგარიშის default პაროლი** (`admin@gmail.com` / `admin123`, იხ. `prisma/seed.ts`)
საჯარო/ცნობილია — პირველივე შესვლისთანავე აუცილებლად შეცვალეთ ადმინის პანელიდან
(ანგარიშის პარამეტრები → პაროლის შეცვლა).

## 5. შემოწმება

```bash
docker compose ps
docker compose logs -f backend
```

საიტი ხელმისაწვდომი უნდა იყოს `http://<VPS_IP>/`-ზე — დამკვეთს ეს ერთი ბმული უნდა გაუზიაროთ
ტესტირებისთვის.

## განახლება (ახალი კოდის deploy)

```bash
git pull
docker compose build
docker compose run --rm migrate                          # თუ ახალი მიგრაცია დაემატა
docker compose run --rm migrate npx prisma db seed        # თუ prisma/seed.ts შეიცვალა
docker compose up -d
```

## სარეზერვო ასლი

მონაცემები (`pgdata` volume) და ატვირთული სურათები (`backend_uploads` volume) გადარჩება
`docker compose down`-ის შემდეგაც — მხოლოდ `docker compose down -v` შლის მათ. მაინც რეკომენდებულია
პერიოდული ბაზის dump:

```bash
docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup-$(date +%F).sql
```

## რეალურ დომენზე გადასვლა

როცა დომენი მზად იქნება, ეს სამი ცვლილებაა საჭირო — ბაზას, ატვირთულ სურათებს თუ SMTP/OAuth
credentials-ს არაფერი ეხება:

1. **DNS** — ორი A ჩანაწერი, ორივე VPS-ის IP-ზე: `example.com` (+ სურვილისამებრ `www.example.com`)
   და `api.example.com`. Caddy-ს ცალკე სჭირდება — ავტომატური SSL სერტიფიკატიც ცალკე გაიცემა
   თითოეულისთვის.

2. **`Caddyfile`** — შეცვალეთ `:80` ბლოკი ორი დომენ-ბლოკით:

   ```
   example.com, www.example.com {
       reverse_proxy frontend:3000
   }

   api.example.com {
       reverse_proxy backend:4000
   }
   ```

3. **`.env` და `backend/.env`** — `<VPS_IP>` შეცვალეთ რეალური დომენებით:

   ```
   NEXT_PUBLIC_API_URL=https://api.example.com/api
   NEXT_PUBLIC_SITE_URL=https://example.com
   ```
   ```
   FRONTEND_ORIGIN=https://example.com
   FRONTEND_ORIGIN_ALTERNATES=https://www.example.com
   BACKEND_PUBLIC_URL=https://api.example.com
   ```

   `FRONTEND_ORIGIN_ALTERNATES` საჭიროა მხოლოდ თუ Caddyfile-ში `www.example.com`-საც
   უშვებთ (ნაბიჯი 2-ში) — ბრაუზერისთვის `example.com` და `www.example.com` სხვადასხვა
   origin-ია, ასე რომ CORS-მა ორივე ცალკე უნდა იცოდეს დაშვებულად. თუ მხოლოდ apex
   დომენს იყენებთ, ცარიელი დატოვეთ.

შემდეგ: `docker compose build && docker compose up -d` (frontend-ს ხელახლა აწყობა სჭირდება, რადგან
`NEXT_PUBLIC_*` ბილდის დროს იკერება ბანდლში). Google/Facebook OAuth-ს იყენებთ თუ არა — redirect
URI-ც განაახლეთ შესაბამის Developer Console-ში ახალ `BACKEND_PUBLIC_URL`-ზე.
