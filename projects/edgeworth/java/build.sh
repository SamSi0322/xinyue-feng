#!/bin/sh
# Build "The Adventures of Edgeworth".
#
#   ./build.sh         compile the game into out/classes
#   ./build.sh jar     ...and package the runnable The_Adventures_of_Edgeworth.jar
#   ./build.sh test    ...and run the headless smoke test (test/SmokeTest.java)
#
# Needs a JDK, version 8 or newer. Uses $JAVA_HOME/bin if JAVA_HOME is set,
# otherwise javac/jar/java from the PATH.
set -e
cd "$(dirname "$0")"

case "$1" in
  ""|jar|test) ;;
  *) echo "usage: $0 [jar|test]" >&2; exit 2 ;;
esac

if [ -n "$JAVA_HOME" ]; then
  JAVAC="$JAVA_HOME/bin/javac"; JAR="$JAVA_HOME/bin/jar"; JAVA="$JAVA_HOME/bin/java"
else
  JAVAC=javac; JAR=jar; JAVA=java
fi

# Emit Java 8 class files, so the game runs on Java 8 and on every newer Java.
if "$JAVAC" --release 8 -version >/dev/null 2>&1; then
  TARGET="--release 8 -Xlint:-options"   # JDK 9+ (-Xlint:-options hides "release 8 is obsolete")
elif "$JAVAC" -version 2>&1 | grep -q '^javac 1\.'; then
  TARGET="-source 1.8 -target 1.8"       # JDK 8 has no --release option
else
  TARGET=""                              # a JDK that can no longer emit Java 8: build for itself
fi

rm -rf out/classes
mkdir -p out/classes
"$JAVAC" $TARGET -encoding UTF-8 -d out/classes src/The_Adventuresof_Edgeworth/*.java
echo "Compiled the game into out/classes"

if [ "$1" = "jar" ]; then
  # classes and the contents of res/ (images, Music/) both go to the root of the JAR
  rm -f The_Adventures_of_Edgeworth.jar
  "$JAR" cfe The_Adventures_of_Edgeworth.jar The_Adventuresof_Edgeworth.MyFrame -C out/classes . -C res .
  echo "Packaged The_Adventures_of_Edgeworth.jar (start it with ./run.sh)"
fi

if [ "$1" = "test" ]; then
  case "$(uname -s)" in
    CYGWIN*|MINGW*|MSYS*) SEP=';' ;;   # Windows Java under Git Bash / Cygwin
    *) SEP=':' ;;
  esac
  rm -rf out/test-classes
  mkdir -p out/test-classes
  "$JAVAC" $TARGET -encoding UTF-8 -cp out/classes -d out/test-classes test/SmokeTest.java
  "$JAVA" -Djava.awt.headless=true -cp "out/test-classes${SEP}out/classes${SEP}res" SmokeTest
fi
