#!/usr/bin/env bash
#
# Dev container setup. The official PHP feature (ghcr.io/devcontainers/
# features/php) builds PHP from source with no "extensions" option -
# gd isn't compiled in at all, and sodium is compiled but left disabled
# (--with-sodium=shared, never enabled via ini). Both are hard
# requirements here: Drupal core needs gd (its own installer checks
# this independently of Composer, regardless of any composer.json
# platform override), and simple_oauth's JWT signing needs sodium.
set -euo pipefail

echo "==> Installing system dependencies"
sudo apt-get update
# python3-setuptools: trixie ships Python 3.13, which dropped the
# distutils stdlib module entirely - old node-gyp (bundled with this
# repo's pinned Node 16's npm) still imports it, and setuptools ships a
# compatible shim. Same fix this project's own CI pipeline already
# needed for the same reason.
sudo apt-get install -y python3 python3-setuptools build-essential libjpeg-dev libpng-dev libwebp-dev libfreetype-dev zlib1g-dev

CONF_DIR=$(php --ini | grep 'Scan for additional .ini files' | sed 's/.*: *//')

echo "==> Enabling sodium (compiled by the PHP feature, but left disabled)"
echo 'extension=sodium' | sudo tee "$CONF_DIR/sodium.ini" > /dev/null

echo "==> Building gd (not compiled in by the PHP feature at all)"
# gd is not a real standalone PECL package for current PHP versions -
# it is a bundled core extension that only gets built via a configure
# flag (--with-jpeg/--with-webp/--with-freetype) during PHP's own
# compile. `pecl install gd` fails with "No releases available" even
# with a fully up-to-date channel, because there is nothing there to
# install. Build ext/gd directly from PHP's own source tree instead -
# the same technique the PHP feature itself uses as its xdebug fallback.
PHP_FULL_VERSION=$(php -r 'echo PHP_VERSION;')
GD_BUILD_DIR="/tmp/php-gd-build"
rm -rf "$GD_BUILD_DIR"
mkdir -p "$GD_BUILD_DIR"
curl -fsSL "https://www.php.net/distributions/php-${PHP_FULL_VERSION}.tar.gz" -o /tmp/php-src.tar.gz
tar -xzf /tmp/php-src.tar.gz -C "$GD_BUILD_DIR" --strip-components=3 "php-${PHP_FULL_VERSION}/ext/gd"
(
  cd "$GD_BUILD_DIR"
  phpize
  ./configure --with-jpeg --with-webp --with-freetype
  make -j"$(nproc)"
  make install
)
rm -rf "$GD_BUILD_DIR" /tmp/php-src.tar.gz
echo 'extension=gd' | sudo tee "$CONF_DIR/gd.ini" > /dev/null

# Fail fast if the gd build above didn't actually take - composer and
# Drupal's installer both hard-require it, and a broken build surfacing
# here beats a confusing failure mid-provision.
php -r "exit(extension_loaded('gd') ? 0 : 1);" || { echo "gd extension failed to load" >&2; exit 1; }

echo "==> Trusting this repo's mise.toml"
mise trust

echo "==> Running npm install (triggers the full setup pipeline)"
# --loglevel=error: the root devDependencies are lint tooling that
# requires Node 22 (CI runs them there); installing them under the
# app's pinned Node 16 works fine but emits a wall of EBADENGINE
# warnings that drowns the real setup output on first run.
npm install --loglevel=error
