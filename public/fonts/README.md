# Polices (§9)

Déposer **les 7 fichiers de police** dans ce dossier. Tant qu'ils sont absents,
l'app et le rendu Remotion fonctionnent **avec une police système de secours**
(pas de crash — le chargement vérifie l'existence avant de charger).

| Fichier attendu | Famille CSS | Licence |
|---|---|---|
| `Poppins.ttf` | Poppins | OFL |
| `Roboto.ttf` | Roboto | Apache 2.0 |
| `HelvChildren.otf` | HelvChildren | à vérifier |
| `MochicaPERSONALUSE.otf` | Mochica | ⚠️ **usage perso uniquement — licence commerciale à acheter avant la prod** |
| `TTNormsProSerifTrl.ttf` | TTNormsProSerif | commerciale |
| `BananaStick.otf` | BananaStick | à vérifier |
| `KomikaAxis.ttf` | KomikaAxis | à vérifier |

Les noms de fichiers et familles sont définis dans `src/remotion/fonts.ts`
(objet `FONTS`). Ne pas charger depuis un CDN (CORS / cold start Lambda =
police manquante à l'export, sans erreur visible).
