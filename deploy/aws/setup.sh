#!/usr/bin/env bash
# Bootstrap скрипт для свежего EC2-инстанса (Amazon Linux 2023 / Ubuntu 22.04).
# Запускать ОТ ИМЕНИ root (`sudo bash setup.sh`).
set -euo pipefail

DETECTED_OS="unknown"
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  DETECTED_OS="${ID:-unknown}"
fi

echo "==> Detected OS: $DETECTED_OS"

install_docker_amazon() {
  dnf -y update
  dnf -y install docker git tmux htop jq postgresql15
  systemctl enable --now docker
  # Compose plugin
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -sSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  # buildx: Docker Compose v5 требует buildx ≥ 0.17 (в репозитории amzn2023 пакета нет).
  BUILDX_VER="v0.21.2"
  case "$(uname -m)" in
    x86_64) BUILDX_ARCH="amd64" ;;
    aarch64) BUILDX_ARCH="arm64" ;;
    *) echo "Unsupported arch for buildx: $(uname -m)"; exit 1 ;;
  esac
  curl -fsSL "https://github.com/docker/buildx/releases/download/${BUILDX_VER}/buildx-${BUILDX_VER}.linux-${BUILDX_ARCH}" \
    -o /usr/local/lib/docker/cli-plugins/docker-buildx
  chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
}

install_docker_ubuntu() {
  apt-get update
  apt-get install -y ca-certificates curl gnupg lsb-release git tmux htop jq postgresql-client
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
}

case "$DETECTED_OS" in
  amzn) install_docker_amazon ;;
  ubuntu|debian) install_docker_ubuntu ;;
  *) echo "Unsupported OS: $DETECTED_OS"; exit 1 ;;
esac

# Разрешаем ec2-user / ubuntu запускать docker без sudo.
DEFAULT_USER="ec2-user"
[[ "$DETECTED_OS" == "ubuntu" || "$DETECTED_OS" == "debian" ]] && DEFAULT_USER="ubuntu"
usermod -aG docker "$DEFAULT_USER" || true

# Каталоги для перс данных (вне docker volume — удобнее бэкапить/мигрировать).
mkdir -p /opt/legalhub/{pgdata,redisdata,caddy_data,caddy_config,backups}
chown -R 999:999 /opt/legalhub/pgdata     # postgres uid в alpine
chown -R 999:999 /opt/legalhub/redisdata  # redis uid в alpine
chmod 750 /opt/legalhub

# Своп: 4GB на t3.medium спасает от OOM при `docker build`.
if ! swapon --show | grep -q "/swapfile"; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

# Включаем automatic security updates.
if [[ "$DETECTED_OS" == "amzn" ]]; then
  dnf -y install dnf-automatic
  systemctl enable --now dnf-automatic.timer || true
elif [[ "$DETECTED_OS" == "ubuntu" || "$DETECTED_OS" == "debian" ]]; then
  apt-get install -y unattended-upgrades
  dpkg-reconfigure --priority=low unattended-upgrades || true
fi

echo
echo "=========================================="
echo "Bootstrap done. Дальше:"
echo "  1) git clone https://github.com/<...>/legalhub-project-ktz.git /opt/legalhub/app"
echo "  2) cd /opt/legalhub/app/deploy/aws"
echo "  3) cp .env.prod.example .env.prod && vim .env.prod"
echo "  4) docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"
echo "=========================================="
