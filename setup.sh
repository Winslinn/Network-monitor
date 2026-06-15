#!/bin/bash

set -e

INSTALL_DIR=/opt/netwatch

sudo apt update
sudo apt install -y nginx nodejs python3 python3-pip python3-venv

python3 -m venv $INSTALL_DIR/venv
$INSTALL_DIR/venv/bin/pip install -r $INSTALL_DIR/requirements.txt

cd $INSTALL_DIR/web
npm install
npm run build
sudo cp -r build/* /var/www/html/
cd $INSTALL_DIR

if [ ! -f $INSTALL_DIR/.env ]; then
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    cat > $INSTALL_DIR/.env << EOF
PROJECT_ROOT=$INSTALL_DIR
SECRET_KEY=$SECRET_KEY
ALGORITHM=HS256
EOF
fi

sudo cp config/netwatch.nginx /etc/nginx/sites-available/netwatch
sudo ln -sf /etc/nginx/sites-available/netwatch /etc/nginx/sites-enabled/
sudo systemctl restart nginx

sudo cp config/netwatch.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable netwatch
sudo systemctl start netwatch