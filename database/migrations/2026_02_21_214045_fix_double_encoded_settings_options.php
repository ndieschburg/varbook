<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Fix double-encoded JSON in settings_definitions table.
     * The options and validation_rules columns were being json_encoded manually
     * in SettingsManager::define(), but the model also has array casts which
     * caused Laravel to json_encode them again on save.
     */
    public function up(): void
    {
        $definitions = DB::table('settings_definitions')->get();

        foreach ($definitions as $definition) {
            $updates = [];

            // Fix options if it's a double-encoded string
            if ($definition->options !== null) {
                $decoded = json_decode($definition->options, true);
                // If decoding gives us a string, it was double-encoded
                if (is_string($decoded)) {
                    $updates['options'] = $decoded;
                }
            }

            // Fix validation_rules if it's a double-encoded string
            if ($definition->validation_rules !== null) {
                $decoded = json_decode($definition->validation_rules, true);
                // If decoding gives us a string, it was double-encoded
                if (is_string($decoded)) {
                    $updates['validation_rules'] = $decoded;
                }
            }

            if (!empty($updates)) {
                DB::table('settings_definitions')
                    ->where('id', $definition->id)
                    ->update($updates);
            }
        }
    }

    public function down(): void
    {
        // No rollback needed - the data is now correct
    }
};
