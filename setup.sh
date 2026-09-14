#!/bin/bash

set -e

INSTALL_DIR=/opt/netwatch
PORTS=(5353 8443)

sudo apt update
sudo apt install -y nginx nodejs python3 python3-pip python3-venv npm

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
    echo "File .env created. You can edit secret key in $INSTALL_DIR"
fi

sudo cp config/netwatch.nginx /etc/nginx/sites-available/netwatch
sudo ln -sf /etc/nginx/sites-available/netwatch /etc/nginx/sites-enabled/
sudo systemctl restart nginx

sudo cp config/netwatch.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable netwatch
sudo systemctl start netwatch

echo "Setting firewall..."
if command -v firewall-cmd &> /dev/null && systemctl is-active --quiet firewalld; then
    for p in "${PORTS[@]}"; do
        firewall-cmd --permanent --add-port=${p}/tcp
        firewall-cmd --permanent --add-port=${p}/udp
    done
    firewall-cmd --reload

elif command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
    for p in "${PORTS[@]}"; do ufw allow ${p}; done

elif command -v nft &> /dev/null; then
    nft add table inet netwatch 2>/dev/null || true
    nft add chain inet netwatch input { type filter hook input priority 0 \; } 2>/dev/null || true
    for p in "${PORTS[@]}"; do
        nft add rule inet netwatch input tcp dport $p accept
        nft add rule inet netwatch input udp dport $p accept
    done

elif command -v iptables &> /dev/null; then
    for p in "${PORTS[@]}"; do
        iptables -C INPUT -p tcp --dport $p -j ACCEPT 2>/dev/null || \
            iptables -A INPUT -p tcp --dport $p -j ACCEPT

        iptables -C INPUT -p udp --dport $p -j ACCEPT 2>/dev/null || \
            iptables -A INPUT -p udp --dport $p -j ACCEPT
    done
    command -v netfilter-persistent &> /dev/null && netfilter-persistent save
fi