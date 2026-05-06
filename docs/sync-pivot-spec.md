# Sync Pivot Format — Specification

## 1. Objectif

Permettre la reprise de lecture entre la PWA (epub.js) et KOReader (CREngine) avec une précision à la page, en s'affranchissant des formats natifs incompatibles (CFI vs XPointer).

Le serveur stocke un **format pivot** : `spine_index` + `spine_percent`. Chaque client traduit depuis/vers son format natif.

---

## 2. Format du pivot

```jsonc
{
  "spine_index": 3,                    // int, 0-based, index dans le <spine> OPF
  "spine_href": "chapter03.xhtml",     // string, href dans le manifest OPF (vérification croisée)
  "spine_percent": 0.4217,             // float 0-1, ratio de progression dans le spine item
  "source": "web",                     // "web" | "koreader"
  "updated_at": "2026-05-06T14:30:00Z" // ISO 8601, géré côté serveur
}
```

### Validation Laravel

```php
[
    'spine_index'   => ['required', 'integer', 'min:0'],
    'spine_href'    => ['required', 'string', 'max:500'],
    'spine_percent' => ['required', 'numeric', 'min:0', 'max:1'],
    'source'        => ['required', 'string', 'in:web,koreader'],
]
```

### Sémantique des champs

| Champ | Règle |
|-------|-------|
| `spine_index` | Index 0-based dans l'élément `<spine>` du fichier OPF. **DocFragment[N] de CREngine est 1-based** : `spine_index = N - 1`. |
| `spine_href` | Href relatif tel qu'il apparaît dans le `<manifest>` OPF. Sert de fallback si `spine_index` diverge entre clients (items `linear="no"` traités différemment). |
| `spine_percent` | Ratio 0-1 de la progression **au sein du spine item courant**. Basé sur le rendu (pages côté epub.js, pixels côté KOReader). Pas sur les caractères. |
| `source` | Client ayant produit le pivot. Informatif uniquement. |

### Précision attendue

Le `spine_percent` est un ratio basé sur le rendu de chaque engine. Au sein d'un même spine item, les deux engines rendent le même texte. La divergence de `spine_percent` entre les deux engines sera de l'ordre de **quelques pages** au lieu des dizaines de pages actuelles sur le pourcentage global. C'est acceptable pour une reprise de lecture.

---

## 3. Endpoints Laravel

### 3.1 Lire la position pivot

```
GET /api/books/{book}/pivot
```

**Réponse 200 :**
```json
{
  "data": {
    "spine_index": 3,
    "spine_href": "chapter03.xhtml",
    "spine_percent": 0.4217,
    "source": "web",
    "updated_at": "2026-05-06T14:30:00Z"
  }
}
```

**Réponse 200 (aucune position) :**
```json
{
  "data": null
}
```

### 3.2 Écrire la position pivot

```
PUT /api/books/{book}/pivot
```

**Body :**
```json
{
  "spine_index": 3,
  "spine_href": "chapter03.xhtml",
  "spine_percent": 0.4217,
  "source": "web",
  "progress": 42.17
}
```

Le champ `progress` (0-100) est le pourcentage global calculé par le client. Il alimente `books.progress` pour l'affichage bibliothèque/stats. Il n'est **pas** utilisé pour la résolution de position.

### 3.3 Endpoint Varbook (KOReader plugin)

Le pivot est intégré dans les endpoints existants :

```
GET  /api/varbook/progress/{documentHash}   → retourne le pivot dans la réponse
POST /api/varbook/progress/{documentHash}/batch → accepte un pivot optionnel
```

**GET response enrichie :**
```json
{
  "progress": 42.17,
  "position": "/body/DocFragment[4]/body/div/p[12]",
  "last_sync_at": "2026-05-06T14:30:00Z",
  "last_sync_client": "web",
  "timestamp": 1717538400,
  "pivot": {
    "spine_index": 3,
    "spine_href": "chapter03.xhtml",
    "spine_percent": 0.4217,
    "source": "web"
  }
}
```

**Batch POST enrichi :** le dernier update peut inclure un champ `pivot`.

### 3.4 Intégration avec le système existant

Le pivot **coexiste** avec le système actuel (`books.progress`, `book_sync_identifiers.raw_position`). Le flux `processSyncEvent()` continue de fonctionner normalement pour les sessions et stats. Le pivot remplace uniquement la logique de **navigation cross-client**.

