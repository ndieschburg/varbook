# BookShelf — Settings System Specifications

## Overview

A dynamic, migration-driven settings system where settings are defined exclusively via Laravel migrations. Each setting has a system-wide default value set by admins, and can optionally be overridden per user. Settings are categorized, typed, and rendered automatically in both the admin panel and user profile page.

**No UI for creating settings.** Settings are code-defined via migrations. The UI only allows setting values.

---

## Database Schema

### `settings_definitions` table

Defines the setting itself. One row per setting. Created only via migrations.

```
settings_definitions
├── id (bigint, PK)
├── key (string, unique, e.g. 'reader.font_size')
├── category (string, e.g. 'reader', 'general', 'library', 'appearance')
├── type (enum: 'text', 'textarea', 'number', 'checkbox', 'select', 'multiselect', 'color')
├── label (string, human-readable label in English, used as fallback)
├── description (string, nullable, help text in English, used as fallback)
├── default_value (text, nullable, JSON-encoded for complex types)
├── options (text, nullable, JSON-encoded array for select/multiselect, e.g. '["light","dark","sepia"]')
├── validation_rules (text, nullable, JSON-encoded, e.g. '{"min":8,"max":72}' for number)
├── is_user_overridable (boolean, default: true)
├── sort_order (integer, default: 0, for ordering within category)
├── created_at
└── updated_at
```

### `settings_values` table

Stores actual values. One row per setting per scope (system or user).

```
settings_values
├── id (bigint, PK)
├── setting_definition_id (FK → settings_definitions)
├── user_id (FK → users, nullable — NULL means system-level value)
├── value (text, JSON-encoded)
├── created_at
└── updated_at
├── UNIQUE(setting_definition_id, user_id) — one value per setting per user/system
```

---

## Setting Types

| Type | `default_value` format | `options` format | `validation_rules` format | UI Component |
|------|----------------------|------------------|--------------------------|--------------|
| `text` | `"string"` | null | `{"maxlength": 255}` | `<input type="text">` |
| `textarea` | `"string"` | null | `{"maxlength": 5000}` | `<textarea>` |
| `number` | `42` | null | `{"min": 0, "max": 100, "step": 1}` | `<input type="number">` with min/max/step |
| `checkbox` | `true` / `false` | null | null | Toggle switch |
| `select` | `"value"` | `[{"value":"light","label":"Light"}, ...]` | null | `<select>` dropdown |
| `multiselect` | `["val1","val2"]` | `[{"value":"a","label":"A"}, ...]` | null | Multi-select checkboxes or tag picker |
| `color` | `"#6366f1"` | null | null | Color picker input |

All values are stored JSON-encoded in `settings_values.value`.

Labels in the `options` array are English fallbacks. Translations go in the standard translation files using the pattern `settings.options.{setting_key}.{option_value}`.

Example for `reader.theme` options:
```json
// lang/fr.json
{
  "settings.options.reader.theme.light": "Clair",
  "settings.options.reader.theme.dark": "Sombre",
  "settings.options.reader.theme.sepia": "Sépia"
}
```

---

## Migration Helper

Create a service class `SettingsManager` with a static method to simplify adding settings in migrations:

```php
use App\Services\SettingsManager;

// In a migration up() method:
SettingsManager::define('reader.font_size', [
    'category' => 'reader',
    'type' => 'number',
    'label_en' => 'Font size',
    'label_fr' => 'Taille de police',
    'description_en' => 'Default font size in pixels for the EPUB reader',
    'description_fr' => 'Taille de police par défaut en pixels pour le lecteur EPUB',
    'default_value' => 16,
    'validation_rules' => ['min' => 8, 'max' => 72, 'step' => 1],
    'is_user_overridable' => true,
    'sort_order' => 10,
]);

SettingsManager::define('reader.theme', [
    'category' => 'reader',
    'type' => 'select',
    'label_en' => 'Reader theme',
    'label_fr' => 'Thème du lecteur',
    'default_value' => 'dark',
    'options' => [
        ['value' => 'light', 'label_en' => 'Light', 'label_fr' => 'Clair'],
        ['value' => 'dark', 'label_en' => 'Dark', 'label_fr' => 'Sombre'],
        ['value' => 'sepia', 'label_en' => 'Sepia', 'label_fr' => 'Sépia'],
    ],
    'is_user_overridable' => true,
    'sort_order' => 20,
]);

SettingsManager::define('general.max_upload_size_mb', [
    'category' => 'general',
    'type' => 'number',
    'label_en' => 'Max upload size (MB)',
    'label_fr' => 'Taille max d\'upload (Mo)',
    'default_value' => 50,
    'validation_rules' => ['min' => 1, 'max' => 500],
    'is_user_overridable' => false, // admin only
    'sort_order' => 10,
]);

// In the migration down() method:
SettingsManager::remove('reader.font_size');
SettingsManager::remove('reader.theme');
SettingsManager::remove('general.max_upload_size_mb');
```

