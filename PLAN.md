# Auto-Captions — Plan de développement

Éditeur de sous-titres automatiques **en local** (Next.js) : transcrit une vidéo,
laisse éditer/styliser les sous-titres, exporte via **Remotion Lambda**.

**Contrainte :** code repris par l'équipe Shortfy → modulaire, typé (TS strict),
testé, sans hack. Chaque phase finit par : **ça build, les tests passent, c'est commité.**

**Légende de statut :** ✅ fait · 🚧 en cours · ⬜ à faire

---

## 0. Sécurité & secrets (à respecter en permanence)

- La clé OpenAI et les credentials AWS vivent **uniquement** dans `.env.local`
  (jamais commités, jamais dans un composant client `"use client"`, jamais
  préfixés `NEXT_PUBLIC_`, jamais collés dans un chat/Discord).
- `.env*` est dans `.gitignore` ; `.env.example` (valeurs vides) est commité. ✅
- **Toute clé passée en clair dans une messagerie est compromise → la révoquer
  et en régénérer une** (platform.openai.com → API keys → Revoke), puis mettre
  un usage limit (~20 $/mois).
- Une clé API est opaque : elle n'identifie pas son propriétaire. Seul le
  dashboard OpenAI (connecté) indique le compte/projet propriétaire.
- **Licence police :** `MochicaPERSONALUSE.otf` = usage perso uniquement.
  Licence commerciale à acheter avant la prod → à remonter à Shortfy.

---

## 1. Périmètre

**Flow :** drag & drop vidéo → extraction audio + transcription OpenAI
(timestamps par mot) → éditeur (preview live, édition des mots, template, style,
position Y) → export Remotion Lambda → MP4 téléchargeable.

**Hors scope v1 :** auth, base de données, comptes, multi-langue UI, historique,
traduction, montage vidéo.

**Critères non négociables :**
- Preview éditeur **pixel-identique** au MP4 exporté.
- App **parfaite sur mobile** (priorité n°1), excellente sur desktop.
- Mots synchronisés avec précision (voir §6).
- 5 templates propres, pro, épurés.
- Tests unitaires + build + E2E Chrome (desktop + mobile) qui passent.

---

## 2. Stack (versions **figées**, pas de `^` — Remotion casse entre minors)

| Rôle | Techno |
|---|---|
| Framework | Next.js 15 (App Router, TS strict + `noUncheckedIndexedAccess`) |
| Style | Tailwind CSS v4 + shadcn/ui |
| Rendu vidéo | Remotion 4.0.503 (`@remotion/player`, `@remotion/captions`, `@remotion/fonts`, `@remotion/media-utils`, `@remotion/lambda`, `@remotion/cli`) |
| Export | Remotion Lambda (AWS) |
| Transcription | OpenAI `whisper-1` (`verbose_json` + `timestamp_granularities: ["word"]`) |
| Audio | ffmpeg serveur (`fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg`) |
| Stockage | S3 (upload direct via URL présignée) |
| State | Zustand (`useEditorStore`) |
| Drag | Pointer Events natifs (pas de lib, pas de `mousedown`) |
| Tests unit / E2E | Vitest / Playwright (Chromium desktop + iPhone 14 forcé Chromium) |

---

## 3. Architecture — la règle d'or

Le composant Remotion `<Captions />` reçoit **exactement le même**
`CaptionRenderProps` dans le `<Player>` (preview) et dans le render Lambda.
**Une seule source de vérité, un seul type** → garantit preview = export.

```
NAVIGATEUR : upload → blob URL (preview instantanée) + PUT présigné → S3
             <Player> Remotion ⟵ mêmes props ⟶ éditeur (mots, style, position)
/api/transcribe : ffmpeg → mp3 → OpenAI → Word[]
/api/render     : renderMediaOnLambda({ inputProps: MÊMES PROPS }) → MP4 S3 signé
```

---

## 4. Structure de fichiers (état réel + cible)

