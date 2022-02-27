#!/usr/bin/env bash
set -eu -o pipefail

echo -en "OAUTH_CALLBACK=https://3000-${GITPOD_WORKSPACE_ID}.${GITPOD_WORKSPACE_CLUSTER_HOST}/callback\nOAUTH_CLIENT_ID=${GITPOD_INSTANCE_ID}" > .env
