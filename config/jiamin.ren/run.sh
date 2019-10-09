#!/usr/bin/env bash

cp /root/blog/config/jiamin.ren/nginx.conf /etc/nginx/sites-enabled/default
cp -r /root/blog/build/* /usr/share/nginx/html/

nginx