```
auto-captions/
├── .env.local                     # secrets, jamais commité                 ✅
├── .env.example                   # committé, valeurs vides                  ✅
├── PLAN.md                        # ce document                             ✅
├── remotion.config.ts             # config studio/render                     ⬜
├── src/
│   ├── app/
│   │   ├── page.tsx               # écran upload                             ✅
│   │   ├── editor/page.tsx        # éditeur                                  ⬜
│   │   └── api/
│   │       ├── upload-url/route.ts    # URL S3 présignée                     ✅
│   │       ├── transcribe/route.ts    # ffmpeg + OpenAI                      ⬜
│   │       ├── render/route.ts        # lance le render Lambda               ⬜
│   │       └── render/[id]/route.ts   # progression                         ⬜
│   ├── remotion/
│   │   ├── index.ts               # registerRoot                            ⬜
│   │   ├── Root.tsx               # <Composition id="Captions" />           ⬜
│   │   ├── CaptionsComposition.tsx                                          ⬜
│   │   ├── fonts.ts               # chargement des 7 polices                 ⬜
│   │   ├── templates/             # index (registry) + 5 templates           ⬜
│   │   └── animations.ts          # fade / pop / rise / blur / none          ⬜
│   ├── components/
│   │   ├── Dropzone.tsx                                                     ✅
│   │   ├── PlayerStage.tsx        # <Player> + overlay drag Y               ⬜
│   │   ├── WordRail.tsx           # ⭐ timeline de mots                      ⬜
│   │   ├── WordEditor.tsx / StylePanel.tsx / TemplatePicker.tsx            ⬜
│   │   ├── ExportDialog.tsx                                                 ⬜
│   │   └── ui/                    # shadcn (9 composants)                    ✅
│   ├── lib/
│   │   ├── types.ts               # ⭐ source de vérité (§5)                 ✅
│   │   ├── timing.ts              # ms ↔ frames, snapping (pur, testé)       ✅
│   │   ├── captions.ts            # mots → pages, mot actif (pur, testé)     ✅
│   │   ├── editor-actions.ts      # delete/split/merge/edit (pur, testé)     ✅
│   │   ├── upload.ts              # validation vidéo (pur, testé)            ✅
│   │   ├── upload-client.ts       # présign + PUT S3 (testé)                 ✅
│   │   ├── s3.ts                  # config S3 server-only (testé)            ✅
│   │   └── openai.ts              # mapping réponse Whisper → Word[]         ⬜
│   └── store/useEditorStore.ts                                             ✅
├── public/fonts/                  # 7 polices (staticFile)                   ⬜
└── e2e/                           # playwright + fixtures                    ✅
```

---

## 5. Types partagés — `src/lib/types.ts` (✅ écrit)

Source de vérité unique. Règles :
- **Millisecondes entières partout**, jamais de secondes float (conversion en
  frames au dernier moment, `lib/timing.ts`).
- `fontSize` en **% de la largeur** → responsive par construction.
- `positionY` normalisé **0–1** → indépendant de la résolution.

Types clés : `Word` (id nanoid, text, startMs, endMs, confidence),
`TemplateId` (`minimal|karaoke|punch|handwritten|editorial`), `FontId` (7),
`AnimationId` (`none|fade|pop|rise|blur`), `CaptionStyle` (11 champs),
`CaptionRenderProps` (`videoSrc, words, style, offsetMs`), `CaptionPage`.

---

## 6. Précision des timestamps (réaliste)

- Whisper : précision réelle ~20–50 ms (limite du modèle, pas du code).
- Rendu quantifié par la frame (30 fps ≈ 33 ms).
- On rend à la **fps source** (via `calculateMetadata`), 30 fps mini.
- Conversion `Math.round(ms/1000*fps)` — **jamais `Math.floor`** (piège n°5). ✅
- Slider de sync global `offsetMs` (±500, pas 10 ms) + édition start/end par mot
  au pas de 10 ms dans le WordRail.
- Tests obligatoires (✅) : `msToFrame(1000,30)=30`, `msToFrame(1016,60)=61`,
  `msToFrame(0,30)=0`, négatifs sans biais.

