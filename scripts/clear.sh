#!/bin/bash

yarn run clean

rm ./license.txt
rm ./lerna-debug.log
rm ./docker-error.log
rm ./package-json.lock
rm -r ./node_modules
rm -r ./.node_modules
rm -rf ./.nx