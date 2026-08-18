<?php

/**
 * @file
 * Shared helper functions for quickstart's DevTools scripts.
 *
 * Adapted from the `.devtools/` pattern in `packages/druxtjs/docs/drupal/`
 * (branch `feature/docs-drupal-local-php`), itself modelled on
 * `stuart-clark/stuar.tc` / `AlexSkrypnyk/drupal_extension_scaffold`),
 * for a full site checkout: no `build/` directory, no `composer
 * create-project` scaffolding step — `drupal/` already IS the site
 * codebase.
 *
 * Key difference from the docs/drupal reference: the dotenv file lives at
 * the repo root (`../.env` relative to `drupal/`), not in the current
 * directory, because it's shared between the Drupal backend and the Nuxt
 * frontend.
 *
 * @phpcs:disable Drupal.NamingConventions.ValidFunctionName.InvalidName
 */

declare(strict_types=1);

namespace QuickstartDevTools;

/**
 * Get environment variable with fallback and default value.
 */
function getenv_default(mixed ...$vars): string {
  if (count($vars) < 2) {
    throw new \InvalidArgumentException('getenv_default() requires at least 2 arguments: one or more variable names and a default value');
  }

  $default = array_pop($vars);

  foreach ($vars as $var) {
    $value = is_string($var) ? getenv($var) : $default;
    if ($value !== FALSE && is_string($value) && $value !== '') {
      return $value;
    }
  }

  return is_string($default) ? $default : '';
}

/**
 * Read variables from a dotenv-style file into an associative array.
 *
 * @param string $file
 *   Path to the dotenv file.
 *
 * @return array<string, string>
 *   Associative array of key-value pairs.
 */
function dotenv_read(string $file = '../.env'): array {
  if (!file_exists($file)) {
    return [];
  }

  $contents = file_get_contents($file);
  if ($contents === FALSE) {
    return [];
  }

  $vars = [];
  foreach (preg_split('/\r\n|\r|\n/', $contents) ?: [] as $line) {
    $trimmed = trim($line);
    if ($trimmed === '' || str_starts_with($trimmed, '#') || !str_contains($trimmed, '=')) {
      continue;
    }

    [$key, $value] = explode('=', $trimmed, 2);
    $key = trim($key);
    $value = trim($value);

    if ($key === '') {
      continue;
    }

    if (strlen($value) >= 2) {
      $first = $value[0];
      $last = $value[strlen($value) - 1];
      if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
        $value = substr($value, 1, -1);
      }
    }

    $vars[$key] = $value;
  }

  return $vars;
}

/**
 * Set or update a variable in a dotenv-style file.
 */
function dotenv_write_var(string $key, string $value, string $file = '../.env'): void {
  $assignment = sprintf('%s=%s', $key, $value);

  if (!file_exists($file)) {
    if (file_put_contents($file, $assignment . PHP_EOL) === FALSE) {
      FAIL('Unable to write %s', $file);
    }

    return;
  }

  $contents = file_get_contents($file);
  if ($contents === FALSE) {
    FAIL('Unable to read %s', $file);

    // @codeCoverageIgnoreStart
    return;
    // @codeCoverageIgnoreEnd
  }

  $lines = preg_split('/\r\n|\r|\n/', $contents) ?: [];
  $trailing_newline = $contents !== '' && (str_ends_with($contents, "\n") || str_ends_with($contents, "\r"));
  if ($trailing_newline && end($lines) === '') {
    array_pop($lines);
  }

  $replace_index = NULL;
  foreach ($lines as $i => $line) {
    $trimmed = trim($line);
    if ($trimmed === '' || str_starts_with($trimmed, '#') || !str_contains($trimmed, '=')) {
      continue;
    }

    [$existing_key] = explode('=', $trimmed, 2);
    if (trim($existing_key) === $key) {
      $replace_index = $i;
    }
  }

  if ($replace_index === NULL) {
    $lines[] = $assignment;
  }
  else {
    $lines[$replace_index] = $assignment;
  }

  if (file_put_contents($file, implode(PHP_EOL, $lines) . PHP_EOL) === FALSE) {
    FAIL('Unable to write %s', $file);
  }
}

/**
 * Resolve an environment value from env, then dotenv, then default.
 *
 * @return array{0: string, 1: string}
 *   Tuple of [value, source].
 */
function resolve_env_value(string $name, string $default, string $dotenv_file = '../.env'): array {
  $env = getenv($name);
  if ($env !== FALSE && $env !== '') {
    return [$env, 'env'];
  }

  $dotenv = dotenv_read($dotenv_file);
  if (isset($dotenv[$name]) && $dotenv[$name] !== '') {
    return [$dotenv[$name], $dotenv_file];
  }

  return [$default, 'default'];
}

