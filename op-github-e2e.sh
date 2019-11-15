#!/bin/bash

mkdir ~/.ssh/
touch ~/.ssh/config

cat <<EOT >> ~/.ssh/config
Host *
   StrictHostKeyChecking no
   UserKnownHostsFile=/dev/null
EOT

export DEBIAN_FRONTEND=noninteractive

apt update

echo 'y' |  apt install apt-utils

echo 'y' |  apt install sshpass

sshpass -p ${MAC_STADIUM_PASS} ssh -o stricthostkeychecking=no administrator@${MAC_ADDRESS} /Users/administrator/ci_github_script.sh
