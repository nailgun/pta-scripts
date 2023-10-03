#!/bin/bash

set -euo pipefail
BASEDIR=$(dirname "$0")

# extra empty line
echo

ofx="$1"
python3 "$BASEDIR/ofx.py" \
  -a assets:tinkoff:checking:40817810800095760514=assets:tinkoff \
  -a 'expenses:Автоуслуги=expenses:Автомобиль' \
  -a 'expenses:Топливо=expenses:Автомобиль' \
  -a 'income:Топливо=expenses:Автомобиль' \
  -a 'expenses:Платная дорога=expenses:Автомобиль' \
  -a 'expenses:Фастфуд=expenses:Рестораны' \
  -a 'income:Другое=income:other' \
  -a 'expenses:Такси=expenses:Транспорт' \
  -a 'expenses:Экосистема Яндекс=expenses:other' \
  -a 'expenses:Медицина=expenses:Здоровье' \
  "$ofx"