/**
 * Resolve the webserver host and port with source tracking.
 *
 * @return array{host: string, host_source: string, port: string, port_source: string}
 */
function resolve_webserver(bool $auto_discover = FALSE, bool $validate_port = TRUE, string $dotenv_file = '../.env'): array {
  [$host, $host_source] = resolve_env_value('WEBSERVER_HOST', '127.0.0.1', $dotenv_file);

  $default_port = $auto_discover ? '' : '8888';
  [$port, $port_source] = resolve_env_value('WEBSERVER_PORT', $default_port, $dotenv_file);

  if ($auto_discover && $port_source === 'default') {
    $port = (string) find_free_port();
    dotenv_write_var('WEBSERVER_PORT', $port, $dotenv_file);
    $port_source = $dotenv_file;
  }

  if ($validate_port) {
    validate_port_or_fail($port, 'WEBSERVER_PORT');
  }

  return [
    'host' => $host,
    'host_source' => $host_source,
    'port' => $port,
    'port_source' => $port_source,
  ];
}

/**
 * Detect the XDebug state of the dev server listening on the given port.
 */
function xdebug_state(string $port): string {
  $cmd = sprintf('ps -o command= -p "$(lsof -ti:%s 2>/dev/null | head -1)" 2>/dev/null', escapeshellarg($port));
  $out = trim((string) @shell_exec($cmd));
  if ($out === '') {
    return '-';
  }

  return str_contains($out, 'xdebug.mode=debug') ? 'enabled' : 'disabled';
}

/**
 * Validate that a value is a TCP port in the range 1-65535.
 */
function validate_port_or_fail(string $value, string $source): void {
  if (!ctype_digit($value) || (int) $value < 1 || (int) $value > 65535) {
    FAIL('Invalid %s "%s". Expected integer in range 1-65535.', $source, $value);
  }
}

/**
 * Find a free TCP port by scanning a range of ports.
 */
function find_free_port(int $start = 8888, int $max_attempts = 100): int {
  if ($start < 1 || $start > 65535) {
    FAIL('Start port must be between 1 and 65535, got %d', $start);
  }
  if ($max_attempts < 1) {
    FAIL('Max attempts must be a positive integer, got %d', $max_attempts);
  }

  // Never scan past the maximum valid TCP port.
  $last = min(65535, $start + $max_attempts - 1);
  for ($port = $start; $port <= $last; $port++) {
    $conn = @stream_socket_client(sprintf('tcp://localhost:%d', $port), $errno, $errstr, 0.2);
    if ($conn === FALSE) {
      return $port;
    }
    fclose($conn);
  }

  FAIL('Unable to find a free port in range %d-%d', $start, $last);

  // @codeCoverageIgnoreStart
  return $start;
  // @codeCoverageIgnoreEnd
}

/**
 * Stop the dev webserver started by .devtools/start.
 *
 * Prefers the pidfile written at start time so only the exact process we
 * started is signalled - the port may have been reused by an unrelated
 * service in the meantime. Falls back to lsof for servers started before
 * the pidfile existed (or via WEBSERVER_PORT changes).
 */
function stop_webserver(string $port): void {
  $pid_file = server_pid_file();

  if (is_file($pid_file)) {
    $pid = trim((string) file_get_contents($pid_file));
    if ($pid !== '' && ctype_digit($pid)) {
      // A stale pidfile can name a PID the OS has since reused for an
      // unrelated process - only signal it if it still looks like the
      // PHP dev server this tooling started.
      $command = trim((string) @shell_exec(sprintf('ps -p %d -o command= 2>/dev/null', (int) $pid)));
      if ($command !== '' && str_contains($command, 'php') && str_contains($command, '-S')) {
        @exec(sprintf('kill -9 %d 2>/dev/null', (int) $pid));
      }
    }
    @unlink($pid_file);
  }

  // The pidfile can go stale - e.g. a server left running from an earlier
  // session, or a pidfile write that raced with the process it names.
  // Whatever is still bound to our own dev port after the step above is
  // safe to reclaim: it is a loopback dev server this tooling owns.
  @passthru(sprintf('lsof -ti:%s | xargs kill -9 2>/dev/null', escapeshellarg($port)));
}

/**
 * Path of the pidfile tracking the dev webserver process.
 */
function server_pid_file(): string {
  // Unique per checkout: a fixed name is shared by every clone of this
  // repo on the machine, letting one checkout's `stop` kill another
  // checkout's server (the pidfile written last wins). cwd is stable
  // here - every .devtools script runs from drupal/.
  return sprintf('/tmp/quickstart-drupal-php-server-%s.pid', substr(md5((string) getcwd()), 0, 8));
}

/**
 * Output a note message.
 */
