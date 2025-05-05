#!/bin/bash
rm -r ./node_modules
rm -rf ./.nx
yarn install
yarn
yarn build
if [ -f ./crack.js ]; then
    node ./crack.js
fi
version=$(./scripts/getCurrentVersion.sh)
package_version=$(./scripts/getPackageVersion.sh)

echo "processing node_modules..."
rm -r .node_modules
cp -L -r node_modules .node_modules

echo "processing build..."
docker build -f hosting/single/Undeground.Dockerfile -t akrasnov87/budibase:$package_version --build-arg BUDIBASE_VERSION=$version --build-arg TARGETBUILD=single .
echo "build finished akrasnov87/budibase:$package_version"