---

## 7. Direction visuelle (outil de montage, pas dashboard)

Sombre, dense, calme, un seul élément fort. Tokens (dans `globals.css`, ✅) :

| Token | Valeur | Utilitaire Tailwind |
|---|---|---|
| bg | `#0A0A0B` | `bg-bg` |
| panel | `#141416` | `bg-panel` |
| line | `#242428` | `border-line` |
| ink | `#EDEDEF` | `text-ink` |
| ink-dim | `#7A7A82` | `text-ink-dim` |
| brand | `#2F5BFF` | `text-brand` / `bg-brand` / `ring-brand` |
| sand | `#E8DFD0` | `text-sand` |

Typo UI : Inter Tight / Satoshi, **tous les nombres/timecodes en mono** (Geist
Mono). Rayons 8px panneaux / 4px puces. Pas de gradient/glow/glassmorphism. Une
seule couleur d'accent. Motion 150 ms `ease-out` (250 ms sheets),
`prefers-reduced-motion` respecté. Focus visible partout (`ring-2 ring-brand`).

**⭐ Signature : `WordRail`** — bande de puces dont la largeur ∝ durée réelle du
mot ; on voit le rythme ; tap = seek, double-tap = édition, drag bord = timing.

---

## 8. Les 5 templates

Même `CaptionStyle` pour tous ; le template définit défauts + structure, pas des
valeurs en dur. Ajouter un 6e = un fichier + une ligne dans le registry.

| id | Police défaut | Look | Anim | Mots/ligne |
|---|---|---|---|---|
| `minimal` | Poppins | blanc, ombre douce, mot actif 100 %/autres 60 % | fade | 4 |
| `karaoke` | Roboto | pastille `highlightColor` derrière le mot actif | pop | 4 |
| `punch` | KomikaAxis | majuscules, contour noir épais, scale spring | pop | 2 |
| `handwritten` | BananaStick | ton chaud, rotation −2°, apparition mot à mot | rise | 3 |
| `editorial` | TT Norms Serif | casse normale, letter-spacing, ligne basse | blur | 5 |

`HelvChildren` et `Mochica` dispo dans le sélecteur (7 polices), défaut d'aucun.

---

## 9. Polices (bug n°1 : polices absentes sur l'export)

- **Ne pas charger depuis un CDN** dans le composant Remotion (CORS/cold start
  Lambda → police manquante sans erreur visible).
- Télécharger les 7 fichiers dans `public/fonts/`, charger via `staticFile()`.
- Envelopper le chargement avec `delayRender()` / `continueRender()` /
  `cancelRender()`, sinon la 1re seconde sort en police système.
- Charger aussi en CSS `@font-face` côté Next pour que le `<Player>` les ait
  (sinon preview ≠ export).

---

## 10. Phases

| # | Phase | Statut | Sortie |
|---|---|---|---|
| 0 | Setup (Next, Tailwind, shadcn, Remotion, Vitest, Playwright, tokens, env) | ✅ | build + test + e2e verts |
| 1 | Types + logique pure (`timing`, `captions`, `editor-actions`) | ✅ | 75 tests, >80 % couv. `src/lib` |
| 2 | Upload + S3 (Dropzone, validation, preview blob, présign) | ✅ | dépôt → preview <1 s ; upload S3 (dès AWS configuré) |
| 3 | Transcription (`/api/transcribe`) | 🚧 | vidéo 60 s → `Word[]` FR propre <20 s |
| 4 | Composition Remotion + 5 templates + polices | ⬜ | 5 MP4 locaux, captures validées |
| 5 | Éditeur (PlayerStage drag Y, WordRail, édition, StylePanel, undo/redo) | ⬜ | tout au doigt sur iPhone sans accroc |
| 6 | Export Lambda (`/api/render` + polling) — voir §13 | 🚧 | Mécanique + UI faites, **mocké sans AWS** ; render réel = brancher credentials + §13 |
| 7 | Tests & durcissement (scénarios E2E, comparaison preview/export) | ✅ | 28 E2E desktop+mobile, 0 erreur console ; cas manuels §11 + comparaison pixel réelle = à faire avec AWS |

