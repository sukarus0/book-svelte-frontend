#!/bin/bash

grep \"start\" package.json | grep "\-\-host 0.0.0.0" >> /dev/null

if [ $? -ne 0 ]; then
        echo 'You must add --host 0.0.0.0 to package.json file. ex) "start": "sirv public --no-cleari --host 0.0.0.0"'
        exit 1
fi

grep \"start\" package.json | grep "\-\-single" >> /dev/null

if [ $? -ne 0 ]; then
        echo 'You must add --single to package.json file, for tinro rouing. ex) "start": "sirv public --no-cleari --host 0.0.0.0 --single"'
        exit 1
fi

npm run dev
