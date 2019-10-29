#!/bin/bash

# #set -e -u
# #
# mkdir ~/.ssh/
# touch ~/.ssh/config

# cat <<EOT >> ~/.ssh/config
# Host *
#    StrictHostKeyChecking no
#    UserKnownHostsFile=/dev/null
# EOT
# #
# #eval `ssh-agent -s`
# #ssh-add <(echo "${SSH_PRIVATE_KEY}")
# #
# #git config --global url."ssh://git@git.cto.ai:2224/ops/".insteadOf "https://git.cto.ai/ops/"


# export DEBIAN_FRONTEND=noninteractive

# apt update

# #echo 'y' |  apt install dialog

# echo 'y' |  apt install apt-utils

# echo 'y' |  apt install sshpass

# echo "DDD"

# sshpass -p ${MAC_STADIUM_PASS} ssh -o stricthostkeychecking=no administrator@${MAC_ADDRESS} /Users/administrator/ci_github_script.sh

npm i -g install @cto.ai/ops
cd /op-github-repo
npm install 
npm test

./ci_github_script.sh