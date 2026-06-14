set -e

sudo apt update
sudo apt install -y nginx nodejs python3 python3-pip python3-venv

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd web
npm install
npm run build
sudo cp -r build/* /var/www/html/
cd ..

sudo cp config/netwatch.nginx /etc/nginx/sites-available/netwatch
sudo ln -sf /etc/nginx/sites-available/netwatch /etc/nginx/sites-enabled/
sudo systemctl restart nginx

sudo cp config/netwatch.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable netwatch
sudo systemctl start netwatch
