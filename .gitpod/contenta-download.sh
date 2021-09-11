#!/usr/bin/env bash
set -eu -o pipefail

CONTENTA_DIR="${GITPOD_REPO_ROOT}/contenta"

# Download contenta
php -r "readfile('https://raw.githubusercontent.com/contentacms/contenta_jsonapi_project/8.x-2.x/scripts/download.sh');" > download-contentacms.sh
chmod a+x download-contentacms.sh
./download-contentacms.sh $CONTENTA_DIR
