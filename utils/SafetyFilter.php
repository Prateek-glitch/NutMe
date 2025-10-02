<?php
declare(strict_types=1);

class SafetyFilter {
    /**
     * Very simple lexical filter:
     * 1. Censors banned terms.
     * 2. Normalizes whitespace.
     * 3. Collapses too many blank lines.
     *
     * You can extend with regexes or external moderation APIs.
     */
    private static array $banned = [
        // User-requested disallowed terms (explicit / degrading). We block them instead of allowing.
        'rand',
        'rand ki awlad',
        'rand ki aulaad',
        'bhosdika',
        'jhat ka baal',
        'chut si sakal',
        // English severe profanity / escalators
        'motherfucker',
        'mother-fucker',
        'fucker',
        'fucking hell',
        'piece of shit',
        'dumbass',
        'asshole',
        // Add more if needed
    ];

    /**
     * Return sanitized text (censor banned terms).
     * If you prefer rejection instead of masking, you could detect and return a flag.
     */
    public static function sanitize(string $text): string {
        if ($text === '') return $text;

        foreach (self::$banned as $term) {
            $pattern = '/' . self::regexEscapeWord($term) . '/iu';
            $replacement = str_repeat('*', mb_strlen($term));
            $text = preg_replace($pattern, $replacement, $text);
        }

        // Collapse 3+ blank lines
        $text = preg_replace("/\n{3,}/", "\n\n", $text);

        // Trim trailing spaces per line
        $lines = preg_split("/\r?\n/", $text);
        $lines = array_map(fn($l) => rtrim($l), $lines);

        return trim(implode("\n", $lines));
    }

    /**
     * Returns true if any banned term (raw) appears (for decision logic).
     */
    public static function containsBanned(string $text): bool {
        $lower = mb_strtolower($text);
        foreach (self::$banned as $term) {
            if (str_contains($lower, mb_strtolower($term))) {
                return true;
            }
        }
        return false;
    }

    private static function regexEscapeWord(string $w): string {
        return preg_quote($w, '/');
    }
}