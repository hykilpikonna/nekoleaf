#!/bin/bash

# Stop on error
set -e

F=docker-compose.build.yml

# Start image cache server so that you don't have to re-download the image for rebuilding
# docker-compose build texlive-image
docker-compose -f $F up texlive-image -d

# Build base image
docker-compose -f $F build nekoleaf-base

# Build nekoleaf
docker-compose -f $F build nekoleaf

# Stop image cache server
docker-compose -f $F stop texlive-image