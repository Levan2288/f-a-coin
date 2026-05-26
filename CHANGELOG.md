# CHANGELOG

Журнал изменений проекта **f-a-coin** (Военторг).

## Зачем этот файл

Этот файл — общий журнал, в который каждая сессия (Claude Code или ручная правка) записывает свои изменения. Цель: будущая сессия может за пару минут понять, **что уже было сделано**, **почему**, и **какие правки трогать осторожно**.

Это НЕ замена `git log` — это человекочитаемый журнал с **контекстом и мотивацией**, который git не хранит.

## Правила ведения

1. **Каждая сессия добавляет новую секцию сверху** (новые записи — наверх, старые — вниз).
2. Формат заголовка: `## YYYY-MM-DD — <короткое название>`.
3. В записи указывать:
   - **Контекст** — зачем правка, какая проблема решалась.
   - **Что сделано** — конкретный список с путями файлов (`file.js:line`).
   - **Известные ограничения / TODO** — если что-то осталось на потом.
4. Если что-то из прошлых записей стало неактуальным — пометить `~~зачёркнутым~~` и кратко объяснить, а не удалять историю.
5. Команды и пути — в backticks. Файлы — относительными путями от корня проекта.

---

## 2026-05-26 — Этап 2: persistent SDK-кэш + кэш adminUsers

### Контекст

После оптимизации от 26 мая (см. ниже) reads всё ещё доходили до 86k+/день — пятью предыдущими шагами проблема не закрылась. Аудит выявил две оставшиеся горячие точки:

1. **SDK не имел персистентного кэша** — каждая перезагрузка/возврат на сайт читал данные с нуля.
2. **`getAllUsers()` не кэшировался в админке** — каждый `navigate('admin')` тянул всю коллекцию `users`. После любого админ-действия в коде идёт `this.navigate('admin')`, что давало +N reads на каждый клик (при 200 юзерах = 200 reads на движение).

Ожидаемый эффект: 86k → ~15-20k reads/день при той же активности.

### Что сделано

**1. `public/js/app.js` — persistent IndexedDB кэш Firestore SDK**
- Импорт `getFirestore` заменён на `initializeFirestore`, `persistentLocalCache`, `persistentMultipleTabManager`.
- `this.db = getFirestore(this.app)` заменено на `initializeFirestore(this.app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`.
- Полностью прозрачно для остального кода — все `getDoc`/`getDocs`/`runTransaction` работают как раньше, SDK сам решает когда брать из IndexedDB.
- Multi-tab поддержка (вкладки делят один кэш).
- Если IndexedDB недоступен (приватный режим Safari) — SDK молча падает на memory-cache.

**2. `public/js/app.js` — кэш `adminUsers`**
- Новое поле `this.adminUsers = null` в конструкторе.
- Роут `admin` теперь использует `if (!this.adminUsers) this.adminUsers = await adminService.getAllUsers()`.
- Инвалидация (`this.adminUsers = null`) добавлена в 6 точках мутации: `handleDeduct`, `handleCreateUser`, `handleImportSquad`, `handleSaveUserProfile`, `handleGrantItem`, `handleDeleteUserItem`.

### Известные ограничения

- **Кросс-админская синхронизация списка юзеров теперь не автоматическая.** Если админ A создаёт юзера, у админа B (с открытой сессией) он появится в списке только после F5. Сознательный компромисс (аналогично балансу из предыдущего этапа).
- **Stale данные между устройствами через SDK-кэш.** Для критичных операций (`buyItem`, `transfer`) используются транзакции — они читают сервер независимо от кэша, расхождений не будет. Для отображения списка товаров/юзеров возможна короткая задержка.

### Что НЕ сделано (отложено)

- Кэш `this.logs` (сейчас перезатирается при каждом `navigate('logs')`).
- Убрать лишние `getUserData()` в `handleGrantItem` / `handleDeleteUserItem` (читают юзера только ради username для лога).
- `handleEditItem` → искать товар в `this.shopItems` вместо `adminService.getItem()`.
- `handleSaveUserProfile` → убрать двойной `navigate('admin') + handleManageUser(userId)`.
- `importSquadData` → второе чтение `users` для пересборки `meta/usernames` (можно собрать локально).

### Файлы плана

Полный план — `C:\Users\kunde\.claude\plans\firebase-effervescent-goblet.md`.

---

## 2026-05-26 — Оптимизация Firestore reads (устранение 429 Too Many Requests)

### Контекст

Firebase Firestore начал отдавать `429 Too Many Requests` на `batchGet` (stacktrace через `StoreService.buyItem` → `app.js:380 handleBuy`). Дневной счёт reads вырос с прежних ~28k до 84k+ при той же нагрузке. Виновники — несколько мест, читающих целые коллекции при каждом действии, плюс одно явно лишнее чтение на каждую покупку.

