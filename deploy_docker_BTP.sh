#!/bin/sh

# git clone https://github.com/SAP/migration-tool-for-cloud-integration.git --depth 1
# cd migration-tool-for-cloud-integration
# chmod 755 deploy_docker_BTP.sh

DOCKER_USER="my_user"
DOCKER_REPO="my_repo"
DOCKER_TAG="migrationtool"

BTP_API="https://api.cf.eu10.hana.ondemand.com"
BTP_USER="email@company.com"
BTP_ORG="my-org"
BTP_SPACE="dev"

echo .
echo .
echo Please provide DOCKER HUB credentials:
docker login -u "$DOCKER_USER"

echo .
echo .
echo Please provide SAP BTP credentials:
cf login -a $BTP_API -u "$BTP_USER" -o "$BTP_ORG" -s "$BTP_SPACE"

echo .
echo .
echo Building DOCKER:
rm package-lock.json
docker build -t $DOCKER_USER/$DOCKER_REPO:$DOCKER_TAG ./

echo .
echo .
echo Pushing DOCKER:
docker push $DOCKER_USER/$DOCKER_REPO:$DOCKER_TAG

echo .
echo .
echo Pushing docker to BTP:
cf push migrationtool_docker --no-manifest --memory 256M --random-route --docker-image $DOCKER_USER/$DOCKER_REPO:$DOCKER_TAG --docker-username "$DOCKER_USER"

echo .
echo .
echo FINISHED.
echo To retrieve the logs of the application use:
echo $ cf logs migrationtool_docker | grep -v RTR
