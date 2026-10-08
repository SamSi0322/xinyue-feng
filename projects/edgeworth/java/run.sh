#!/bin/sh
# Start "The Adventures of Edgeworth" (builds the JAR first if it is missing).
# Uses $JAVA_HOME/bin/java if JAVA_HOME is set, otherwise java from the PATH.
set -e
cd "$(dirname "$0")"

if [ ! -f The_Adventures_of_Edgeworth.jar ]; then
  sh ./build.sh jar
fi

if [ -n "$JAVA_HOME" ]; then
  JAVA="$JAVA_HOME/bin/java"
else
  JAVA=java
fi
exec "$JAVA" -jar The_Adventures_of_Edgeworth.jar "$@"
