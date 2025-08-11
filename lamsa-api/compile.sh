#!/bin/bash
# Temporary compilation script to work around the mysterious "2" issue
exec ./node_modules/.bin/tsc "$@"