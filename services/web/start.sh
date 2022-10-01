#!/bin/bash
export WEB_API_USER=me@example.com
export WEB_API_PASSWORD=qwq
export REDIS_HOST=localhost
export QUEUES_REDIS_HOST=localhost
export ANALYTICS_QUEUES_REDIS_HOST=localhost
export MONGO_URL=mongodb://localhost/sharelatex
export SHARELATEX_ALLOW_PUBLIC_ACCESS=true
npm run start | bunyan