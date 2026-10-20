<?php
// Contact form handler for kingpra.com (Hostinger shared hosting supports PHP mail()).
$to = 'info@kingpra.com';
$from = 'no-reply@kingpra.com'; // must be an address on your own domain so mail isn't flagged as spoofed

$wantsJson = isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

function finish($ok, $message, $wantsJson, $code = 200) {
    if ($wantsJson) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $message]);
    } else {
        header('Location: /?' . ($ok ? 'sent=1' : 'error=1') . '#contact');
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /#contact');
    exit;
}

// Honeypot: real visitors never fill this in. Pretend success so bots move on.
if (!empty($_POST['website'])) {
    finish(true, '', $wantsJson);
}

// Strip line breaks from single-line fields to prevent email header injection.
$name    = trim(preg_replace('/[\r\n]+/', ' ', $_POST['name'] ?? ''));
$email   = trim(preg_replace('/[\r\n]+/', '', $_POST['email'] ?? ''));
$message = trim($_POST['message'] ?? '');

if ($name === '' || mb_strlen($name) > 100) {
    finish(false, 'Enter your name (up to 100 characters).', $wantsJson, 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 200) {
    finish(false, 'Enter a valid email address.', $wantsJson, 422);
}
if (mb_strlen($message) < 10 || mb_strlen($message) > 5000) {
    finish(false, 'Write a message between 10 and 5000 characters.', $wantsJson, 422);
}

$subject = 'New message from kingpra.com: ' . $name;
$body = "Name: $name\nEmail: $email\n\n$message\n";
$headers = [
    'From: kingpra.com <' . $from . '>',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion(),
];

if (mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers))) {
    finish(true, '', $wantsJson);
}
finish(false, "The message didn't send. Email info@kingpra.com instead.", $wantsJson, 500);
