#!/bin/bash

sdk=../dojo
ver=`head -1 ../VERSION.txt`

# Path where to find 
# - InitBookmarklet.js
# - dojo/ folder with the compiled bookmarklet
# - css/ folder
## WITHOUT trailing slash (/)
bmpath=https://rawgit.com/apsdehal/WikidataAnnotationFeeder/master/Pundit

###########################################
### Dont touch anything below this line ###
###########################################

currentpwd=`pwd`

# echo "Building Pundit ${ver} Bookmarklet in ${currentpwd}"
# echo "Will load itself from ${bmpath}"
# echo .

# rm -rf ${currentpwd}/dojo

# cd ${sdk}/util/buildscripts
# ./build.sh action=release profileFile=${currentpwd}/bookmarklet.profile.js loader=xdomain version=${ver} releaseDir=${currentpwd} cssOptimize=comments.keepLines optimize=shrinksafe.keepLines
# cd ${currentpwd}
# mv dojo foo
# mkdir dojo
# mv foo/dojo/dojo.xd.js dojo
# mv foo/dojo/Bookmarklet.xd.js dojo
# mkdir dojo/nls
# mv foo/dojo/nls/Bookmarklet*.xd.js dojo/nls
# mv foo/dojo/resources dojo
# rm -rf foo

echo "Preparing InitBookmarklet.js for ${bmpath}"
sed "s%{bm-abs-path}%${bmpath}%g" InitBookmarklet.js-template > ../src/InitBookmarklet.js
echo .

echo "Preparing examples/bookmarklet.html for ${bmpath}"
sed "s%{bm-abs-path}%${bmpath}%g" ../examples/bookmarklet.html-template > ../examples/bookmarklet.html
echo .


echo .
echo "Wikidata Web Annotator bookmarklet build is ready at ${currentpwd}/dojo"