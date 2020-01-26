#!/usr/bin/env bash
# Script to download per-state city FIPS codes.

regex='^([0-9]*?)\|([A-Z]*?)\|.*$'
prefix='https://www2.census.gov/geo/docs/reference/codes/files/st'
suffix='_places.txt'

while read line; do
  echo $line
  if [[ $line =~ $regex ]]; then
    url=$prefix
    i=1
    n=${#BASH_REMATCH[*]}
    while [[ $i -lt $n ]]
    do
      capture=${BASH_REMATCH[$i]}
      capture=$(echo "$capture" | tr '[:upper:]' '[:lower:]')
    	echo "  capture[$i]: $capture"
      url="${url}${capture}"
      if [[ $i -eq 1 ]]; then
        url="${url}_"
      fi
    	let i++
    done 
    url="${url}${suffix}"
    echo $url
    wget $url
	fi
done < state.txt
