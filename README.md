# IronPath

**Dein Weg. Dein Eisen.**

Eine vollständige Fitness- und Ernährungs-App: Trainingspläne erstellen, Workouts
live tracken, Fortschritt auswerten, Ernährung dokumentieren und Ziele verfolgen.
Alle Daten werden persistent gespeichert und sind strikt pro Benutzerkonto isoliert.

---

## Schnellstart

```bash
npm install
cp .env.example .env      # Werte passen bereits zu docker compose
docker compose up -d      # PostgreSQL 16 auf Port 5432
npm run setup             # Prisma-Client, Migration und Seed-Daten
npm run dev               # http://localhost:3000
```

`npm run setup` legt das Schema an und füllt die Übungs- und
Lebensmitteldatenbank (55 Übungen, 85 Lebensmittel).

Danach registrieren, das Onboarding durchlaufen — die App legt automatisch einen
zu deiner Trainingsfrequenz passenden Startplan an — und loslegen.

Ohne Docker geht auch jede andere PostgreSQL-Instanz: einfach die
`DATABASE_URL` in `.env` darauf zeigen lassen.

---

## Deployment

> **Wichtig:** IronPath ist **keine statische Website**. Sie besteht aus 55
> API-Routen, einer PostgreSQL-Datenbank und serverseitigen Sessions. Auf
> **GitHub Pages läuft sie deshalb nicht** — GitHub Pages liefert ausschließlich
> statische Dateien aus und zeigt ohne `index.html` nur die README an.
> Es braucht einen Host, der Node.js ausführt.

Nötig sind zwei Dinge: ein Node-Host und eine PostgreSQL-Datenbank.

### Variante A — Vercel + Neon (kostenlos, empfohlen)

