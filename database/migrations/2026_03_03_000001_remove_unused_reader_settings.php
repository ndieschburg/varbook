<?php

use App\Services\SettingsManager;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Remove unused reader settings.
     * These settings are device-specific and stored in localStorage,
     * not synced via the settings API.
     */
    public function up(): void
    {
        $settingsToRemove = [
            'reader.text_align',
            'reader.margin_horizontal',
            'reader.keep_screen_awake',
            'reader.swipe_to_turn',
            'reader.tap_to_turn',
        ];

        foreach ($settingsToRemove as $key) {
            SettingsManager::remove($key);
        }
    }

    public function down(): void
    {
        // Re-create the removed settings
        SettingsManager::define('reader.text_align', [
            'category' => 'reader',
            'type' => 'select',
            'label_en' => 'Text alignment',
            'label_fr' => 'Alignement du texte',
            'label_es' => 'Alineación del texto',
            'description_en' => 'How text is aligned in the reader',
            'description_fr' => 'Comment le texte est aligné dans le lecteur',
            'description_es' => 'Cómo se alinea el texto en el lector',
            'default_value' => 'justify',
            'options' => [
                ['value' => 'left', 'label_en' => 'Left', 'label_fr' => 'Gauche', 'label_es' => 'Izquierda'],
                ['value' => 'justify', 'label_en' => 'Justify', 'label_fr' => 'Justifié', 'label_es' => 'Justificado'],
                ['value' => 'right', 'label_en' => 'Right', 'label_fr' => 'Droite', 'label_es' => 'Derecha'],
            ],
            'is_user_overridable' => true,
            'sort_order' => 50,
        ]);

        SettingsManager::define('reader.margin_horizontal', [
            'category' => 'reader',
            'type' => 'number',
            'label_en' => 'Horizontal margins',
            'label_fr' => 'Marges horizontales',
            'label_es' => 'Márgenes horizontales',
            'description_en' => 'Side margins in pixels',
            'description_fr' => 'Marges latérales en pixels',
            'description_es' => 'Márgenes laterales en píxeles',
            'default_value' => 16,
            'validation_rules' => ['min' => 0, 'max' => 100, 'step' => 1],
            'is_user_overridable' => true,
            'sort_order' => 60,
        ]);

        SettingsManager::define('reader.keep_screen_awake', [
            'category' => 'reader',
            'type' => 'checkbox',
            'label_en' => 'Keep screen awake',
            'label_fr' => 'Garder l\'écran allumé',
            'label_es' => 'Mantener pantalla encendida',
            'description_en' => 'Prevent screen from turning off while reading',
            'description_fr' => 'Empêcher l\'écran de s\'éteindre pendant la lecture',
            'description_es' => 'Evitar que la pantalla se apague mientras lees',
            'default_value' => true,
            'is_user_overridable' => true,
            'sort_order' => 70,
        ]);

        SettingsManager::define('reader.swipe_to_turn', [
            'category' => 'reader',
            'type' => 'checkbox',
            'label_en' => 'Swipe to turn pages',
            'label_fr' => 'Glisser pour tourner les pages',
            'label_es' => 'Deslizar para pasar páginas',
            'description_en' => 'Enable swipe gestures for page navigation',
            'description_fr' => 'Activer les gestes de glissement pour la navigation',
            'description_es' => 'Activar gestos de deslizamiento para la navegación',
            'default_value' => true,
            'is_user_overridable' => true,
            'sort_order' => 80,
        ]);

        SettingsManager::define('reader.tap_to_turn', [
            'category' => 'reader',
            'type' => 'checkbox',
            'label_en' => 'Tap to turn pages',
            'label_fr' => 'Toucher pour tourner les pages',
            'label_es' => 'Tocar para pasar páginas',
            'description_en' => 'Enable tap zones for page navigation',
            'description_fr' => 'Activer les zones tactiles pour la navigation',
            'description_es' => 'Activar zonas táctiles para la navegación',
            'default_value' => true,
            'is_user_overridable' => true,
            'sort_order' => 90,
        ]);
    }
};
