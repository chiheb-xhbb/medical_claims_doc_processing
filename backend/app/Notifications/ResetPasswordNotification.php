<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $token
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $email = urlencode($notifiable->getEmailForPasswordReset());
        $expireMinutes = (int) config('auth.passwords.users.expire', 60);

        $url = $frontendUrl
            . '/reset-password?token=' . $this->token
            . '&email=' . $email;

        return (new MailMessage)
            ->subject('Carte Assurances - Password Reset')
            ->greeting('Hello,')
            ->line('We received a request to reset the password for your account.')
            ->line('Click the button below to choose a new password.')
            ->action('Reset Password', $url)
            ->line("This link will expire in {$expireMinutes} minutes.")
            ->line('If you did not request a password reset, no further action is required.');
    }
}