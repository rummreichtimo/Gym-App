# IronPath

**Dein Weg. Dein Eisen.**

Eine vollständige Fitness- und Ernährungs-App: Trainingspläne erstellen, Workouts
live tracken, Fortschritt auswerten, Ernährung dokumentieren und Ziele verfolgen.
Alle Daten werden persistent gespeichert und sind strikt pro Benutzerkonto isoliert.

---

## Schnellstart

```bash
npm install
cp .env.example .env      # DATABASE_URL und AUTH_SECRET anpassen
npm run setup             # Prisma-Client, Migration und Seed-Daten
npm run dev               # http://localhost:3000
```

`npm run setup` erstellt die SQLite-Datenbank, legt das Schema an und füllt die
Übungs- und Lebensmitteldatenbank (55 Übungen, 85 Lebensmittel).

Danach registrieren, das Onboarding durchlaufen — die App legt automatisch einen
zu deiner Trainingsfrequenz passenden Startplan an — und loslegen.

### Produktion

```bash
npm run build
npm start
```

**Vor dem Deployment:** `AUTH_SECRET` auf einen langen Zufallswert setzen. Für
PostgreSQL statt SQLite in `prisma/schema.prisma` den `provider` auf
`postgresql` ändern und `DATABASE_URL` entsprechend setzen — das Schema ist
provider-neutral.

---

## Technologie

| Bereich          | Wahl                                  | Warum                                                        |
| ---------------- | ------------------------------------- | ------------------------------------------------------------ |
| Framework        | Next.js 15 (App Router)               | Server Components, API-Routen und UI in einem Projekt         |
| Sprache          | TypeScript (strict)                   | Durchgehende Typsicherheit von der DB bis zur Komponente      |
| Datenbank        | Prisma + SQLite                       | Zero-Config lokal, ohne Codeänderung auf PostgreSQL wechselbar |
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
| `npm run build`      | Produktionsbuild inkl. Migration                 |
| `npm start`          | Produktionsserver                                |
| `npm run setup`      | Client, Migration und Seed-Daten in einem Schritt |
| `npm run db:seed`    | Übungs- und Lebensmitteldatenbank neu befüllen   |
| `npm run typecheck`  | TypeScript prüfen                                |
| `npm run lint`       | ESLint                                           |

---

## Hinweis

IronPath ist ein Werkzeug zum Dokumentieren und Auswerten von Training und
Ernährung. Kalorien-, Makro- und Trainingsvorschläge sind allgemeine
Orientierungswerte und ersetzen keine medizinische oder diätetische Beratung.
