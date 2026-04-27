#!/bin/bash
# Fecha rondas abertas há mais de 24h sem atividade.
# Adicionar ao crontab: 0 * * * * CRON_SECRET=segredo /path/to/scripts/expirar-rondas.sh >> /var/log/rondas-expirar.log 2>&1
curl -s -X POST http://localhost:3000/api/rondas/expirar \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -o /dev/null -w "%{http_code}\n"