- **same-client** (web→web) : continue d'utiliser le CFI directement
- **same-client** (koreader→koreader) : continue d'utiliser le XPointer directement
- **cross-client** (web↔koreader) : utilise le pivot

### 3.5 Migration

```php
Schema::table('books', function (Blueprint $table) {
    $table->json('reading_pivot')->nullable()->after('progress');
});
```

Colonne JSON sur `books`. Un seul pivot actif par livre, pas besoin d'historique ni de table dédiée.

---

## 4. Côté Web (epub.js) — Extraction et résolution

### 4.1 APIs epub.js utilisées (confirmées)

| API | Ce qu'elle retourne | Source |
|-----|---------------------|--------|
| `location.start.href` | Href du spine item courant (string) | Événement `relocated` |
| `location.start.displayed.page` | Page courante dans le spine item (1-based) | Événement `relocated` |
| `location.start.displayed.total` | Nombre total de pages dans le spine item | Événement `relocated` |
| `book.spine.get(href)` | `SpineItem` avec `.index` (0-based) | API Spine |
| `rendition.display(href)` | Navigue au début d'un spine item | API Rendition |
| `rendition.next()` | Avance d'une page | API Rendition |

`displayed.page` et `displayed.total` sont les pages **au sein du spine item courant** (confirmé dans le source epub.js `rendition.js` : `page: start.pages[0] || 1`, `total: start.totalPages`).

### 4.2 Extraction du pivot

À chaque save de position (événement `relocated` + navigation utilisateur) :

```typescript
function extractPivot(book: Book, location: DisplayedLocation): PivotData | null {
    const start = location.start;
    const spineItem = book.spine.get(start.href);
    if (!spineItem) return null;

    const total = start.displayed.total;
    const page = start.displayed.page; // 1-based

    // Ratio 0-1 de la position dans le spine item
    // page=1, total=1 → 0.0 (début unique page)
    // page=1, total=20 → 0.0 (début chapitre)
    // page=10, total=20 → 0.473 (milieu)
    // page=20, total=20 → 1.0 (fin chapitre)
    const spinePercent = total <= 1 ? 0 : (page - 1) / (total - 1);

    return {
        spine_index: spineItem.index,
        spine_href: spineItem.href,
        spine_percent: Math.round(spinePercent * 10000) / 10000, // 4 décimales
        source: 'web',
    };
}
```

**Granularité** : pour un chapitre de 20 pages, on obtient une précision de 5% (1 page). Pour 50 pages, 2%. C'est la granularité du rendu epub.js — on ne peut pas être plus précis que la page affichée.

### 4.3 Résolution d'un pivot (navigation)

Quand le reader charge et détecte un pivot cross-client :

```typescript
async function resolvePivot(
    book: Book,
    rendition: Rendition,
    pivot: PivotData,
): Promise<void> {
    // 1. Trouver le spine item
    let spineItem = book.spine.get(pivot.spine_index);
    if (!spineItem || spineItem.href !== pivot.spine_href) {
        // Fallback par href si l'index ne correspond pas
        spineItem = book.spine.get(pivot.spine_href);
    }
    if (!spineItem) {
        console.warn('Pivot: spine item not found');
        return;
    }

    // 2. Naviguer au début du spine item
    await rendition.display(spineItem.href);

    // 3. Lire le nombre total de pages dans ce spine item
    const loc = rendition.currentLocation() as DisplayedLocation;
    const totalPages = loc.start.displayed.total;

    // 4. Calculer la page cible
    const targetPage = Math.round(pivot.spine_percent * (totalPages - 1));

    // 5. Avancer page par page jusqu'à la cible
    for (let i = 0; i < targetPage; i++) {
        await rendition.next();
    }
}
```

**Performance** : pour un chapitre de 30 pages et un `spine_percent` de 0.5, on fait 15 appels `next()`. Chaque appel prend ~50ms → ~750ms total. Acceptable car ça ne se produit que lors d'un sync cross-client, pas à chaque page turn.

**Optimisation possible** (phase 2) : utiliser le système de locations epub.js pour convertir directement en CFI sans boucle `next()`. Après `locations.generate()`, on peut calculer le CFI cible via `cfiFromPercentage()` si on connaît les bornes globales du spine item.