`SettingsManager::define()` uses `updateOrCreate` on the `key` field so migrations are idempotent and re-runnable.

`SettingsManager::remove()` deletes the definition AND all associated values (system + user).

---

## Value Resolution Logic

When retrieving a setting value for a given user:

```
1. Check settings_values WHERE setting_definition_id = X AND user_id = Y
   → If found: return this value (user override)
2. Check settings_values WHERE setting_definition_id = X AND user_id IS NULL
   → If found: return this value (admin system value)
3. Return settings_definitions.default_value (migration default)
```

Priority: **User override > Admin system value > Migration default**

User overrides can only exist if `is_user_overridable = true`.

---

## Backend Service

### `SettingsService` class

```php
// Get resolved value for current user (or system if no user)
Settings::get('reader.font_size'); // returns typed value (int 16)
Settings::get('reader.font_size', $userId); // returns user's value or fallback

// Set system value (admin)
Settings::setSystem('reader.font_size', 18);

// Set user override
Settings::setUser('reader.font_size', $userId, 20);

// Reset user override (fall back to system/default)
Settings::resetUser('reader.font_size', $userId);

// Get all settings for a category with resolved values
Settings::getCategory('reader', $userId);
// Returns array of SettingDefinition objects with resolved `current_value`

// Get all categories with all settings (for full settings page)
Settings::getAll($userId);

// Check if user has an override
Settings::hasUserOverride('reader.font_size', $userId);
```

The `Settings` facade should cache definitions in memory (per-request) to avoid repeated DB queries. Use `$request->attributes` or a singleton.

### Helper function

```php
// Global helper for quick access in code
setting('reader.font_size'); // uses auth()->id() automatically
```

---

## API Endpoints

### Admin endpoints (admin middleware)

```
GET    /api/admin/settings                    → All settings grouped by category with system values
PUT    /api/admin/settings/{key}              → Update system value
         Body: { "value": ... }
```

### User endpoints (auth middleware)

```
GET    /api/settings                          → All user-overridable settings grouped by category
                                                with resolved values and override status
PUT    /api/settings/{key}                    → Set user override
         Body: { "value": ... }
DELETE /api/settings/{key}                    → Reset user override (revert to system/default)
```

### API Response Format

```json
// GET /api/settings response
{
  "categories": [
    {
      "key": "reader",
      "label_en": "EPUB Reader",
      "label_fr": "Lecteur EPUB",
      "settings": [
        {
          "key": "reader.font_size",
          "type": "number",
          "label": "Font size",
          "description": "Default font size in pixels for the EPUB reader",
          "value": 20,
          "default_value": 16,
          "system_value": 18,
          "is_overridden": true,
          "validation_rules": { "min": 8, "max": 72, "step": 1 },
          "options": null
        },
        {
          "key": "reader.theme",
          "type": "select",
          "label": "Reader theme",
          "description": null,
          "value": "dark",
          "default_value": "dark",
          "system_value": "dark",
          "is_overridden": false,
          "validation_rules": null,
          "options": [
            { "value": "light", "label": "Light" },
            { "value": "dark", "label": "Dark" },
            { "value": "sepia", "label": "Sepia" }
          ]
        }
      ]
    }
  ]
}
```

The `label` and `description` fields in the database are English fallbacks. Translations use Laravel's standard i18n system with the key pattern:

- Label: `settings.{key}` (e.g. `settings.reader.font_size`)
- Description: `settings.{key}_description` (e.g. `settings.reader.font_size_description`)

```json
// lang/fr.json
{
  "settings.reader.font_size": "Taille de police",
  "settings.reader.font_size_description": "Taille de police par défaut en pixels pour le lecteur EPUB",
  "settings.reader.theme": "Thème du lecteur"
}
```

The API returns the translated label/description based on the user's locale, falling back to the English `label`/`description` columns if no translation exists.

---

## Frontend — React Components

### Settings page structure

Both admin and user settings pages share the same component architecture, differing only in data source and write capabilities.

#### `SettingsPage` component

- Fetches settings from API (`/api/admin/settings` or `/api/settings`)
- Renders a tabbed layout, one tab per category
- Each tab contains a list of `SettingField` components
- Save button per category (or auto-save on change — pick one, auto-save is preferred for live preview)
- For user page: each overridable setting shows a "Reset to default" link that calls `DELETE /api/settings/{key}`

#### `SettingField` component

Auto-renders the correct input based on `type`:

| Type | Component |
|------|-----------|
| `text` | Text input with optional maxlength |
| `textarea` | Textarea with optional maxlength and character counter |
| `number` | Number input with min/max/step, slider optional for bounded values |
| `checkbox` | Toggle switch with label |
| `select` | Dropdown select |
| `multiselect` | Checkbox group or tag-style multi-select |
| `color` | Color picker (native `<input type="color">` + hex text input) |

