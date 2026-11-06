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

**Google Analytics (არასავალდებულო)** — `NEXT_PUBLIC_GA_MEASUREMENT_ID`-ს დაცლილს/კომენტარში
ტოვებთ, სანამ საიტს არ ექნება საკუთარი GA4 property. როცა გექნებათ Measurement ID
(`G-XXXXXXXXXX` ფორმატის), დაამატეთ `.env`-ში და გადააშენეთ (`docker compose build frontend &&
docker compose up -d`) — მეტი ცვლილება არ სჭირდება, კოდი უკვე მზადაა.

**`backend/.env`** — შეავსეთ `JWT_SECRET` (32+ სიმბოლო, შემთხვევითი),
`FRONTEND_ORIGIN=http://<VPS_IP>`, `BACKEND_PUBLIC_URL=http://<VPS_IP>`, `NODE_ENV=production`,
და დანარჩენი (SMTP, FINA, OAuth credentials და ა.შ.) რაც გაქტიურებული გინდათ ტესტირებისთვის —
დანარჩენი ცარიელი დატოვება უსაფრთხოა, შესაბამისი ფუნქცია უბრალოდ გამორთული დარჩება.
`DATABASE_URL`-ის დატოვება შეგიძლიათ default-ზე — docker-compose.yml ავტომატურად გადააწერს Docker
ქსელში სწორ მისამართზე.

`Caddyfile`-ის შეცვლა ამ ფაზაზე არ სჭირდება — `SITE_ADDRESS`-ის გარეშე ის `:80`-ზე, უბრალო
HTTP-ით მუშაობს, domain-ის გარეშე.

## 4. აწყობა და გაშვება

```bash
docker compose --profile tools build        # backend, frontend და migrate ერთად
docker compose up -d db
docker compose run --rm migrate
docker compose run --rm migrate npx prisma db seed
docker compose run --rm migrate npx tsx prisma/seed-brands.ts
docker compose run --rm migrate npx tsx prisma/seed-catalog.ts   # seed-brands-ის შემდეგ
docker compose up -d
```

