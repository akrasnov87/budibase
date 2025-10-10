#!/bin/bash

yarn run clean

if [[ -f "./license.txt" ]]; then
    rm ./license.txt
fi

if [[ -f "./lerna-debug.log" ]]; then
    rm ./lerna-debug.log
fi

if [[ -f "./docker-error.log" ]]; then
    rm ./docker-error.log
fi

if [[ -f "./package-json.lock" ]]; then
    rm ./package-json.lock
fi

if [[ -d "./node_modules" ]]; then
    rm -r ./node_modules
fi

if [[ -d "./.node_modules" ]]; then
    rm -r ./.node_modules
fi

if [[ -d "./.nx" ]]; then
    rm -rf ./.nx
fi
