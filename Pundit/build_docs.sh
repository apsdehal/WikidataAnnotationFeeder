#!/bin/sh

# The version of your project to display within the documentation.
v=`/usr/bin/head -1 VERSION.txt`

pname="PUNDIT Project $v"

echo "Use '$0 lint' to double check your comments"

runtype="${1:-build}"
rm -f yuidoc.json
sed "s%{pundit-version}%${pname}%g" yuidoc.json-template > yuidoc.json

if [ $runtype == 'build' ] 
    then
    echo "Building the docs : \n\n"; 
    yuidoc
fi

if [ $runtype == 'lint' ] 
then
    echo "Linting your code : \n\n";
    yuidoc --lint
    if [ $? -eq 0 ]
    then
        echo "No errors found in the comments. Congratulations!"; 
    fi
fi

rm -f yuidoc.json