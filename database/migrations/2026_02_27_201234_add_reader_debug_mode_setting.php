<?php

use App\Services\SettingsManager;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        SettingsManager::define('reader.debug_mode', [
            'category' => 'reader',
            'type' => 'checkbox',
            'label_en' => 'Debug mode',
            'label_fr' => 'Mode debug',
            'label_es' => 'Modo depuración',
            'description_en' => 'Expose epub.js objects (epubBook, epubRendition) to browser console for debugging',
            'description_fr' => 'Expose les objets epub.js (epubBook, epubRendition) dans la console du navigateur pour le débogage',
            'description_es' => 'Exponer objetos epub.js (epubBook, epubRendition) en la consola del navegador para depuración',
            'default_value' => false,
            'is_user_overridable' => true,
            'sort_order' => 200,
        ]);
    }

    public function down(): void
    {
        SettingsManager::remove('reader.debug_mode');
    }
};
