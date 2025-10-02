<?php
declare(strict_types=1);

class PostModerator {
    /**
     * Inspect sanitized text (or raw text if you prefer) & return an action.
     * For now we just return a status. You could add "RETRY" later.
     */
    public static function evaluate(string $text): array {
        // Example simple categories:
        if (SafetyFilter::containsBanned($text)) {
            return [
                'ok' => false,
                'reason' => 'BANNED_TERM',
                'message' => 'Removed disallowed terms; content toned down.'
            ];
        }
        // Could add length / toxicity heuristics here
        return ['ok' => true];
    }
}