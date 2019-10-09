#!/usr/bin/env bash

cp /root/blog/config/renjiamin.com/nginx.conf /etc/nginx/sites-enabled/default
cp -r /root/blog/build/* /usr/share/nginx/html/

nginx