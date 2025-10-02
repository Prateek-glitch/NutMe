<?php
declare(strict_types=1);
require_once __DIR__ . '/utils/SafetyFilter.php';
require_once __DIR__ . '/utils/ResponseFormatter.php';
require_once __DIR__ . '/utils/PostModerator.php';

header('Content-Type: application/json; charset=utf-8');

/* ---------------- CONFIG ---------------- */
const MODEL_NAME = 'gemini-2.5-flash';  // Confirmed working model
const API_VERSION = 'v1';
const MAX_FILE_MB = 4;
const LOGGING = true;
const LOG_FILE = __DIR__ . '/logs/gemini.log';

function logMsg(string $m): void {
    if (!LOGGING) return;
    $dir = dirname(LOG_FILE);
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    @file_put_contents(LOG_FILE, '[' . date('Y-m-d H:i:s') . "] $m\n", FILE_APPEND);
}

function loadEnv(string $path): void {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        $v = trim($v, " \t\n\r\0\x0B\"'");
        if ($k !== '') putenv("$k=$v");
    }
}

/* Load env & key */
loadEnv(__DIR__ . '/.env');
$API_KEY = getenv('GEMINI_API_KEY');
if (!$API_KEY) {
    echo json_encode(['error' => 'Server not configured: GEMINI_API_KEY missing.']);
    exit;
}

/* Validate upload */
if (!isset($_FILES['photo'])) {
    echo json_encode(['error' => 'No image uploaded.']);
    exit;
}
$file = $_FILES['photo'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['error' => 'Upload error code: ' . $file['error']]);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
$allowed = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp'
];
if (!isset($allowed[$mime])) {
    echo json_encode(['error' => 'Unsupported file type: ' . $mime]);
    exit;
}
if ($file['size'] > MAX_FILE_MB * 1024 * 1024) {
    echo json_encode(['error' => 'File too large (max ' . MAX_FILE_MB . 'MB).']);
    exit;
}

/* Save file */
$uploadDir = __DIR__ . '/uploads';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
$basename = bin2hex(random_bytes(10));
$ext = $allowed[$mime];
$targetPath = $uploadDir . '/' . $basename . '.' . $ext;
if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    echo json_encode(['error' => 'Failed to save file.']);
    exit;
}

/* Inputs */
$intensity     = $_POST['intensity'] ?? 'mild';
$userContext   = trim($_POST['userContext'] ?? '');
$previousPrompt= $_POST['previousPrompt'] ?? '';
$isRegen       = isset($_POST['regen']);

$intensityGuidance = [
    'mild'    => 'warm, gently cheeky, light observational humor',
    'spicy'   => 'zestier, fast-paced, playful jabs, still positive spirit',
    'chaotic' => 'high-energy surreal, zany comparisons, clever exaggerations, never demeaning'
];
$style = $intensityGuidance[$intensity] ?? $intensityGuidance['mild'];

/* Prompt (safe / no abusive instructions) */
$basePrompt = <<<PROMPT
You generate a consensual, playful roast of a face in an image.

Objectives:
- Style: $style.
- Keep it clever: surprising analogies, whimsical metaphors, comedic exaggerations.
- Never use profanity, slurs, sexually explicit or degrading language, or direct personal attacks.
- Avoid referencing protected traits or making harmful assumptions.
- Output 1–3 short punchy paragraphs OR a tight bullet list (4–7 bullets max).
- Keep it fun, upbeat, and obviously humorous.
PROMPT;

if ($userContext) {
    $basePrompt .= "\nUser context (optional flavoring): " . substr($userContext, 0, 400);
}
if ($isRegen && $previousPrompt) {
    $basePrompt .= "\nRegeneration: produce a variant focusing on fresh angles, different metaphors.";
}

/* Inline image data */
$imageData = base64_encode(file_get_contents($targetPath));

/* Endpoint & payload */
$endpoint = "https://generativelanguage.googleapis.com/" . API_VERSION . "/models/" . MODEL_NAME . ":generateContent?key=" . urlencode($API_KEY);

$payload = [
    'contents' => [[
        'parts' => [
            ['text' => $basePrompt],
            [
                'inlineData' => [
                    'mimeType' => $mime,
                    'data' => $imageData
                ]
            ]
        ]
    ]],
    'generationConfig' => [
        'temperature' => 0.95,
        'topP'        => 0.95,
        'topK'        => 40,
        'maxOutputTokens' => 320
    ],
    'safetySettings' => [
        ['category' => 'HARM_CATEGORY_HARASSMENT',  'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'],
        ['category' => 'HARM_CATEGORY_HATE_SPEECH', 'threshold' => 'BLOCK_LOW_AND_ABOVE'],
    ],
];

logMsg("Model=" . MODEL_NAME . " Intensity=$intensity File=" . basename($targetPath));

/* cURL call */
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_TIMEOUT        => 45
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($response === false) {
    $err = curl_error($ch);
    curl_close($ch);
    logMsg("cURL error: $err");
    echo json_encode(['error' => 'Curl error: ' . $err]);
    exit;
}
curl_close($ch);

$json = json_decode($response, true);
if ($httpCode >= 400 || isset($json['error'])) {
    $apiMsg = $json['error']['message'] ?? 'Unknown error';
    $status = $json['error']['status'] ?? 'UNKNOWN';
    logMsg("API ERROR $httpCode $status: $apiMsg");
    echo json_encode([
        'error' => "Gemini API error: $apiMsg",
        'status' => $status,
        'code' => $httpCode
    ]);
    exit;
}

/* Extract text */
$rawText = '';
if (!empty($json['candidates'][0]['content']['parts'])) {
    foreach ($json['candidates'][0]['content']['parts'] as $part) {
        if (isset($part['text'])) $rawText .= $part['text'] . "\n";
    }
}

if (trim($rawText) === '') {
    logMsg("Empty content (maybe blocked)");
    echo json_encode(['error' => 'No content returned (possibly safety blocked). Try mild intensity.' ]);
    exit;
}

/* Sanitize & moderate */
$sanitized = SafetyFilter::sanitize($rawText);
$moderation = PostModerator::evaluate($sanitized);
if (!$moderation['ok']) {
    // We simply return masked version with a note; you could trigger a re-generation loop instead.
    $sanitized .= "\n\n(Note: Some terms were censored for safety.)";
}

$formatted = ResponseFormatter::format($sanitized);

echo json_encode([
    'roast' => trim($formatted),
    'meta' => [
        'prompt'  => $basePrompt,
        'fileSavedAs' => basename($targetPath),
        'intensity' => $intensity,
        'model'     => MODEL_NAME,
        'version'   => API_VERSION,
        'moderation' => $moderation
    ]
]);