### Что сделано

**1. `public/js/app.js` — `handleBuy()`**
- Убран `await this.storeService.getItems()` перед покупкой. Товар теперь берётся из уже загруженного `this.shopItems`. **Это было главной утечкой:** каждая покупка читала всю коллекцию `items` (≈ +N reads на клик «Купить»).
- После `buyItem()` баланс и инвентарь текущего юзера обновляются локально из возвращаемого `{ newItem, realPrice }` — больше нет нужды в onSnapshot-листенере.

**2. `public/js/app.js` — `handleTransfer()`**
- Баланс отправителя списывается локально из возвращаемого `value`.

**3. `public/js/app.js` — кэш `shopItems`**
- Роуты `shop`, `admin` и метод `handleManageUser` теперь используют один и тот же кэш `this.shopItems`; чтение коллекции `items` происходит максимум один раз за сессию.
- Инвалидация (`this.shopItems = []`) в `handleCreateItem`, `handleDeleteItem`, `handleSaveItem`.

**4. `public/js/app.js` — кэш `walletUsernames`**
- Новое поле `this.walletUsernames = null` в конструкторе.
- Роут `wallet` берёт имена из нового метода `StoreService.getUsernamesFromMeta()` и кэширует на сессию.
- Инвалидация в `handleCreateUser`, `handleImportSquad`, `handleSaveUserProfile` (последний — только если меняется username).

**5. `public/js/services/LogsService.js` — `getAllLogs()`**
- Раньше тянул всю коллекцию `logs` за всю историю и фильтровал на клиенте. Теперь — серверный `where('type','==','purchase') + orderBy('timestamp','desc') + limit(200)`.
- ⚠️ **Требует составной индекс Firestore** `(type ASC, timestamp DESC)` на коллекции `logs`. При первом запросе Firebase Console покажет ссылку с автосозданием — нужно нажать «Создать». До этого момента запрос будет падать с ошибкой.

**6. `public/js/services/StoreService.js`**
- Новый метод `getUsernamesFromMeta(excludeUsername)` — читает один документ `meta/usernames` (поле `list: string[]`). При первом обращении (документ ещё не существует) делает один bootstrap-проход по коллекции `users` и создаёт документ.
- Удалён старый `getUsernames(excludeId)` — больше не используется.
- `buyItem()` теперь возвращает `{ newItem, realPrice }` из транзакции (для локального обновления состояния в `handleBuy`).
- `transfer()` теперь возвращает списанную сумму `value`.

**7. `public/js/services/AdminService.js` — поддержка `meta/usernames`**
- `createUser()` после `addDoc` добавляет имя в `meta/usernames.list` (`arrayUnion` + `setDoc { merge: true }` — работает корректно, даже если документа ещё нет).
- `updateUser()` — если меняется поле `username`, перед `updateDoc` читает старое имя и после обновления делает `arrayRemove(old) + arrayUnion(new)` в `meta/usernames`.
- `importSquadData()` после `batch.commit()` пересобирает `meta/usernames.list` целиком из актуальной коллекции `users`.

**8. `public/js/services/AuthService.js` — снят onSnapshot**
- `restoreSession()` теперь делает разовый `getDoc(doc(db,'users',uid))` вместо `onSnapshot`.
- Удалены `this.userListenerUnsubscribe` и его вызов в `logout()`.
- Импорт `onSnapshot` убран.

### Известные ограничения

- **Кросс-устройственная синхронизация баланса теперь не автоматическая.** Если админ списывает баланс юзеру (`handleDeduct`), активная сессия этого юзера увидит новое значение только после перезагрузки или перехода на другую вкладку и обратно. Это сознательное решение — listener сжигал +1 read на каждое изменение user-документа во всех активных сессиях.
- **Индекс Firestore для логов** нужно создать вручную через ссылку в консоли (Firebase сам её покажет при первом запросе).
- **Документ `meta/usernames` создаётся лениво** — при первом заходе любого юзера на роут wallet, либо при первом `createUser`/`updateUser` (через `setDoc { merge: true }`). Bootstrap-чтение коллекции `users` происходит ровно один раз за всю историю проекта.

### Что НЕ сделано (отложено)

- `enableIndexedDbPersistence` — если эти 5 шагов окажутся недостаточны, можно включить кэш SDK между перезагрузками.
- Пагинация админ-дашборда (`getAllUsers()` всё ещё читает всех при заходе в админку) — приемлемо, потому что заход редкий.
- Лог-роут не имеет UI постраничной подгрузки — показываются только 200 свежих записей. Если понадобится «показать ещё», добавить `startAfter(lastDoc)`.

### Файлы плана

Полный план изменений с примерами кода и проверочным сценарием — `C:\Users\kunde\.claude\plans\index-esm2017-js-13505-post-https-firest-twinkling-locket.md`.