1. **Datenbank:** Auf [neon.tech](https://neon.tech) ein Projekt anlegen.
   Neon zeigt zwei Connection Strings — du brauchst **beide**:
   - den **gepoolten** (enthält `-pooler`) für die laufende App
   - den **direkten** (ohne `-pooler`) für die Migrationen
2. **Import:** Auf [vercel.com/new](https://vercel.com/new) dieses Repository
   importieren. Vercel erkennt Next.js automatisch — Build- und
   Output-Einstellungen nicht anfassen.
3. **Environment Variables** setzen (alle drei, für alle Environments):

   | Name           | Wert                                      |
   | -------------- | ----------------------------------------- |
   | `DATABASE_URL` | gepoolter Connection String (`-pooler`)   |
   | `DIRECT_URL`   | direkter Connection String                |
   | `AUTH_SECRET`  | Ausgabe von `openssl rand -base64 32`     |

4. **Deploy.** Das war's — der Build legt das Schema an und füllt die Übungs-
   und Lebensmitteldatenbank. Es ist kein weiterer Schritt nötig, und der
   gesamte Ablauf funktioniert im Browser, also auch vom Handy aus.

Warum zwei URLs? Migrationen nehmen Advisory Locks, die ein Pooler im
Transaction-Mode nicht unterstützt — mit nur der gepoolten URL bricht der
Build ab. Die laufende App wiederum braucht den Pooler, weil serverlose
Funktionen sonst die Verbindungen der Datenbank aufbrauchen.

### Variante B — eigener Server oder Container

```bash
docker compose up -d          # oder eine bestehende PostgreSQL-Instanz
npm ci
npm run build                 # generiert Client, migriert, baut
npm start                     # Port 3000
```

Davor einen Reverse Proxy mit HTTPS setzen — die Session-Cookies werden in
Produktion mit `secure` ausgeliefert und funktionieren nur über HTTPS.

### E-Mail-Bestätigung aktivieren (optional)

Ohne konfigurierten Versand ist ein neues Konto sofort nutzbar. Ist ein
Versandweg eingerichtet, muss stattdessen jede Registrierung mit einem
sechsstelligen Code aus der E-Mail bestätigt werden — und die Adresse in
`ADMIN_EMAIL` bekommt bei jeder neuen Anmeldung eine Benachrichtigung.

`EMAIL_FROM` wird immer gebraucht, dazu **einer** der beiden Wege.

#### Weg A — SMTP über ein vorhandenes Postfach

Erreicht **jede** Empfängeradresse, ohne eigene Domain. Versendet wird aus
deinem Postfach.

| Name | Wert |
| --- | --- |
| `EMAIL_FROM` | `IronPath <deine-adresse@gmail.com>` — muss zu `SMTP_USER` passen |
| `SMTP_HOST` | `smtp.gmail.com`, `mail.gmx.net`, `smtp.web.de`, … |
| `SMTP_PORT` | `587` (bei `465` wird implizites TLS genutzt) |
| `SMTP_USER` | deine vollständige E-Mail-Adresse |
| `SMTP_PASSWORD` | **App-Passwort**, nicht dein normales Passwort |
| `ADMIN_EMAIL` | wohin die Benachrichtigungen gehen |

Bei Gmail: Zwei-Faktor-Anmeldung aktivieren, dann unter *Google-Konto →
Sicherheit → App-Passwörter* eines erzeugen. GMX und Web.de verlangen, dass
POP3/IMAP in den Einstellungen freigeschaltet ist.

Grenzen: Gmail lässt rund 500 Mails pro Tag zu — für eine private App reichlich.
Der Empfänger sieht deine private Adresse als Absender.

#### Weg B — Resend über HTTP

Kein SMTP nötig, saubere Zustellraten, eigener Absender wie
`noreply@deine-domain.de`. Setzt aber eine Domain voraus.

| Name | Wert |
| --- | --- |
| `EMAIL_FROM` | `IronPath <noreply@deine-domain.de>` |
| `RESEND_API_KEY` | Key von [resend.com](https://resend.com/api-keys) (`re_…`) |
| `ADMIN_EMAIL` | wohin die Benachrichtigungen gehen |

> Resend verschickt nur von Domains, die dort verifiziert sind (unter *Domains*
> hinzufügen, zwei DNS-Einträge setzen). Ohne eigene Domain funktioniert
> `onboarding@resend.dev` als Absender — damit erreichst du allerdings **nur die
> Adresse deines eigenen Resend-Kontos**. Für fremde Empfänger brauchst du
> entweder eine Domain oder Weg A.

Sind beide Wege konfiguriert, gewinnt SMTP.

Nach dem Eintragen **Redeploy auslösen** — neue Variablen greifen erst im
nächsten Build — und danach `/api/status` prüfen: dort muss
`"verificationRequired": true` stehen.

Sicherheitseigenschaften des Codes: sechs Stellen aus `crypto.randomInt`, nur
als Hash gespeichert, 30 Minuten gültig, nach sechs Fehlversuchen gesperrt, und
ein neu angeforderter Code macht den alten sofort ungültig.

### Checkliste vor dem Livegang

- [ ] `AUTH_SECRET` ist ein langer Zufallswert, nicht der Beispielwert
- [ ] `DATABASE_URL` zeigt auf die Produktionsdatenbank
- [ ] Die App ist über HTTPS erreichbar
- [ ] Der erste Build lief durch (er legt Schema und Startdaten an)
- [ ] Falls E-Mail gewünscht: ein Versandweg konfiguriert und mit einer echten
      Registrierung an eine fremde Adresse getestet

---

## Technologie

| Bereich          | Wahl                                  | Warum                                                        |
| ---------------- | ------------------------------------- | ------------------------------------------------------------ |
| Framework        | Next.js 15 (App Router)               | Server Components, API-Routen und UI in einem Projekt         |
| Sprache          | TypeScript (strict)                   | Durchgehende Typsicherheit von der DB bis zur Komponente      |
| Datenbank        | Prisma + PostgreSQL                   | Gleiche Engine lokal wie in Produktion, keine Abweichungen    |
| Auth             | Eigene Sessions, scrypt (Node crypto)  | Keine externe Abhängigkeit, httpOnly-Cookies                  |
| Styling          | Tailwind CSS mit CSS-Variablen-Theme  | Dark/Light zur Laufzeit umschaltbar                           |
| Client-State     | TanStack Query                        | Caching und Invalidierung nach jeder Mutation                 |
| Validierung      | Zod (Client + Server)                 | Ein Schema, deutsche Fehlermeldungen                          |
| Diagramme        | Recharts                              | Responsive, themefähig                                        |

---

## Architektur

```
src/
├── app/
│   ├── (auth)/          Login, Registrierung, Passwort zurücksetzen
│   ├── (app)/           Authentifizierter Bereich (Layout mit Navigation)
│   ├── api/             REST-Endpunkte
│   └── onboarding/      Ersteinrichtung
├── components/
│   ├── ui/              Design-System (Button, Card, Modal, Charts …)
│   ├── layout/          Sidebar, Bottom-Navigation, TopBar, PageShell
│   └── <feature>/       workout, plans, nutrition, progress, goals, profile
├── server/              Nur serverseitig: db, auth, api-Helper, Domänenlogik
├── lib/                 Reine Funktionen: Einheiten, Trainingsmathematik, Utils
├── hooks/               useRestTimer, useMounted
└── types/               Geteilte DTOs zwischen API und Client
```

**Trennung der Ebenen:** `src/lib` enthält ausschließlich reine Funktionen ohne
I/O (1RM-Schätzung, PR-Erkennung, Progressive Overload, Makroberechnung,
Streaks) und ist deshalb auf Server und Client gleichermaßen nutzbar.
`src/server` kapselt alles, was die Datenbank berührt.

### Sicherheit

- Passwörter werden mit **scrypt** und pro Benutzer eigenem Salt gehasht.
- Sessions sind zufällige Tokens in einem **httpOnly**-Cookie; in der Datenbank
  liegt nur deren Hash. Nach einer Passwortänderung werden alle Sessions verworfen.
- **Jede** API-Route läuft durch `withUser()` und erhält den authentifizierten
  Benutzer als Argument — jede Abfrage ist auf dessen `userId` eingeschränkt.
  Fremde Datensätze liefern konsistent `404`, ohne ihre Existenz zu verraten.
- Login und „Passwort vergessen“ antworten unabhängig davon, ob das Konto
  existiert (keine Account-Enumeration).
- Alle Eingaben werden serverseitig mit Zod validiert; Nährwerte und Volumen
  werden serverseitig berechnet, nie vom Client übernommen.

---

## Funktionen

**Training**
Trainingspläne mit Tagen, Wochentagszuordnung, Übungsreihenfolge, Sätzen,
Wiederholungsbereichen, Zielgewicht, Pausenzeit und Notizen. Workout-Modus mit
sofortiger Speicherung jedes Satzes, Aufwärmsätzen, RIR/RPE, „Letztes Training“
und Progressive-Overload-Vorschlägen aus der eigenen Historie. Pausentimer auf
Basis absoluter Zeitstempel — er läuft im Hintergrund korrekt weiter und
übersteht den Wechsel zwischen Übungen. Automatische Rekorderkennung für
Höchstgewicht, beste Wiederholungszahl, geschätztes 1RM und Volumen.

**Ernährung**
Lebensmitteldatenbank mit Suche und Filtern, eigene Lebensmittel mit beliebiger
Portionsgröße, automatische Umrechnung jeder Menge, Standard- und eigene
Mahlzeiten, speicherbare Mahlzeitenvorlagen, Tagesübersicht mit Kalorienring und
Makrobalken.

**Fortschritt**
Körpergewicht, Körperfett und sechs Körpermaße, Fortschrittsfotos (im Browser
verkleinert), Diagramme für Gewicht, Volumen, Kraftentwicklung, Frequenz,
Kalorien und Protein über sechs Zeiträume, Statistikseite, Trainingskalender.

**Ziele & Motivation**
Ziele, deren aktueller Stand automatisch aus Training, Körperdaten und Ernährung
berechnet wird, Streak-System, Rekord- und Meilenstein-Benachrichtigungen,
konfigurierbare Erinnerungen.

**Konto**
Registrierung, Login, Passwort zurücksetzen und ändern, Profil mit Bild,
Einheiten (kg/lb, cm/in), Theme, Datenexport als JSON oder CSV, Kontolöschung.

---

## Deployment prüfen

`GET /api/status` beantwortet ohne Anmeldung, ob ein Deployment sauber
hochgekommen ist. Es liefert ausschließlich Wahrheitswerte und Zählstände,
niemals einen Key, eine Adresse oder Nutzerdaten:

```json
{
  "database": "ok",
  "seed": { "exercises": 55, "foods": 85, "complete": true },
  "email": { "configured": true, "provider": "smtp", "missing": [], "adminNotifications": true },
  "verificationRequired": true
}
```

- `seed.complete: false` → der Build hat die Startdaten nicht geladen
- `email.missing` → nennt die Variablen, die fehlen
- `email.provider` → `smtp` erreicht jede Adresse, `resend` erst mit verifizierter Domain
- `verificationRequired: false` → neue Konten sind sofort nutzbar

## Datenmodell

`User` → `Profile`, `Session`, `PasswordResetToken`

**Training:** `WorkoutPlan` → `WorkoutDay` → `PlanExercise` → `Exercise`
`WorkoutSession` → `SessionExercise` → `ExerciseSet`, `PersonalRecord`

**Ernährung:** `Food`, `Meal` → `MealItem`, `SavedMeal` → `SavedMealItem`

**Körper & Ziele:** `BodyMeasurement`, `ProgressPhoto`, `Goal`

**System:** `Notification`, `Reminder`

Zwei Besonderheiten:

- `Exercise` und `Food` mit `userId = null` bilden die geteilte Seed-Bibliothek;
  Einträge mit `userId` gehören ausschließlich diesem Konto.
- `MealItem` speichert die Nährwerte als Momentaufnahme. Wird ein Lebensmittel
  später bearbeitet oder gelöscht, bleibt die Historie korrekt.

Datumsangaben für Tagesabfragen (Ernährung, Messungen) werden als `YYYY-MM-DD`
im lokalen Kalender gespeichert, damit ein Tageswechsel nicht von der Zeitzone
des Servers abhängt.

---

## Einheiten

Intern wird ausschließlich metrisch gespeichert (kg, cm). Die Umrechnung nach
lb/in geschieht nur bei der Anzeige und Eingabe. Ein Wechsel der Einheiten
verändert daher keine gespeicherten Werte.

---

## Skripte

| Befehl               | Wirkung                                          |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Entwicklungsserver                               |
| `npm run build`      | Produktionsbuild inkl. Migration und Seed        |
| `npm start`          | Produktionsserver                                |
| `npm run setup`      | Client, Migration und Seed-Daten in einem Schritt |
| `npm run db:seed`    | Übungs- und Lebensmitteldatenbank neu befüllen   |
| `docker compose up -d` | Lokale PostgreSQL-Instanz starten              |
| `npm run typecheck`  | TypeScript prüfen                                |
| `npm run lint`       | ESLint                                           |

---

## Hinweis

IronPath ist ein Werkzeug zum Dokumentieren und Auswerten von Training und
Ernährung. Kalorien-, Makro- und Trainingsvorschläge sind allgemeine
Orientierungswerte und ersetzen keine medizinische oder diätetische Beratung.