function NOTE(string $format, string|int|float ...$args): void {
  echo sprintf('       %s%s', sprintf($format, ...$args), PHP_EOL);
}

/**
 * Output a task message.
 */
function TASK(string $format, string|int|float ...$args): void {
  echo term_supports_color() ?
    "\033[34m[TASK] " . sprintf($format, ...$args) . "\033[0m\n" :
    sprintf('[TASK] %s%s', sprintf($format, ...$args), PHP_EOL);
}

/**
 * Output an info message.
 */
function INFO(string $format, string|int|float ...$args): void {
  echo term_supports_color() ?
    "\033[36m[INFO] " . sprintf($format, ...$args) . "\033[0m\n" :
    sprintf('[INFO] %s%s', sprintf($format, ...$args), PHP_EOL);
}

/**
 * Output a success message.
 */
function PASS(string $format, string|int|float ...$args): void {
  echo term_supports_color() ?
    "\033[32m[ OK ] " . sprintf($format, ...$args) . "\033[0m\n" :
    sprintf('[ OK ] %s%s', sprintf($format, ...$args), PHP_EOL);
}

/**
 * Output a failure message and exit(1).
 */
function FAIL(string $format, string|int|float ...$args): void {
  FAIL_NO_EXIT($format, ...$args);
  quit(1);
}

/**
 * Output a failure message without exiting.
 */
function FAIL_NO_EXIT(string $format, string|int|float ...$args): void {
  echo term_supports_color() ?
    "\033[31m[FAIL] " . sprintf($format, ...$args) . "\033[0m\n" :
    sprintf('[FAIL] %s%s', sprintf($format, ...$args), PHP_EOL);
}

/**
 * Check if the terminal supports colors.
 */
function term_supports_color(): bool {
  return getenv('TERM') === 'dumb' || getenv('TERM') === FALSE ? FALSE : function_exists('posix_isatty') && @posix_isatty(STDOUT);
}

/**
 * Get the path to a command, or FALSE if the command does not exist.
 */
function command_path(string $command): string|false {
  if (!preg_match('/^[A-Za-z0-9_\-]+(?: [A-Za-z0-9_\-]+)*$/', $command)) {
    return FALSE;
  }
  exec(sprintf('command -v %s 2>/dev/null', $command), $output, $code);
  return $code === 0 && !empty($output[0]) ? trim($output[0]) : FALSE;
}

/**
 * Require a command to be available, or fail.
 */
function command_must_exist(string $command): void {
  if (!command_path($command)) {
    FAIL("Command '%s' is not available", $command);
  }
}

/**
 * Run a command via passthru, failing if exit code is non-zero.
 */
function passthru_or_fail(string $cmd, string $format = '', string|int|float ...$args): void {
  passthru($cmd, $exit_code);
  if ($exit_code !== 0) {
    if ($format !== '') {
      FAIL($format, ...$args);
    }
    quit($exit_code);
  }
}

/**
 * Run a drush command against this site's `web/` docroot.
 *
 * @param string $command
 *   The drush command, optionally with sprintf-style placeholders.
 * @param string|string[]|null $args
 *   Arguments to substitute into the command. Each is escaped with
 *   escapeshellarg() before substitution.
 * @param int|null &$exit_code
 *   If provided, the exit code is stored here and failures do not exit
 *   the script. If not provided, non-zero exit codes call FAIL().
 *
 * @param-out int $exit_code
 */
function drush(string $command, mixed $args = NULL, ?int &$exit_code = NULL): string {
  if (is_string($args)) {
    $args = [$args];
  }

  if (is_array($args) && $args !== []) {
    $command = sprintf($command, ...array_map(escapeshellarg(...), $args));
  }

  $exit_code_provided = $exit_code !== NULL;
  $exit_code = 0;

  // Drupal installs can exceed PHP's default 128M memory_limit.
  putenv('PHPRC=' . __DIR__ . '/etc/php.ini');
  $command = 'vendor/bin/drush -r ' . escapeshellarg(getcwd() . '/web') . ' -y ' . $command;

  ob_start();
  passthru($command, $exit_code);
  $output = ob_get_clean();

  if (!$exit_code_provided && $exit_code !== 0) {
    FAIL('Drush command failed: %s', $command);
  }

  return $output ?: '';
}

/**
 * Check if debug mode is enabled.
 */
function is_debug(): bool {
  return getenv('DEBUG') === '1';
}

// Never run the real quit() during tests.
// @codeCoverageIgnoreStart
if (!function_exists('QuickstartDevTools\quit') && !class_exists('PHPUnit\\Framework\\TestCase')) {

  /**
   * Exit script with given code.
   */
  function quit(int $code = 0): void {
    exit($code);
  }

}
// @codeCoverageIgnoreEnd