---

## 5. Côté KOReader (plugin Varbook) — Extraction et résolution

### 5.1 APIs CREngine utilisées (confirmées)

| API | Ce qu'elle retourne | Source confirmée |
|-----|---------------------|-----------------|
| `self.ui.rolling:getLastProgress()` | XPointer courant (string) | `readerrolling.lua` |
| `self.ui.document:getPosFromXPointer(xp)` | Position Y en pixels dans le document (int) | `credocument.lua` |
| `self.ui.document:isXPointerInDocument(xp)` | Booléen, vérifie existence | `credocument.lua` |
| `self.ui.document:getPageCount()` | Nombre total de pages rendues | `credocument.lua` |
| `self.ui.document:getPageXPointer(page)` | XPointer du début d'une page | `credocument.lua` |
| `self.ui.document.info.doc_height` | Hauteur totale du document en px | propriété CreDocument |
| `self.ui:handleEvent(Event:new("GotoXPointer", xp))` | Navigation vers un XPointer | système d'événements KOReader |
| `self.ui:handleEvent(Event:new("GotoPage", n))` | Navigation vers une page | système d'événements KOReader |

### 5.2 Extraction du spine_index depuis le XPointer

CREngine charge l'EPUB comme un DOM unique. Chaque fichier XHTML du spine devient un `DocFragment[N]` (1-based).

XPointer typique : `/body/DocFragment[5]/body/div/p[12]/text().0`

```lua
local function spineIndexFromXPointer(xpointer)
    local n = xpointer:match("DocFragment%[(%d+)%]")
    if n then
        return tonumber(n) - 1  -- 1-based → 0-based
    end
    -- Pas de DocFragment = EPUB mono-fichier
    return 0
end
```

### 5.3 Extraction du spine_percent

Le ratio est calculé en pixels : position courante relative au début et à la fin du DocFragment.

```lua
function Varbook:computeSpinePercent(xpointer, spine_index)
    local current_pos = self.ui.document:getPosFromXPointer(xpointer)

    -- Début du DocFragment
    local frag_n = spine_index + 1 -- 0-based → 1-based
    local start_xp = "/body/DocFragment[" .. frag_n .. "]/body"
    local start_pos = self.ui.document:getPosFromXPointer(start_xp)

    -- Fin du DocFragment : début du suivant, ou fin du document
    local end_pos
    local next_xp = "/body/DocFragment[" .. (frag_n + 1) .. "]/body"
    if self.ui.document:isXPointerInDocument(next_xp) then
        end_pos = self.ui.document:getPosFromXPointer(next_xp)
    else
        end_pos = self.ui.document.info.doc_height
    end

    if end_pos <= start_pos then return 0 end

    local ratio = (current_pos - start_pos) / (end_pos - start_pos)
    return math.max(0, math.min(1, ratio))
end
```

**À valider expérimentalement** :
1. Que `getPosFromXPointer("/body/DocFragment[N]/body")` retourne bien la position du début du spine item (et pas une erreur ou 0)
2. Que les positions sont cohérentes : `start_pos < current_pos < end_pos`

### 5.4 Extraction complète du pivot

```lua
function Varbook:extractPivot()
    if self.ui.document.info.has_pages then
        return nil  -- Pas de pivot pour les PDFs
    end

    local xpointer = self.ui.rolling:getLastProgress()
    if not xpointer then return nil end

    local spine_index = spineIndexFromXPointer(xpointer)
    local spine_percent = self:computeSpinePercent(xpointer, spine_index)

    -- spine_href : fourni par le serveur et caché localement (cf. §5.6)
    local spine_href = self.spine_map and self.spine_map[spine_index] or ""

    return {
        spine_index = spine_index,
        spine_href = spine_href,
        spine_percent = math.floor(spine_percent * 10000) / 10000,
        source = "koreader",
    }
end
```

### 5.5 Résolution d'un pivot (navigation)

