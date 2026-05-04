<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateAdminCommand extends Command
{
    protected $signature = 'varbook:create-admin
                            {--name= : Admin name}
                            {--email= : Admin email}
                            {--password= : Admin password}';

    protected $description = 'Create an admin user for Varbook';

    public function handle(): int
    {
        $name = $this->option('name') ?? $this->ask('Admin name');
        $email = $this->option('email') ?? $this->ask('Admin email');
        $password = $this->option('password') ?? $this->secret('Admin password');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return self::FAILURE;
        }

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'kosync_password_hash' => Hash::make(md5($password)),
            'is_admin' => true,
        ]);

        $this->info("Admin user '{$user->name}' created successfully!");
        $this->line("Email: {$user->email}");

        return self::SUCCESS;
    }
}