Each field displays:
- Label (translated)
- Description/help text if present (translated)
- Current value
- For user page: indicator if value is overridden (e.g. small "customized" badge) + reset link
- Validation errors inline

#### Live preview for appearance settings

Settings in the `appearance` and `reader` categories trigger a live preview:
- When the user changes a value, it is applied immediately to the current page/component via React state
- A preview panel shows the effect (e.g. a mini reader preview for font size/theme changes)
- The value is sent to the API via auto-save (debounced 500ms)
- If the user resets to default, the preview updates immediately

Implementation:
- `useSettings()` React hook that holds current settings in state
- Changing a setting updates local state immediately (optimistic) + triggers debounced API call
- The reader and UI components consume settings from this hook
- On API error: revert local state and show toast

---

## Categories

Categories are not stored in the database. They are derived from the `category` field of settings definitions. The display order and labels are defined in a config:

```php
// config/bookshelf.php
'settings_categories' => [
    'general' => ['label' => 'General', 'icon' => 'settings', 'sort' => 1],
    'reader' => ['label' => 'EPUB Reader', 'icon' => 'book-open', 'sort' => 2],
    'library' => ['label' => 'Library', 'icon' => 'library', 'sort' => 3],
    'appearance' => ['label' => 'Appearance', 'icon' => 'palette', 'sort' => 4],
],
```

Category labels use standard i18n: `settings.category.{key}` (e.g. `settings.category.reader`). The `label` in config is the English fallback.

New categories are automatically supported — just use a new category string in a migration and add it to the config.

---

## Validation

### Backend
- On PUT, validate the value against the setting's `type` and `validation_rules`
- Type checks: checkbox must be boolean, number must be numeric within min/max, select value must be in options list, multiselect values must all be in options list, color must match hex pattern
- Return 422 with field errors on validation failure

### Frontend
- Mirror the same validation client-side for instant feedback
- `validation_rules` from the API response drive the input constraints (min/max attributes, maxlength, etc.)

---

## Initial Settings (seed migration)

Create a migration that seeds the initial settings:

### General
| Key | Type | Default | User overridable |
|-----|------|---------|-----------------|
| `general.max_upload_size_mb` | number | 50 | no |
| `general.session_gap_minutes` | number | 10 | no |
| `general.max_session_hours` | number | 4 | no |
| `general.finished_threshold` | number | 95 | no |

### EPUB Reader
| Key | Type | Default | User overridable |
|-----|------|---------|-----------------|
| `reader.font_size` | number | 16 | yes |
| `reader.font_family` | select | system | yes |
| `reader.theme` | select | dark | yes |
| `reader.line_height` | number | 1.6 | yes |
| `reader.text_align` | select | justify | yes |
| `reader.margin_horizontal` | number | 16 | yes |
| `reader.keep_screen_awake` | checkbox | true | yes |
| `reader.swipe_to_turn` | checkbox | true | yes |
| `reader.tap_to_turn` | checkbox | true | yes |

### Library
| Key | Type | Default | User overridable |
|-----|------|---------|-----------------|
| `library.default_sort` | select | recent | yes |
| `library.cards_per_row` | number | 4 | yes |
| `library.show_reading_time` | checkbox | true | yes |
| `library.show_progress_bar` | checkbox | true | yes |

### Appearance
| Key | Type | Default | User overridable |
|-----|------|---------|-----------------|
| `appearance.accent_color` | color | #6366f1 | yes |
| `appearance.ui_theme` | select | dark | yes |

---

## Migration of existing .env settings

The settings that were previously in `.env` (`BOOKSHELF_MAX_SESSION_HOURS`, `BOOKSHELF_SESSION_GAP_MINUTES`, `BOOKSHELF_FINISHED_THRESHOLD`, `BOOKSHELF_MAX_UPLOAD_SIZE_MB`) should be migrated to this system. The migration should:

1. Create the setting definitions
2. Read current `.env` values and insert them as system values in `settings_values`
3. The `.env` variables can then be removed

Update all code that reads these `.env` values to use `setting('general.max_upload_size_mb')` instead.

---

## Summary

- **Settings are defined in migrations** — no UI for creating settings
- **Three-tier value resolution** — user override > admin system value > migration default
- **Typed fields** — text, textarea, number, checkbox, select, multiselect, color
- **Categorized** — general, reader, library, appearance (extensible)
- **Overridable flag** — admin decides which settings users can customize
- **i18n** — labels and descriptions in en/fr
- **Live preview** — appearance and reader settings apply in real-time
- **Auto-save** — debounced API calls on change
- **Validated** — backend + frontend validation from the same rules
