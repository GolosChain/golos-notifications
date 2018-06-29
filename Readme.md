# Golos notification service (рабочее название)

Сервис рассылки нотификаций для пользователей.

Имеет несколько функций: 
  - Рассылка нотификаций в реальном времени для пользователей онлайн.
  - Рассылка WebPush нотификаций для пользователей вне сайта, но с включенным браузером (PC/Mobile).
  - Рассылка Android/IOs нотификаций в приложениях.
  - Рассылка Android/IOs Push нотификаций в приложениях в режиме offline.
  - Предусмотренна техническая возможность рассылки любых других нотификаций, например на email.
  - Хранение истории нотификаций в течении указанного количества времени.
  - Реагирование на настройки пользователей относительно пожеланий к рассылке.

Описание возможных `ENV`:  

  - `EXPIRATION` - время, через которое нотификация становится устаревшей и удаляется из истории.  
   Дефолтное значение - `2592000000` (1 месяц).
  
  - `DAY_START` - время начала нового дня в часах относительно UTC.  
   Дефолтное значение - `3` (день начинается в 00:00 по Москве).     
  
  - `MONGO_CONNECT_STRING` - строка подключения к базе MongoDB.  
   Дефолтное значение - `mongodb://0.0.0.0/admin`
   
  - `BLOCKCHAIN_SUBSCRIBE_TIMEOUT` - таймаут подписки на новые блоки, срабатывает если за это время от блокчейн-ноды не пришло ни единого блока.  
   Дефолтное значение - `60000`, что равно одной минуте.
   
  - `BLOCKCHAIN_NODE_ADDRESS` - адрес блокчейн-ноды для прослушивания.  
   Дефолтное значение - `wss://ws.golos.io` 
   
  - `METRICS_HOST` - адрес хоста для метрик StatsD.  
   Дефолтное значение - `localhost` 
  
  - `METRICS_PORT` - адрес порта для метрик StatsD.  
   Дефолтное значение - `8125` 

Установка и запуск:
  
  - `docker compose up`  