### Phase 3 — Transcription (détail, prochaine étape)
`/api/transcribe` (runtime `nodejs`, `maxDuration` relevé) :
1. ffmpeg : vidéo → **mp3 mono 16 kHz 64 kbps** (whisper-1 plafonne à 25 Mo,
   piège n°6 : envoyer le mp3, pas la vidéo).
2. OpenAI : `model:'whisper-1'`, `response_format:'verbose_json'`,
   `timestamp_granularities:['word']`. ⚠️ `gpt-4o-transcribe` **ne supporte pas**
   les timestamps par mot. `verbose_json` obligatoire sinon granularités ignorées
   (piège n°7).
3. Map `words[].start/end` (s float) → `Math.round(s*1000)` ms + `id` nanoid.
4. Nettoyer : trim, virer mots vides, `endMs >= startMs + 40`.
- États : `uploading → transcribing → ready`, messages explicites.
- Erreurs : pas d'audio, silence (0 mot → écran vide clair), timeout, quota,
  fichier corrompu.
- **Test :** fixture JSON Whisper réelle dans `e2e/fixtures/` → mapping `Word[]`.

---

## 11. Tests

- **Unitaires (Vitest)** : toute la logique `src/lib/`. Objectif >80 % couv.
  (actuel ✅ 94 % stmts / 100 % lignes). On ne teste pas les composants Remotion
  en unitaire (test visuel).
- **Build** : `npx tsc --noEmit && npm run lint && npm run build` — 0 erreur,
  0 warning.
- **E2E (Playwright, Chromium desktop + iPhone 14)** — 10 scénarios cibles :
  upload→transcription mockée, suppression mot, changement template, style,
  drag position (snap centre), undo, sheet mobile sans recouvrir le player,
  export mocké, fichier invalide, vidéo sans audio.
  **Règle : aucune erreur/warning console sur aucun parcours** (`page.on('console')`
  fait échouer).
- **Vérification croisée preview/export** : pour chaque template, comparer la
  frame 90 de la preview et du MP4. Un pixel de typo qui diffère = bug de police.

---

## 12. Variables d'environnement — `.env.local` (noms uniquement, jamais de valeur ici)

```
OPENAI_API_KEY=                     # nouvelle clé après révocation
REMOTION_AWS_ACCESS_KEY_ID=
REMOTION_AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-central-1
REMOTION_FUNCTION_NAME=remotion-render-4-x-mem2048mb-disk2048mb-120sec
REMOTION_SERVE_URL=https://remotionlambda-....s3.../index.html
S3_UPLOAD_BUCKET=auto-captions-uploads-dev
```
`.env.example` contient les mêmes clés vides et est commité.

---

## 13. Runbook Remotion Lambda (Phase 6 — mode fonction)

> **Pré-requis :** Phase 4 faite (`src/remotion/index.ts` avec la composition
> `Captions`). On ne déploie pas un site vide. Nécessite un compte AWS + des
> credentials valides dans `.env.local`. À exécuter par le·la propriétaire du
> compte AWS.

**1. IAM (une fois)**
```bash
npx remotion lambda policies user      # → coller dans un user IAM
npx remotion lambda policies role      # → créer le role remotion-lambda-role
```

**2. Déployer la fonction**
```bash
npx remotion lambda functions deploy --memory=3008 --disk=2048 --timeout=300
npx remotion lambda functions ls       # → note REMOTION_FUNCTION_NAME
```

**3. Déployer le site (bundle de la composition)**  — script npm `deploy:site` :
```bash
npm run deploy:site
# = npx remotion lambda sites create src/remotion/index.ts --site-name=auto-captions
npx remotion lambda sites ls           # → note REMOTION_SERVE_URL
```
> ⚠️ Piège n°8 : **redéployer le site à CHAQUE modif d'un composant Remotion**,
> le bundle Lambda est figé.

