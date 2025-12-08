#!/bin/bash
if [[ -z $1 ]]; then
    cd "$(dirname "$0")/.."
    yarn build:apps
    version=$(./scripts/getCurrentVersion.sh)

    docker build \
    -f hosting/single/Dockerfile \
    -t budibase:latest \
    --build-arg BUDIBASE_VERSION=$version \
    --build-arg TARGETBUILD=single \
    .
else
    yarn run clear

    yarn install --cache-folder /tmp/.yarn-cache
    yarn build:apps

    if [ -f ./crack.js ]; then
        node ./crack.js
    fi

    version=$(./scripts/getCurrentVersion.sh)
    package_version=$(./scripts/getPackageVersion.sh)

    docker build -f hosting/single/Dockerfile -t akrasnov87/budibase:$package_version --build-arg BUDIBASE_VERSION=$version --build-arg TARGETBUILD=single .
    size=$(docker image inspect akrasnov87/budibase:$package_version --format='{{.Size}}' | numfmt --to=iec)
    echo "build finished akrasnov87/budibase:$package_version (size: $size)"
fi