```lua
function Varbook:resolvePivot(pivot)
    -- 1. Vérifier que le DocFragment existe
    local frag_n = pivot.spine_index + 1
    local start_xp = "/body/DocFragment[" .. frag_n .. "]/body"

    if not self.ui.document:isXPointerInDocument(start_xp) then
        logger.warn("Varbook: DocFragment[" .. frag_n .. "] not found, fallback")
        return false
    end

    -- 2. Calculer la position px cible
    local start_pos = self.ui.document:getPosFromXPointer(start_xp)
    local end_pos
    local next_xp = "/body/DocFragment[" .. (frag_n + 1) .. "]/body"
    if self.ui.document:isXPointerInDocument(next_xp) then
        end_pos = self.ui.document:getPosFromXPointer(next_xp)
    else
        end_pos = self.ui.document.info.doc_height
    end

    local target_pos = start_pos + (end_pos - start_pos) * pivot.spine_percent

    -- 3. Convertir en page et naviguer
    local page_count = self.ui.document:getPageCount()
    local doc_height = self.ui.document.info.doc_height
    local target_page = math.floor(target_pos / doc_height * page_count)
    target_page = math.max(1, math.min(page_count, target_page))

    -- 4. Obtenir le XPointer de la page cible et naviguer
    local target_xp = self.ui.document:getPageXPointer(target_page)
    self.ui:handleEvent(Event:new("GotoXPointer", target_xp))
    return true
end
```

### 5.6 Cache du spine_map (href par index)

KOReader n'expose pas le manifest OPF. Le plugin a besoin des `href` pour les envoyer au serveur. Deux options :

**Option 1 (recommandée)** : le serveur fournit le spine_map dans la réponse GET progress.

```json
{
  "pivot": { ... },
  "spine_map": ["titlepage.xhtml", "chapter01.xhtml", "chapter02.xhtml"]
}
```

Le plugin le cache localement dans LuaSettings.

**Option 2 (fallback)** : le plugin envoie `spine_href: ""` (vide). Le serveur match uniquement sur `spine_index`. Moins robuste si les items `linear="no"` créent un décalage.

---

## 6. Stratégie de résolution de conflits

### Règle : last-write-wins

Le pivot le plus récent (`updated_at` côté serveur) écrase l'ancien.

**Pourquoi pas "le plus avancé gagne" :**
- L'utilisateur peut relire un passage (retour en arrière volontaire)
- La progression n'est pas monotone
- Le "plus avancé" n'est pas toujours le "voulu"

### Quand utiliser le pivot vs le format natif

| Dernier sync | Client courant | Navigation |
|-------------|---------------|------------|
| web | web | CFI direct (précis) |
| koreader | koreader | XPointer direct (précis) |
| web | koreader | **Pivot** |
| koreader | web | **Pivot** |

Le pivot n'est consulté/écrit que lors de syncs. Le format natif (CFI/XPointer) reste stocké en parallèle pour les reprises same-client.

---

## 7. Cas limites

### 7.1 EPUB mono-fichier (un seul spine item)

- Le XPointer ne contient pas de `DocFragment[N]` → `spineIndexFromXPointer()` retourne 0
- `spine_percent` représente la position dans l'unique fichier
- La précision dépend de la taille du fichier : pour un EPUB de 500 pages en un seul fichier, on retrouve la même granularité que le pourcentage global actuel
- **Impact limité** : les EPUBs mono-fichier sont rares (la plupart sont découpés par chapitre)

### 7.2 Spine items non-linéaires (`linear="no"`)

L'OPF peut contenir des items `linear="no"` (notes, index). CREngine peut les numéroter différemment d'epub.js.

- `spine_href` sert de vérification croisée
- Si `spine_index` ne correspond pas au bon `href`, le client tente un fallback par `href`

**À valider expérimentalement** : comment CREngine numérote-t-il les DocFragments pour les items `linear="no"` ?

### 7.3 Viewport très différent entre appareils

Un Kobo de 6" et un écran desktop 27" n'ont pas le même nombre de pages par chapitre. Mais `spine_percent` est un **ratio** : 50% du rendu reste 50% du rendu, quel que soit le nombre de pages.

La divergence vient de la **distribution du contenu** : un chapitre avec une grande image rendra différemment sur les deux devices. Mais au sein d'un spine item de texte pur, le ratio est stable.

### 7.4 Petits spine items (couverture, page de titre)

- Spine items de quelques lignes : `spine_percent` sera 0 ou 1
- Pas de problème : on ne reprend jamais la lecture sur une page de titre
- La granularité (±1 page) est de toute façon suffisante pour ces items

### 7.5 Comportement au premier sync (pas de pivot existant)