**4. Vérifier en CLI AVANT d'écrire la moindre API route**
```bash
npx remotion lambda render <serve-url> Captions out.mp4 --props=props.json
#                          <serve-url> [<composition-id>] [<output-location>]
```
Si le CLI ne passe pas, le problème est **AWS**, pas le code.

**5. Dans l'app** — `/api/render` :
```ts
renderMediaOnLambda({
  region, functionName, serveUrl,
  composition: 'Captions',
  inputProps,              // = MÊMES props que le <Player>
  codec: 'h264', imageFormat: 'jpeg', privacy: 'public',
})
```
- `inputProps.videoSrc` = **URL S3 https**, jamais le `blob:` local (piège n°3).
- `/api/render/[id]` → `getRenderProgress`, polling ~1,5 s.
- UI : % réel, temps restant, bouton Annuler, lien de téléchargement.
- Erreurs : timeout Lambda, mémoire insuffisante, serve URL invalide,
  credentials expirés, vidéo S3 inaccessible.

---

## 14. Pièges connus (à lire avant de débugger 3 h)

1. Polices absentes sur les 1res frames → `delayRender` manquant (§9).
2. Preview ≠ export → props Lambda ≠ props `<Player>`. Un seul objet, un type.
3. `videoSrc` en `blob:` envoyé à Lambda → utiliser l'URL S3.
4. Drag KO sur mobile → `onMouseDown` utilisé ; utiliser Pointer Events + `touch-action:none`.
5. Décalage constant → `Math.floor` au lieu de `Math.round` (`msToFrame`).
6. 413 / 25 Mo OpenAI → on envoie la vidéo au lieu du mp3.
7. `timestamp_granularities` ignoré → il faut `response_format:'verbose_json'`.
8. Modif Remotion invisible à l'export → redéployer le site.
9. Index comme key React → les mots sautent ; toujours `word.id`.
10. Player qui rame (800 mots) → `useMemo` sur le groupement, rendre la page courante.
11. CORS S3 → configurer le bucket (`PUT`, `GET`, origin `http://localhost:3000`) avant de suspecter le code.
12. Lambda timeout 120 s → redéployer `--timeout=300 --memory=3008`.

---

## 15. Definition of Done

- [ ] `tsc --noEmit`, `lint`, `build` : 0 erreur, 0 warning
- [ ] Tests unitaires verts, >80 % sur `src/lib`
- [ ] 10 scénarios Playwright verts sur Chromium desktop **et** iPhone 14
- [ ] 0 erreur console sur tous les parcours
- [ ] 5 templates exportés en MP4 et comparés à la preview (captures)
- [ ] Tous les cas manuels passés (9:16, 16:9, 1:1, 60 fps, 10 s→8 min, parole
      rapide, accents/`œ`, FR+EN, silence, réseau coupé, `beforeunload`)
- [ ] Mobile irréprochable : pas de scroll parasite, pas de zoom au focus,
      safe-area OK, tout au doigt
- [ ] Undo/redo fonctionnel
- [ ] Aucun secret dans le repo, `.env.example` à jour
- [ ] `README.md` : install, env, commandes de déploiement Lambda, ajout d'un template

---

## 16. Commandes

```bash
# Dev local
npm run dev                 # http://localhost:3000
npm run test                # vitest (unitaires)
npm run test:e2e            # playwright (desktop + iPhone 14)
npm run build               # build check
npx tsc --noEmit            # typecheck strict
npx remotion studio         # preview/debug des templates

# Lambda (voir §13)
npx remotion lambda functions deploy --memory=3008 --disk=2048 --timeout=300
npm run deploy:site
npx remotion lambda render <serve-url> Captions out.mp4 --props=props.json
```

---

## 17. À valider avec Shortfy

- Langue de l'interface : FR ou EN ?
- Région AWS.
- Bucket S3 : dédié ou réutiliser celui de Remotion ?
- Licence Mochica : Shortfy l'achète, ou on retire la police ?
