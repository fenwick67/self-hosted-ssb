#!/bin/bash
# Uses the most HXC build method: Just fracking cat the files

# build the JS

echo '' > public/js/bundle.js

find public/js/component/ -type f | xargs cat >> public/js/bundle.js

cat public/js/index.js >> public/js/bundle.js

# css

sass publicSrc/chillma.scss > public/css/bulma.css

echo "ok"
exit 0