- Premier GET : `data: null` → le client utilise son système natif normalement
- Premier PUT : crée le pivot → les syncs suivants utilisent le pivot

---

## 8. Points à valider expérimentalement

| # | Point | Côté | Impact si invalide | Fallback |
|---|-------|------|--------------------|----------|
| 1 | `getPosFromXPointer("/body/DocFragment[N]/body")` retourne la bonne position | KOReader | spine_percent incorrect | Utiliser `getPageXPointer` pour itérer et trouver les bornes |
| 2 | Positions cohérentes (start < current < end) entre DocFragments | KOReader | ratio négatif ou > 1 | Clamp à [0, 1] (déjà fait) |
| 3 | Numérotation DocFragment pour items `linear="no"` | KOReader | décalage spine_index | Fallback par `spine_href` |
| 4 | `displayed.page` et `displayed.total` disponibles et cohérents après `relocated` | epub.js | spine_percent = 0 systématiquement | Utiliser `location.start.percentage` (global) comme approximation |
| 5 | `rendition.display(href)` + boucle `next()` fonctionne de façon fiable | epub.js | navigation incomplète | Utiliser `cfiFromPercentage` avec estimation globale |

---

## 9. Plan d'implémentation

### Phase 1 — Validation (avant tout code de prod)

1. **KOReader** : ajouter des logs temporaires dans le plugin pour vérifier points 1-3
   - Logger `getPosFromXPointer` pour quelques DocFragments
   - Vérifier que le ratio calculé correspond à la position visuelle
2. **epub.js** : ajouter des logs dans le handler `relocated` pour vérifier point 4
   - Logger `displayed.page`, `displayed.total`, `href` à chaque page turn
   - Vérifier la cohérence
3. **epub.js** : tester la navigation `display(href)` + `next()` loop (point 5)

### Phase 2 — Backend

1. Migration : ajouter `reading_pivot` (JSON) sur `books`
2. `GET/PUT /api/books/{book}/pivot` (authentifié Sanctum)
3. Enrichir `GET /api/varbook/progress/{hash}` avec le pivot
4. Enrichir `POST /api/varbook/progress/{hash}/batch` pour accepter le pivot

### Phase 3 — Frontend (epub.js)

1. `extractPivot()` dans le handler de save position
2. `resolvePivot()` dans le handler de load position
3. Intégrer avec `usePositionSync` : envoyer/recevoir le pivot alongside le CFI
4. Condition : n'utiliser le pivot que pour les syncs cross-client

### Phase 4 — Plugin KOReader

1. `extractPivot()` au moment du push batch
2. `resolvePivot()` au moment du pull progress
3. Cache `spine_map` depuis la réponse serveur

### Phase 5 — Tests

1. Tester la boucle complète : lire sur KOReader → sync → reprendre sur PWA → sync → reprendre sur KOReader
2. Mesurer le gap résiduel (en pages)
3. Tester avec différents types d'EPUBs (mono/multi-fichier, avec/sans images)

---

## 10. Fichiers impactés

### Backend

| Fichier | Modification |
|---------|-------------|
| `database/migrations/new` | Ajout colonne `reading_pivot` JSON sur `books` |
| `app/Models/Book.php` | Cast `reading_pivot` en array, méthode `updatePivot()` |
| `routes/api.php` | Routes `GET/PUT /api/books/{book}/pivot` |
| `app/Http/Controllers/Api/BookController.php` | Méthodes `getPivot()`, `updatePivot()` |
| `app/Http/Controllers/Api/VarbookController.php` | Enrichir réponses avec le pivot |

### Frontend

| Fichier | Modification |
|---------|-------------|
| `resources/js/hooks/usePositionSync.ts` | Envoyer/recevoir le pivot |
| `resources/js/hooks/useEpubReader.ts` | `extractPivot()` dans relocated, `resolvePivot()` dans multi-device sync |
| `resources/js/types/book.ts` | Type `PivotData` |
| `resources/js/api/hooks/useBooks.ts` | Hooks API pour le pivot |

### Plugin KOReader

| Fichier | Modification |
|---------|-------------|
| `koreader_plugin/varbook.koplugin/main.lua` | `extractPivot()`, `resolvePivot()`, `computeSpinePercent()` |
| `koreader_plugin/varbook.koplugin/varbook_api.lua` | Envoyer/recevoir le pivot dans les requêtes |
