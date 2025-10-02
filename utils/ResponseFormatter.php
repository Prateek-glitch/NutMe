<?php
declare(strict_types=1);

class ResponseFormatter {
    public static function format(string $text): string {
        $text = trim($text);
        if ($text === '') return $text;

        // Normalize bullet styles
        $lines = preg_split("/\r?\n/", $text);
        $out = [];
        foreach ($lines as $l) {
            $l = rtrim($l);
            if (preg_match('/^[-*]\s+/', $l)) {
                $l = preg_replace('/^[-*]\s+/', '• ', $l);
            }
            $out[] = $l;
        }
        $text = implode("\n", $out);

        // Light punctuation fix: add period if a line ends with word char and next line isn't blank
        $text = preg_replace('/([A-Za-z0-9])\n(?!\n)/', "$1.\n", $text);

        return $text;
    }
}