`migrate` სერვისი ერთჯერადია — უშვებს `prisma migrate deploy`-ს ბაზაზე, სანამ backend/frontend
ამუშავდება. ყოველ ახალ deploy-ზე, თუ ახალი მიგრაცია დაემატა, იგივე ბრძანება ხელახლა გაუშვით
(იხ. „განახლება").

**seed-ების რიგი მნიშვნელოვანია:** `db seed` → `seed-brands` → `seed-catalog` → (მხოლოდ სატესტოდ)
`seed-products` → `seed-vehicles` → `seed-tags`.

`prisma db seed` (იგივე `migrate` კონტეინერით, command override-ით) ავსებს საბაზისო მონაცემებს —
როლები, ადმინის ანგარიში, კლასიფიკატორები (საწვავის ტიპები, ფერები, ზომები, ქალაქები,
თანამდებობები და ა.შ.), კატეგორიების ხე, მახასიათებლები, ერთეულები, პროდუქტის ბრენდები, homepage
სექციები. `upsert`-ზეა აწყობილი — ჩანაწერებს არ აორმაგებს, **მაგრამ ხელახლა გაშვებისას seed-ის
მნიშვნელობებს თავიდან წერს**: კატეგორიების სახელს, მშობელს და რიგს, ასევე ბრენდების
კატეგორიებთან კავშირებს. თუ ეს ადმინიდან შეცვალეთ, `db seed`-ის ხელახლა გაშვება ცვლილებას
დააბრუნებს — გაუშვით მხოლოდ მაშინ, როცა `prisma/seed.ts` შეიცვალა.

**ტექნიკის მარკები და მოდელები** (საქართველოში გავრცელებული 50 მარკა და მათი 3 320 მოდელი,
მოტოტექნიკის ქვეკატეგორიებზე — მოტოციკლები / მოპედები / კვადროციკლები; მონაცემები
`prisma/data/brands_models.csv`-შია) ცალკე seed-ია და არც დემოა — რეალური
საცნობარო მონაცემია. მის შემდეგ **ტექნიკის კატალოგი** (თითო მოდელზე ერთი ჩანაწერი: წლები,
სპეციფიკაციები, აღწერები სამ ენაზე; მონაცემები `prisma/data/vehicle_catalog.csv`-შია) ეშვება.
ორივე ზემოთ, საბაზისო ბრძანებებშია.

**დემო მონაცემები — მხოლოდ სატესტო სერვერზე, რეალურ საიტზე არასდროს.** დემო პროდუქტები და
ტრანსპორტის განცხადებები ტექნიკის კატალოგს იყენებს, ამიტომ `seed-brands`/`seed-catalog`-ის შემდეგ
უნდა გაეშვას:

```bash
docker compose run --rm migrate npx tsx prisma/seed-products.ts  # თავსებადობის დემოსთვის Yamaha MT-07
docker compose run --rm migrate npx tsx prisma/seed-vehicles.ts  # 16 დემო განცხადება კატალოგის ჩანაწერებზე
docker compose run --rm migrate npx tsx prisma/seed-tags.ts      # დემო ტეგები „ერთად შეძენისთვის" (seed-products-ის შემდეგ)
```

⚠️ **seed-ის ან ბაზის ხელით ცვლილების შემდეგ ქეში გაასუფთავეთ.** კატეგორიების ხე, მათი
რაოდენობები და ტექნიკის კატალოგის ფილტრები მუდმივად ქეშირდება და მხოლოდ ადმინიდან ცვლილებისას
ახლდება. seed (ან SQL) ადმინს გვერდს უვლის, ამიტომ: ადმინი → ზედა მარჯვენა კუთხის მენიუ →
**„ქეშის გასუფთავება“**. (`docker compose restart backend` საკმარისი არ არის — frontend-ის ქეშს
არ ასუფთავებს.)

ID-ებს ბაზა ავტოინკრემენტით ანიჭებს. თუ მარკების და მოდელების ცხრილები ცარიელია, მთვლელი 1-დან
იწყება და ჩანაწერები ფაილის რიგით ემატება. ხელახლა გაშვება უსაფრთხოა: უკვე არსებულ მარკას (იგივე
slug) და მოდელს (იგივე მარკა + slug) არ ეხება, ადმინში შეცვლილს არ გადააწერს — მხოლოდ აკლებულს ამატებს.

კატალოგის seed ფაილის brandId/modelId-ს ბაზის რეალურ id-ზე მარკის/მოდელის სახელით აბამს, ხოლო
საწვავის/გადაცემათა კოლოფის და სხვა ტიპებს — key-ით, ამიტომ ბაზაში id-ები სხვანაირადაც რომ იყოს
დანომრილი, სწორად ჩაჯდება. ხელახლა გაშვება უსაფრთხოა: არსებულ ჩანაწერს (იგივე მოდელი + ვარიანტი +
წლები) არ ეხება.

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

ძველი კონტეინერები მუშაობას აგრძელებს build-ის დროს — საიტი მხოლოდ ბოლო `up -d`-ზე
გადაირთვება. რიგი: **build → სარეზერვო ასლი → მიგრაცია → seed → up**.

```bash
git pull
docker compose --profile tools build                      # 1. backend, frontend და migrate

# 2. სარეზერვო ასლი — ყოველთვის მიგრაციამდე (იხ. „სარეზერვო ასლი“)
mkdir -p ~/backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > ~/backups/db-$(date +%F_%H%M).dump

# 3. მიგრაცია
docker compose run --rm migrate npx prisma migrate status # რომელი მიგრაციებია ახალი
docker compose run --rm migrate                           # migrate deploy

# 4. seed — მხოლოდ ის, რომლის ფაილიც შეიცვალა, ამ რიგით
docker compose run --rm migrate npx prisma db seed        # თუ prisma/seed.ts შეიცვალა
docker compose run --rm migrate npx tsx prisma/seed-brands.ts   # თუ brands_models.csv შეიცვალა
docker compose run --rm migrate npx tsx prisma/seed-catalog.ts  # თუ vehicle_catalog.csv შეიცვალა

# 5. გაშვება და შემოწმება
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend
```

seed-ის გაშვების შემდეგ ადმინში დააჭირეთ **„ქეშის გასუფთავებას“** (იხ. ზემოთ).

⚠️ **`--profile tools` აუცილებელია.** `migrate`-ს `docker-compose.yml`-ში აქვს
`profiles: ["tools"]`, ამიტომ უბრალო `docker compose build` მას გამოტოვებს (მხოლოდ
`backend`/`frontend` აშენდება) და `docker compose run --rm migrate` ძველ, ქეშირებულ image-ს
გამოიყენებს — ახალ მიგრაციებს ვერ დაინახავს.

### თუ მიგრაცია ჩავარდა

Prisma ჩავარდნილ მიგრაციას „failed“-ად ინიშნავს და შემდეგ deploy-ებს ბლოკავს, სანამ ეს ნიშნული
არ მოიხსნება. შეცდომის მიზეზი `docker compose run --rm migrate`-ის გამოტანაშივე ჩანს.
**ძველი კონტეინერები ამ დროს ისევ მუშაობს — `up -d` არ გაუშვათ.**

```bash
docker compose run --rm migrate npx prisma migrate status   # ჩავარდნილი მიგრაციის სახელი
```

- თუ მიზეზი გასწორდა (მაგ. კოდში შესწორდა და ახლიდან `git pull` + build) და მიგრაციას ბაზაში
  არაფერი დაუტოვებია — ნიშნული მოხსენით და თავიდან გაუშვით:
  ```bash
  docker compose run --rm migrate npx prisma migrate resolve --rolled-back <მიგრაციის_სახელი>
  docker compose run --rm migrate
  ```
- თუ ბაზა მაინც არეულია, ან არ ხართ დარწმუნებული — აღადგინეთ ნაბიჯი 2-ის ასლიდან
  (იხ. „აღდგენა“) და კოდი დააბრუნეთ წინა ვერსიაზე (`git checkout <წინა_commit>` + build).

**არასდროს** გაუშვათ `prisma migrate reset` ან `prisma migrate dev` სერვერზე — ორივე ბაზას შლის
ან ცვლის.

### ერთჯერადი ნაბიჯი: კონტეინერები root-ის გარეშე (2026-10-05)

backend, frontend და migrate კონტეინერები ახლა უპრივილეგიო `node` მომხმარებლით ეშვება და აღარ
იყენებს root-ს. ახალ სერვერზე არაფერია გასაკეთებელი. **არსებულ სერვერზე** კი `backend_uploads`
volume-ში არსებული ფაილები ჯერ კიდევ root-ის საკუთრებაშია და backend მათ ვერ შეცვლის. ამიტომ
ახალი build-ის შემდეგ, **`up -d`-მდე**, ერთხელ გაუშვით:

```bash
docker compose run --rm --user root --entrypoint "" backend chown -R node:node /app/uploads
```

თუ ამას გამოტოვებთ, სურათის ატვირთვა/წაშლა ადმინში `EACCES` შეცდომით ჩავარდება.

იგივე ბრძანება საჭიროა, თუ სერვერი 2026-10-06-მდე აიწყო და seed-მა `EACCES` შეცდომა აჩვენა —
მაშინ volume root-ის საკუთრებაში შეიქმნა. ამის შემდეგ აწყობილ ახალ სერვერებზე ეს აღარ ხდება.

## შეცდომების მონიტორინგი (Sentry) — არასავალდებულო

კოდი უკვე მზადაა. გასაღებების გარეშე Sentry უბრალოდ გამორთულია და საიტზე არაფერს ცვლის.

1. **sentry.io**-ზე შექმენით ორი პროექტი: `motostock-backend` (Node.js) და `motostock-frontend` (Next.js).
2. **backend/.env** — `SENTRY_DSN=` backend პროექტის DSN (Settings → Client Keys).
3. **.env** (repo-ს root) — `NEXT_PUBLIC_SENTRY_DSN=` frontend პროექტის DSN. სურვილისამებრ,
   წაკითხვადი stack trace-ებისთვის: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
   (Settings → Auth Tokens).
4. გადააშენეთ და გაუშვით:
   ```bash
   docker compose build frontend
   docker compose up -d
   ```
5. ადმინში: **პარამეტრები → მონიტორინგი** → ჩართეთ და დააჭირეთ „სატესტო შეცდომის გაგზავნა“.
   ორივე სტატუსი უნდა იყოს ✓, ხოლო სატესტო შეცდომა რამდენიმე წამში უნდა გამოჩნდეს Sentry-ში.

შეტყობინებები ელფოსტაზე მოდის თავად Sentry-დან, Sentry-ის ანგარიშის წევრებზე
(sentry.io → Alerts). ადმინის „შეცდომების ლოგი“ ელფოსტით არ იგზავნება.

## სარეზერვო ასლი

მონაცემები (`pgdata` volume) და ატვირთული სურათები (`backend_uploads` volume) გადარჩება
`docker compose down`-ის შემდეგაც — მხოლოდ `docker compose down -v` შლის მათ (**არასდროს** გაუშვათ
`-v`). volume კი დისკთან ერთად იკარგება, ამიტომ საჭიროა ასლი — ყოველი განახლების წინ და
პერიოდულად (მაგ. ყოველდღე cron-ით). ასლი სხვა მანქანაზეც გადაიტანეთ (`scp`), VPS-ზე
შენახული ასლი VPS-თან ერთად დაიკარგება.

```bash
mkdir -p ~/backups
cd ~/motostock   # repo-ს საქაღალდე

# ბაზა (custom ფორმატი, pg_restore-ისთვის)
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > ~/backups/db-$(date +%F_%H%M).dump

# ატვირთული სურათები
docker run --rm -v motostock_backend_uploads:/data:ro -v ~/backups:/b alpine \
  tar czf /b/uploads-$(date +%F_%H%M).tgz -C /data .
```

`-T` აუცილებელია — მის გარეშე Docker TTY-ს ამატებს და dump ფაილი ზიანდება. `$POSTGRES_USER`
ერთმაგ ბრჭყალებშია, რომ კონტეინერის შიგნით გაიშალოს (host-ის shell-ში ეს ცვლადი არ არსებობს).
volume-ის სახელი (`motostock_backend_uploads`) repo-ს საქაღალდის სახელზეა დამოკიდებული —
შეამოწმეთ `docker volume ls`-ით.

ასლის შემოწმება (ცარიელი ან დაზიანებული არ უნდა იყოს):

```bash
ls -lh ~/backups
docker compose exec -T db pg_restore --list < ~/backups/db-<თარიღი>.dump | head
```

### აღდგენა

```bash
docker compose stop backend frontend    # რომ აღდგენის დროს ბაზაში არავინ წეროს

docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < ~/backups/db-<თარიღი>.dump

# სურათები (საჭიროების შემთხვევაში)
docker run --rm -v motostock_backend_uploads:/data -v ~/backups:/b alpine \
  sh -c 'tar xzf /b/uploads-<თარიღი>.tgz -C /data && chown -R 1000:1000 /data'

docker compose up -d
```

აღდგენის შემდეგ ადმინში დააჭირეთ **„ქეშის გასუფთავებას“**.

## რეალურ დომენზე გადასვლა (HTTPS)

საიტი ერთ დომენზე იმუშავებს: **`motostock22.ge`**, API — **`motostock22.ge/api`** (ისევე, როგორც
სატესტო ფაზაში IP-ზე). ბაზას, სურათებს და SMTP/OAuth credentials-ს არაფერი ეხება. Caddy SSL
სერტიფიკატს Let's Encrypt-იდან **თავად** იღებს და ანახლებს, HTTP-ს კი HTTPS-ზე გადაამისამართებს.

1. **DNS** — A ჩანაწერი `motostock22.ge` → VPS-ის IP. (სურვილისამებრ `www.motostock22.ge`-იც —
   იხ. ნაბიჯი 4.) დაელოდეთ, სანამ ამუშავდება: `ping motostock22.ge` VPS-ის IP-ს უნდა აჩვენებდეს.
   VPS-ზე 80 და 443 პორტი ღია უნდა იყოს (firewall).

2. **`.env`** (root):
   ```
   SITE_ADDRESS=motostock22.ge
   HSTS_MAX_AGE=300
   NEXT_PUBLIC_API_URL=https://motostock22.ge/api
   NEXT_PUBLIC_SITE_URL=https://motostock22.ge
   NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
   ```

3. **`backend/.env`**:
   ```
   FRONTEND_ORIGIN=https://motostock22.ge
   BACKEND_PUBLIC_URL=https://motostock22.ge
   ```
   `BACKEND_PUBLIC_URL`-ის `https://`-ზე გადასვლა ავტომატურად რთავს `Secure` cookie-ებს და CSP-ის
   `upgrade-insecure-requests`-ს — კოდში ცვლილება არ სჭირდება.

4. **(არასავალდებულო) www** — თუ `www.motostock22.ge`-ის DNS ჩანაწერიც დაამატეთ, `Caddyfile`-ის
   ბოლოში ამოაკომენტარეთ www ბლოკი (www → `motostock22.ge`-ზე გადამისამართება) და `backend/.env`-ში
   დაამატეთ `FRONTEND_ORIGIN_ALTERNATES=https://www.motostock22.ge`.

5. **გადააშენეთ და გაუშვით** (frontend-ს ხელახლა აწყობა სჭირდება — `NEXT_PUBLIC_*` ბილდის დროს
   იკერება):
   ```bash
   docker compose build
   docker compose up -d
   docker compose logs -f caddy    # "certificate obtained successfully" უნდა გამოჩნდეს
   ```
   შეამოწმეთ: `https://motostock22.ge` იხსნება ბოქლომით, ხოლო `http://motostock22.ge`
   ავტომატურად `https://`-ზე გადადის.

6. **OAuth** — Google/Facebook Developer Console-ში redirect URI განაახლეთ:
   `https://motostock22.ge/api/auth/google/callback` და `.../facebook/callback`.

7. **HSTS ეტაპობრივად** — `.env`-ში `HSTS_MAX_AGE` გაზარდეთ, ყოველ ჯერზე `docker compose up -d caddy`:
   - დასაწყისი: `300` (5 წუთი) — რამდენიმე დღე, სანამ დარწმუნდებით, რომ HTTPS სტაბილურად მუშაობს;
   - შემდეგ `604800` (1 კვირა);
   - საბოლოოდ `31536000` (1 წელი).

   ⚠️ HSTS-ის „უკან დაბრუნება" რთულია: გრძელი მნიშვნელობის შემდეგ HTTPS თუ გაფუჭდა, მომხმარებლები
   საიტზე ვერ შევლენ ვადის ამოწურვამდე. ამიტომ — ეტაპობრივად, და `includeSubDomains`-ის გარეშე.
