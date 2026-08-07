# R&D ОТЧЁТ + СПЕЦИФИКАЦИЯ — CMF-NG (удержание фокуса внимания)

**Дата исследования:** 2026-07-26 · **Трек 1 хартии `RND_01_CHARTER.md`** · Статус: **ЗАВЕРШЁН**
**Маркеры:** `[ДОК]` доказано с источником · `[ОГР]` ограничение · `[СПОР]` спорно · `[ОТВЕРГ]` отвергнуто · `[ИНЖ]` инженерное решение

---

# CMF / SEduM: научно-инженерный аудит модуля оценки учебного внимания по вебкамере

Маркировка: **[ДОК]** доказано со ссылкой · **[ОГР]** доказано с ограничениями · **[СПОР]** спорно · **[ОТВЕРГ]** опровергнуто · **[ИНЖ]** инженерное решение (не факт из литературы).

Аудит опирается на код: `frontend/src/seedum/{metrics,score,cmfConfig,mediapipe.worker,bucketing,calibration,headTolerance}.ts`.

---

## 1. GAZE / ВЗГЛЯД

### 1.1. Что реально даёт MediaPipe

**[ДОК]** MediaPipe Face Landmarker выдаёт 478 3D-точек (468 mesh + 10 iris: по 5 на глаз — центр + 4 контурные), 52 blendshape-коэффициента и facial transformation matrix. Официальная формулировка Google: blendshapes — «coefficients representing facial expression **to infer detailed facial surfaces**», а матрица — «to perform the transformations required **for effects rendering**». Это модели для рендеринга, не сенсоры взгляда.
https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker

**[ДОК] Ключевая цитата Google, которую нужно знать наизусть:** «Note that **iris tracking does not infer the location at which people are looking**, nor does it provide any form of identity recognition.» Google опубликовал точность только для *дистанции*: mean relative error **4.3 % (SD 2.4 %)**, в очках — **4.8 % (SD 3.1 %)**, на базе константы диаметра радужки 11.7 ± 0.5 мм, валидация против depth-сенсора iPhone 11, N > 200.
https://research.google/blog/mediapipe-iris-real-time-iris-tracking-depth-estimation/

Вывод: **опубликованной ошибки gaze в градусах для MediaPipe нет — потому что MediaPipe не решает эту задачу.** Gaze строится сверху, вами, и его точность — это точность *вашей* надстройки.

### 1.2. Опубликованные ошибки для надстроек над iris/landmarks

| Метод | Ошибка | Условия | Источник |
|---|---|---|---|
| MPIIGaze / GazeNet, person-independent | **3.96–6.62°** | лаб. датасет, within-dataset | [arxiv 1711.09017](https://arxiv.org/pdf/1711.09017) |
| GazeNet, **cross-dataset** | **10.8°** | другой датасет | там же |
| Без калибровки → с калибровкой (200 сэмплов) | **5.02° → 2.22°** | MPIIGaze | [WACV 2020](https://openaccess.thecvf.com/content_WACV_2020/papers/Chen_Offset_Calibration_for_Appearance-Based_Gaze_Estimation_via_Gaze_Decomposition_WACV_2020_paper.pdf) |
| Калибровка **9 точек** | **4.01–4.67°** | MPIIGaze | там же |
| WebGazer.js (браузер, ridge regression) | **~4.17°** vs коммерческий трекер; drift **7.79 → 11.62 см (+49 %)** за 20 мин | реальная веб-задача | [IJCAI 2016](https://cs.brown.edu/people/apapouts/papers/ijcai2016webgazer.pdf), [WebEyeTrack](https://arxiv.org/pdf/2508.19544) |
| **WebEyeTrack / BlazeGaze** (браузер, MediaPipe + MAML, k ≤ 9) | **2.32 см** (GazeCapture), **4.56 см** (MPIIFaceGaze), **7.53 см** (EyeDiap); drift **7.24 → 8.72 см (+20 %)** за 20 мин; инференс **0.88 мс**, модель **670 КБ** | браузер/мобильные | [arxiv 2508.19544](https://arxiv.org/pdf/2508.19544), код: [github](https://github.com/RedForestAI/WebEyeTrack) |
| IR-трекеры (эталон) | **0.1–0.35°** | лаб. | [scoping review](https://www.sciencedirect.com/science/article/pii/S2772766125000655) |

**[ДОК] Самое важное для нас — не градусы, а зоны.** Точность классификации зоны экрана резко зависит от размера зоны: FAZE даёт **65 % на сетке 4×4** и **98 % на сетке 2×1**.
https://www.frontiersin.org/journals/robotics-and-ai/articles/10.3389/frobt.2024.1369566/full

**[ИНЖ] Прямое следствие для продукта.** Наша задача — не «куда смотрит», а бинарное «на экране / вне экрана». Это грубейшая из возможных зон, и именно там вебкамерный gaze работает надёжно. **Не стройте point-of-gaze. Стройте бинарный/тернарный классификатор зоны.** Всё, что тоньше «экран / не экран / нет лица», — оверинжиниринг с недоказуемой точностью.

### 1.3. Калибровка: нужна ли, сколько, как часто

**[ДОК]** Персональная калибровка обязательна: снижает ошибку с 5.02° до 2.22°. Причина физиологическая — угол между оптической и зрительной осями глаза (κ-угол) индивидуален и не выводится из изображения.

**[ДОК]** 9 точек — практическое плато для appearance-based методов (`k ≤ 9` у WebEyeTrack, 4.01–4.67° у gaze decomposition). 5 и 13 точек дают заметную ошибку на периферии; 21/39/78 точек лучше, но только для точного PoG.
https://www.realeye.io/blog/post/optimizing-realeye-calibration-point-count-and-accuracy-on-computers

**[ОГР] Длительность.** Для физиологических/поведенческих baseline-моделей оптимальная длительность базовой записи — **3–3.5 минуты**; user calibration **всегда** превосходила неперсонализированную модель.
https://link.springer.com/chapter/10.1007/978-3-031-59717-6_3

**[ИНЖ] Рекомендация по калибровке для Flamingo:**
- **9 точек × 1.2 с фиксации** + 0.4 с на саккаду = **~15 с**. Это совпадает с эмпирикой (15–20 с в реализациях MediaPipe+Kalman).
- Плюс **отдельный 20-секундный «off-screen» сбор**: попросить посмотреть на клавиатуру / в сторону / в тетрадь. Без негативного класса порог on/off не выставить — это то, чего сейчас нет в `calibration.ts` (там собираются FOCUS/READ/RELAX, но в `Baseline` уходит **только** `mean(focus.gazeOnScreen)`, а READ и RELAX **выбрасываются**).
- **Перекалибровка**: дрейф даже у head-pose-aware решения +20 % за 20 мин → **дрейф-коррекция каждые 15–20 мин урока** (1 центральная точка, 1.5 с) + принудительно при `visibilitychange`, смене устройства/разрешения, резком изменении дистанции лица.

### 1.4. Деградация

**[ДОК]** ETH-XGaze: деградация **анизотропна** — вертикальные (pitch) ошибки стабильно больше горизонтальных (yaw). Ограничение диапазона поз ухудшает результат на **34.6 %**, ограничение диапазона взглядов — на **82.1 %**, обоих — на **206.4 %**.
https://arxiv.org/pdf/2007.15837

**[ДОК]** «Current gaze estimation models often suffer **catastrophic performance degradation**… particularly when users wear **glasses or facial masks**, or when **illumination is challenging**.»
https://arxiv.org/html/2603.26945

**[ДОК]** MediaPipe перестаёт детектировать лицо на дистанции **> 65–80 см**.
https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9502716/

**[ДОК]** Задержка webcam-gaze относительно IR-эталона **~300 мс**; для детекции фиксаций нужно **≥ 20 Гц**.
https://www.sciencedirect.com/science/article/pii/S2772766125000655

**[ДОК → критично для fairness]** Face-детекторы работают **хуже на тёмной коже и на женских лицах** (цитируется в Booth et al. 2023 со ссылкой на Buolamwini & Gebru). Отказы детектора коррелируют с «motion, occlusion, poor lighting». Это значит, что *пропуски данных не случайны* — и любое кодирование пропуска нулём систематически занижает оценку у определённых групп. См. §4.5.

### 1.5. Сравнение с нашим текущим подходом (8 eye-look blendshapes)

Текущий код (`metrics.ts:gazeOnScreen`):
```ts
const hL = Math.max(blend(g.inLeft), blend(g.outLeft));
const vL = Math.max(blend(g.upLeft), blend(g.downLeft));
const offset = (Math.hypot(hL, vL) + Math.hypot(hR, vR)) / 2;
return clamp01(1 - offset / CMF.gazeOffScreenSpan); // span = 0.6
```

**[ДОК]** Ни одной рецензируемой публикации, валидирующей `eyeLook*` blendshapes как оценщик направления взгляда, найти не удалось. Blendshape-модель имеет вход **1 × 146 × 2** — она принимает *подмножество 2D-лендмарков*, не изображение глаза. То есть она физически не видит зрачок: она восстанавливает ARKit-совместимую анимационную позу по контурам век и глазниц.
https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker

**[ИНЖ] Конкретные дефекты нашей формулы:**

1. **Конфляция с позой головы — подтверждается.** `eyeLookIn/Out` определены относительно *головы* (ARKit-семантика). Когда голова повёрнута на 20°, а взгляд компенсаторно направлен на экран, blendshapes показывают большое отклонение → мы штрафуем внимательного ученика. И наоборот: голова прямо, глаза на телефоне сбоку — тоже большое отклонение, но это уже правильно. **Один и тот же сигнал для двух противоположных ситуаций.** Различить их без явной геометрии (gaze_world = R_head · gaze_head) невозможно.
2. **`Math.max(in, out)` теряет знак.** Взгляд влево и вправо неразличимы. Для бинарного «на экране» это не смертельно, но делает невозможной любую зонную логику и любую диагностику.
3. **`gazeOffScreenSpan = 0.6` не имеет физического смысла.** Это не угол и не доля экрана. Порог невозможно вывести из геометрии (размер экрана, дистанция, положение камеры) — только подогнать.
4. **Нет учёта геометрии.** Ученик за 13" ноутбуком в 40 см и ученик за 27" монитором в 70 см имеют разные угловые границы экрана (≈ ±20° против ≈ ±13°). Один порог для обоих физически некорректен.
5. **`baseline` применяется как деление** (`gaze / baseline.gazeOnScreen`) → может только *поднять* оценку, никогда не опустить, и не применяется к экспортируемой суб-метрике `gazeOnScreen` (в `mediapipe.worker.ts` в бакет идёт **некалиброванный** `signals.gazeOnScreen`). Ученик и учитель видят разные шкалы.

**Вердикт: [ИНЖ]** текущий подход — не «грубый», а **невалидируемый**: у него нет единиц измерения, нет ground truth и нет физической модели. Его нельзя улучшить подбором `gazeOffScreenSpan`; его нужно заменить.

**[ИНЖ] Рекомендуемая замена, v2 (в порядке возрастания стоимости):**

**Вариант A — геометрический iris-offset (2–3 дня, рекомендуется как немедленный шаг).**
Для каждого глаза: вектор от центра глазницы (среднее внутреннего/внешнего угла: L 33/133, R 362/263) к центру радужки (L 468, R 473), нормированный на ширину глаза. Получаем 2D-вектор в системе координат *головы*. Затем поворачиваем его матрицей R из facial transformation matrix → получаем приближение направления взгляда в системе камеры. Порог on-screen выводится из геометрии: `atan(screen_half_width / distance)`, где distance берётся из iris-depth (ошибка 4.3 % — официальная цифра Google, вполне достаточная). Плюс 9-точечная калибровка → аффинная поправка (2×3 матрица, 6 параметров, решается по 9 точкам методом наименьших квадратов).
Это даёт: интерпретируемые единицы (градусы), явную развязку головы и глаз, физически выводимый порог, и **позволяет выключить blendshapes целиком** (`outputFaceBlendshapes: false`) — минус одна модель из трёх в бандле, ощутимый выигрыш по CPU.

**Вариант B — WebEyeTrack / BlazeGaze (2–4 недели).** Open source (Apache-совместимо, проверить лицензию), 670 КБ, TF.js, 0.88 мс инференс, on-device MAML-калибровка k ≤ 9, обучение и инференс **не покидают устройство** — прямо совпадает с нашим privacy-инвариантом. Опубликованные цифры: 2.32 см PoG. Это единственное известное мне решение, где авторы явно проектировали под «privacy-preserving on-device personalization».
https://github.com/RedForestAI/WebEyeTrack

**[СПОР → не использовать]** Работа Ramesh et al. «MediaPipe Iris and Kalman Filter for Robust Eye Gaze Tracking» (Atlantis Press 2025) заявляет «accuracy 97.5 %», но: единица «accuracy %» не определена, ground truth не описан, latency в таблице 25–32 мс, а в тексте — «250–320 ms» (внутреннее противоречие), сравнение с baseline без методики. **Пример источника, на который опираться нельзя.** https://www.atlantis-press.com/article/126011300.pdf

---

## 2. HEAD POSE

### 2.1. Что это такое

**[ДОК]** `facialTransformationMatrix` — это **не** PnP-решение и не нейросетевая оценка позы. Это жёсткое линейное отображение (Procrustes analysis) канонического metric-меша в рантайм-меш: `P = [R | t]`, где `R` — 3×3 матрица поворота (**scale-invariant**), `t` — вектор переноса (**относительный**, не метрический).
https://developers.googleblog.com/en/mediapipe-3d-face-transform/ · подтверждение в [WebEyeTrack §3.1](https://arxiv.org/pdf/2508.19544)

### 2.2. Точность

**[ОГР]** Клиническая валидация против оптоэлектронной системы (gold standard): **roll — в пределах 1.37°** для всех трёх сравниваемых алгоритмов. Но: «under large rotations (Yaw) and flexion/extension angles (Pitch), **both OpenFace 2.0 and MediaPipe accuracy reduces**». Только 3DDFA_V2 удерживался «below or close to an acceptable level of **5 degrees** regardless of the plane of motion» — MediaPipe не удерживался.
https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9502716/

**[ИНЖ] Практический вывод:** в рабочем диапазоне ±15–20° (то, что нас интересует) MediaPipe достаточно точен — ошибка порядка нескольких градусов. За пределами ±30–40° доверять нельзя, но нам туда и не надо: там уже уверенно срабатывает «лицо не в кадре / голова вне допуска».

### 2.3. ❗ Найденная ошибка в `metrics.ts:headEuler`

```ts
const fx = matrix[8], fy = matrix[9], fz = matrix[10];
return { yaw: atan2(fx, fz) * 180/PI,
         pitch: atan2(fy, fz) * 180/PI };   // ← некорректно
```

**Дефект 1 — pitch конфлатит с yaw.** `atan2(fy, fz)` — это не питч. При повороте головы вбок `fz → 0`, и знаменатель схлопывается: питч взрывается к ±90° при нулевом реальном наклоне. Корректная декомпозиция для нормированного forward-вектора **f**:
```ts
const n = Math.hypot(fx, fy, fz) || 1;
const x = fx/n, y = fy/n, z = fz/n;
const yaw   = Math.atan2(x, z) * 180/Math.PI;          // вокруг Y
const pitch = Math.asin(Math.max(-1, Math.min(1, -y))) * 180/Math.PI;  // вокруг X
```
(равносильно `atan2(-y, hypot(x, z))` — численно устойчивее).

**Дефект 2 — знак/конвенция не проверены.** В комментарии написано «identity → (0,0)», но это верно только при `fz > 0`. Если MediaPipe отдаёт камерную конвенцию с `fz < 0` (взгляд вдоль −Z, OpenGL), то при фронтальном лице `atan2(0, −1) = π = 180°` — то есть **дефолтное состояние «смотрит прямо» будет читаться как «голова вывернута на 180°»**, и `headYawToleranceDeg = 15` будет срабатывать всегда. Также не проверено, row-major или column-major приходит массив из 16 чисел в `tasks-vision`. **Это первое, что нужно верифицировать на реальной камере** — до этого все цифры `headYaw/headPitch` в бакетах и в учительском виде недостоверны.

**Дефект 3 — roll не извлекается вообще.** Roll (наклон головы к плечу) — самый точный канал MediaPipe (1.37°) и полезный сигнал (подпёр щёку рукой, лёг на парту). Сейчас теряется.

**[ИНЖ] Протокол валидации знаков (обязателен, 10 минут):** штатив, транспортир на столе, испытуемый поворачивает голову на −30°, −15°, 0°, +15°, +30° по yaw и повторяет по pitch, удерживая 3 с. Логировать сырые значения. Ожидаем монотонность и совпадение знака. Записать результат в тест-фикстуру.

### 2.4. Источники шума

**[ОГР]** Перечисляю по убыванию вклада, из литературы и практики:
1. **Покадровый джиттер лендмарков** — основной источник. MediaPipe применяет внутреннее сглаживание, но **[ДОК]** «Smoothing is only applied when `num_faces` is set to 1» (у нас `numFaces: 1` — правильно). https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
2. **Автоэкспозиция и авто-WB вебкамеры** — при смене освещения меняется контраст контуров → скачок лендмарков.
3. **Дистанция** (лицо занимает мало пикселей) и **компрессия** потока.
4. **Rolling shutter** при быстром движении.
5. **Очки** — блики на линзах ломают контуры век и радужки.

### 2.5. Фильтрация: One-Euro vs Kalman

**[ДОК]** 1€ filter (Casiez, Roussel, Vogel, CHI 2012) — низкочастотный фильтр первого порядка с адаптивной частотой среза: при малой скорости низкий cutoff (убирает джиттер), при большой — высокий (убирает лаг). Параметры: `mincutoff` (Гц, > 0 — ниже = меньше джиттера), `beta` (> 0 — выше = меньше лага на быстром движении), `dcutoff` (по умолчанию 1 Гц).
https://gery.casiez.net/1euro/ · референс-реализации: https://github.com/casiez/OneEuroFilter · npm: https://www.npmjs.com/package/1eurofilter

**[ИНЖ] Почему One-Euro, а не Kalman.** Kalman требует модели движения и матриц ковариаций процесса/измерения, которых у нас нет и которые пришлось бы подбирать эмпирически — то есть те же два свободных параметра, но менее интерпретируемых. One-Euro — стандарт для интерактивных сигналов, две ручки, официальная процедура настройки.

**[ИНЖ] Процедура настройки (из оригинальной работы):**
1. `beta = 0`, `mincutoff = 1.0`. Сидеть неподвижно. **Опускать** `mincutoff`, пока джиттер в покое не станет приемлемым.
2. Двигать головой. **Поднимать** `beta`, пока лаг не станет приемлемым.
3. Правило: «If high speed lag is a problem, increase beta; if slow speed jitter is a problem, decrease mincutoff.»

**[ИНЖ] Стартовые значения для наших сигналов** (сигнал в градусах, частота 5–10 Гц):

| Сигнал | mincutoff | beta | dcutoff |
|---|---|---|---|
| `headYaw`, `headPitch`, `headRoll` (градусы) | **0.8 Гц** | **0.02** | 1.0 Гц |
| `gazeVector.x/y` (нормированный, −1..1) | **1.2 Гц** | **0.05** | 1.0 Гц |
| `eyeOpenness` / EAR | **не фильтровать One-Euro** — моргания это сигнал, а не шум; см. §3 | — | — |

Фильтровать **до** скоринга, покомпонентно, в worker'е.

---

## 3. МОРГАНИЕ / ОТКРЫТОСТЬ ГЛАЗ

### 3.1. EAR

**[ДОК]** EAR введён Soukupová & Čech (CVWW 2016). Порог **~0.2** с требованием N последовательных кадров. **Важная деталь, которую обычно теряют:** сами авторы в итоговом методе используют **не фиксированный порог, а SVM по временнóму окну значений EAR** (13 кадров) — именно потому, что фиксированный порог зависит от геометрии лица и камеры.
https://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf

**[ОГР]** Последующие работы перешли на адаптивные и перцентильные пороги. Наши константы `earClosed = 0.15`, `earOpen = 0.30` — правдоподобный дефолт, но популяционно неверный: EAR зависит от разреза глаз (сильные межэтнические различия — критично для рынка РФ/СНГ), от очков, от угла камеры и от дистанции.

### 3.2. ❗ Найденная ошибка в `metrics.ts:earOfEye`

```ts
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
```

MediaPipe `NormalizedLandmark` возвращает `x ∈ [0,1]` относительно **ширины** кадра и `y ∈ [0,1]` относительно **высоты**. Пространство **анизотропно**. Для кадра 640×480 вертикальные расстояния сжаты в 480/640 = **0.75** раза относительно горизонтальных → EAR систематически занижается на **25 %**. Для 16:9 (1280×720) — на **44 %**.

**Следствие:** с порогами 0.15/0.30 при 16:9 у большинства пользователей `openness` будет постоянно вблизи нуля → `engagementScore = gaze × openness` → перманентно низкая «вовлечённость» у всех. И порог, откалиброванный на 4:3-ноутбуке, сломается на 16:9-мониторе.

**Исправление:**
```ts
// aspect = frameWidth / frameHeight, передавать в worker при init
const dist = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
```
Либо (предпочтительнее) считать EAR по **metric**-лендмаркам после применения transformation matrix — там пространство изотропно и EAR становится инвариантным к дистанции и к разрешению.

### 3.3. ❗ Частота 5 fps несовместима с морганием

**[ДОК]** Обзор PERCLOS перечисляет пороги исключения быстрых морганий: **< 250 мс, < 400 мс, < 500 мс**, и прямо указывает: «**A sufficient sampling rate is required when fast blinks are excluded.**» Использованные в литературе частоты: 2, 3, 6, 10, 24, 60, 120 Гц.
https://academic.oup.com/sleepadvances/article/4/1/zpad006/7000589

При `frameIntervalMs = 200` (5 Гц) моргание длительностью 100–400 мс попадает в **0–2 кадра**. Детектор морганий (`AlertnessTracker`) на такой частоте:
- пропускает большинство морганий (алиасинг),
- считает частоту морганий с ошибкой, зависящей от фазы,
- **не может отличить моргание от медленного смыкания век (droop)** — а именно это различие и составляет суть PERCLOS.

**Вывод: [ОТВЕРГ]** `AlertnessTracker` в текущем виде на 5 Гц измеряет шум. Либо поднимать частоту до **≥ 15–30 Гц**, либо убирать метрику.

### 3.4. Частота морганий ≠ сонливость (двунаправленность)

**[ДОК]** Spontaneous eye blink rate (SEBR) — непрямой маркер дофаминергической функции. Ключевое: «Blink rate **decreases** with increasing demand and difficulty in attention tasks… increased demand for visual attention **lowers** the spontaneous eye blink rates, while engagement of working memory is reflected as **increased** blinking.»
https://pubmed.ncbi.nlm.nih.gov/27555290/ · https://pubmed.ncbi.nlm.nih.gov/29133149/

**[ОГР]** То есть высокая частота морганий может означать и утомление, и активную работу рабочей памяти. Наш `drowsyBlinkRatePerMin = 25` («выше → сонливее») противоречит этому: нормальный SEBR в покое ~15–20/мин, при чтении падает до 4–6/мин, при разговоре растёт до 25+/мин. Порог 25 будет систематически помечать «сонным» ученика, который активно говорит.

### 3.5. PERCLOS: доказательная база и переносимость

**Что доказано [ДОК]:**
- PERCLOS введён Wierwille et al. (1994); Dinges et al. (1998) показали, что он **точнее ЭЭГ и параметров морганий** для детекции lapse'ов в PVT при депривации сна. FHWA/NHTSA признают его «among the most promising known real-time measures of alertness».
https://rosap.ntl.bts.gov/view/dot/113
- Механистическая связь не сводится к «глаза закрыты — не видит»: медленные смыкания век коррелируют со снижением связности DMN и ослаблением антикорреляции DMN↔DAN (фМРТ), то есть отражают состояние ЦНС.

**Что опровергает переносимость на учебный контекст:**

**[ОТВЕРГ]** Обзор SLEEP Advances 2023, прямая цитата из аннотации: «**PERCLOS alone may not be sufficiently sensitive for detecting drowsiness caused by factors other than falling asleep, such as inattention or distraction.**» — то есть авторы сами говорят: PERCLOS не про невнимательность.

**[ДОК]** «some cases have been reported wherein PERCLOS was **not affected by drowsiness manipulations, such as in moderate drowsiness conditions, in older adults, and during aviation-related tasks**.»

**[ДОК]** Конкретика: Caponecchia & Williamson, N = 41, **2 ч и 4 ч депривации сна → «No change»** в PERCLOS. Cai et al.: 29 ч депривации — у молодых (21–33) рост, у пожилых (50–65, N = 17) — **«No change»**.

**[ДОК]** В сводной таблице обзора PERCLOS **проиграл** другим индексам на **каждом** практически значимом исходе: KSS, SDLP (отклонение в полосе), выезды из полосы, пересечения линии, частота инцидентов, аварии. Побеждал только на PVT-lapse'ах, OSLER и PSG-определённом сне.

**[ДОК]** «**no single index is currently available as an optimal marker for detecting drowsiness during driving or other real-world situations**.»

**[ДОК]** Определения PERCLOS в литературе несовместимы между собой (порог закрытия 20 % / 25 % / 30 %; референт — расстояние между веками / диаметр радужки / диаметр зрачка; моргания то исключаются, то нет). Даже три прибора, измерявшие одновременно, дали расходящиеся значения.
https://academic.oup.com/sleepadvances/article/4/1/zpad006/7000589

**Вывод: [ОТВЕРГ]** PERCLOS в учебном контексте — не прокси внимания. Он валидирован для **сонливости от депривации сна**, у **взрослых**, в **вождении/вигильных задачах**, и даже там не работает при умеренной депривации и у людей старше 50. Для школьника на уроке он не даёт ничего, кроме «глаза закрыты» — что мы и так знаем из EAR. **Не называйте нашу метрику PERCLOS и не ссылайтесь на транспортную литературу как на обоснование.**

**[ИНЖ] Что оставить:** `eyeClosedFraction` за бакет — честная описательная метрика («доля времени с закрытыми глазами»), без интерпретации как «сонливость». Плюс отдельное событие `prolongedClosure` при закрытии > 2 с (это уже не моргание — это либо сон, либо ученик отвернулся, либо детектор потерял глаза).

---

## 4. СКОРИНГ ВНИМАНИЯ

### 4.1. Опорная работа — прямой аналог нашей задачи

**[ДОК]** Silvan Ortubay, Parra & Madsen (2024). MediaPipe FaceLandmarker → 52 blendshapes + аффинная матрица = **64 признака**, окно **10 с**, сеть 2D-CNN + LSTM, целевая переменная — **Inter-Subject Correlation движений глаз** (объективная, не self-report).

Результаты:
- ISC движений радужки по FaceMesh ≈ ISC взгляда с research-grade трекера: **r(24) = 0.89, p = 1.2e−9** — то есть вебкамера без калибровки ловит синхронность взгляда не хуже профессионального трекера;
- **R² = 0.384** на знакомых испытуемых, **R² = 0.259 (Exp.2)** и **R² = 0.301 (Exp.3)** на новых испытуемых и новых стимулах;
- MAE лучше наивного baseline на **15–30 %** (p < 0.0001);
- абляция признаков: доминируют движения глаз, затем голова, брови, щёки, рот;
- 10 с — «the appropriate length for engagement assessment by humans»;
- частота дискретизации радужки — **4 Гц** (авторы обосновывают: релевантная модуляция ISC < 2 Гц, пик 0.1 Гц).

https://arxiv.org/pdf/2409.13084 · код: https://github.com/asortubay/timeISC

**Это самый ценный ориентир для нас: тот же сенсор, тот же пайплайн, браузер-совместимо, объективный ground truth. И потолок честности: R² ≈ 0.26–0.30 на незнакомых людях.**

### 4.2. Линейная композиция vs правила vs обучаемая модель

**[ОГР]** Данные о том, что лучше:
- обучаемая модель по видео + логи + контекст: **κ = 0.65** для on-task/off-task (Aslan et al., SEAT, реальные классы) — но **мультимодальная**, не только лицо;
- computer vision (лицо + тело) в реальном классе: **off-task AUC = 0.816** (Bosch & D'Mello) — https://dl.acm.org/doi/10.1145/2946837;
- gaze → mind wandering, research-grade трекер: precision **0.722** / recall **0.674** (Mills et al.); accuracy **72 %** / **67 %** (Hutt et al.); AUC-ROC **0.80** (DNN+Conv1D);
- мультимодальная детекция MW на лекциях: AUC-PR **0.396** (aware), **0.267** (unaware), **0.637** (комбинированно) — то есть **на 14–40 % выше случайного**.

**[ИНЖ] Рекомендация: гибрид, а не «одно из трёх».**

Обучаемая модель невозможна на MVP — у нас нет ground truth и нет права его собирать (собирать разметку внимания у детей = собирать видео, что нарушает наш собственный инвариант). Поэтому:

**Слой 1 — детерминированный, интерпретируемый, экспортируемый.** Наблюдаемые состояния с явной геометрией:
`faceVisible ∈ {true,false}` · `gazeZone ∈ {screen, off, unknown}` · `headInFrame ∈ {in,out,unknown}` · `eyesOpen ∈ [0,1]`.
Это то, что мы **имеем право утверждать**, потому что каждое проверяемо по видео независимым наблюдателем.

**Слой 2 — композиция в один индикатор**, но **не произведение**. Текущее `score = gaze × openness` — мультипликативное вето: любой ноль обнуляет всё. Моргание при 5 Гц роняет оценку на 40–60 % на ~1 с. Вместо этого:

```
onScreenTime = доля бакета, в которой (gazeZone == screen)
focusIndex   = 100 · onScreenTime · headFactor
  где headFactor = 1.0 если headInFrame, иначе CMF.headOffScreenPenalty
  eyesOpen НЕ входит в focusIndex — моргания уже исключены на уровне детектора зоны
```
То есть: считать **долю времени**, а не усреднять мгновенные оценки. Это устойчивее к выбросам, интерпретируемо («смотрел на экран 8 из 10 секунд»), и напрямую соответствует тому, что может подтвердить человек-наблюдатель.

**Слой 3 (позже, при наличии данных)** — обучаемая надстройка типа Ortubay et al. Только когда появится набор с объективным критерием (например, ISC внутри группы, смотрящей один и тот же урок — это мы можем построить **не собирая видео**: ISC считается по агрегатам на сервере).

### 4.3. Персональная базовая линия — обязательна

**[ДОК]** «User calibration **always** beat the non-personalized model», оптимальная длительность базовой записи **3–3.5 мин**.
https://link.springer.com/chapter/10.1007/978-3-031-59717-6_3

**[ДОК]** Self-report персонально валиден только **внутри человека во времени**, не между людьми: «Self-reported measures are more valid when compared over time **within a learner** since these differences in reference frames are no longer problematic.» (Booth et al. 2023)

**[ИНЖ] Следствие для продукта:** абсолютный балл сравним **только с самим собой**. Ранжирование учеников класса по `avgAttention` — методологически невалидно и его нужно запретить на уровне UI (не только не показывать — не давать сортировать). Учительский вид должен показывать **отклонение от личной базы**, а не абсолютную шкалу.

Текущий `calibration.ts` собирает три стадии, но экспортирует только `mean(focus.gazeOnScreen)` как делитель. Нужно: `{ gazeCenter: [x,y], gazeSpread: σ, offScreenThreshold, earOpen, earClosed, headNeutral: {yaw,pitch,roll} }` — то есть полноценный персональный профиль, а не один скаляр.

### 4.4. Темпоральное сглаживание с гистерезисом

**[ДОК]** Принцип из теории сигналов (триггер Шмитта): два разных порога — на подъём и на спад; ширина гистерезиса должна **в 2–3 раза превышать размах шума**, иначе состояние дребезжит на границе.

**[ИНЖ] Конкретная схема (двухпороговый + dwell + асимметричная EMA):**

```
ПОРОГИ СОСТОЯНИЯ (на focusIndex 0..100):
  вход в "отвлёкся":  focusIndex < 35  И  удерживается ≥ 2 бакета подряд (5 с)
  выход из "отвлёкся": focusIndex > 55  И  удерживается ≥ 1 бакет (2.5 с)
  → ширина гистерезиса 20 пунктов, dwell асимметричен (медленно вниз, быстро вверх)

СГЛАЖИВАНИЕ ПОКАЗАНИЯ (не состояния):
  асимметричная EMA:  alphaUp = 0.5   (постоянная времени ≈ 1 бакет)
                      alphaDown = 0.2 (постоянная времени ≈ 4 бакета ≈ 10 с)
```

**[ИНЖ] Обоснование асимметрии — и это ценностный выбор, а не факт из литературы.** Ложное «отвлёкся» у внимательного ученика — прямой вред (несправедливое замечание, подрыв доверия к системе, у ребёнка — стресс). Пропуск реального отвлечения — мягкий вред (учитель просто не получил подсказку). Поэтому система должна **быстро прощать и медленно обвинять**. Это нужно записать в продуктовые требования как явное решение, а не оставлять как параметр фильтра.

Заметьте: это **противоположно** формулировке в задании («быстро вверх / медленно вниз») по смыслу — но совпадает по механике. «Быстро вверх» = быстро возвращаемся к «внимателен». Именно так.

### 4.5. «Нет лица в кадре» → null, а не 0

Наш код это **уже делает правильно** (`mediapipe.worker.ts` не кормит бакет при `!facePresent`, `Bucketer.flush` пропускает пустые). Ниже — доказательная база, чтобы это решение нельзя было «оптимизировать» обратно:

**Аргумент 1 — измерительный. [ИНЖ]** «Не измерено» и «измерено ноль» — разные величины. Ноль — это утверждение о мире; null — утверждение о приборе.

**Аргумент 2 — статистический. [ИНЖ]** Пропуски **не случайны** (MNAR). Усреднение нулей в бакете смещает среднее вниз пропорционально доле пропусков. Ученик, отклонившийся за границу кадра на 3 из 10 с, получит −30 % не потому, что отвлёкся.

**Аргумент 3 — fairness, и это главный. [ДОК]** Отказы face-детектора вызваны «motion, occlusion, poor lighting», а детекторы лиц «captures **black and female faces less well** than lighter colored or male faces» (Booth et al. 2023, со ссылкой на Buolamwini & Gebru). Значит **кодирование пропуска нулём систематически занижает оценку темнокожим ученикам, ученикам в очках и ученикам с плохим освещением дома** — то есть по признаку расы и социально-экономического положения. Booth называет это «measurement bias / contamination of the relevance».

**Аргумент 4 — содержательный. [ДОК]** «some behavioral proxies are **nonspecific**; for example, absences can reflect health conditions and a difficult home life rather than lack of engagement». Ученик, отвернувшийся, чтобы записать в тетрадь, — максимально вовлечён.

**[ИНЖ] Что доработать:**
- добавить в бакет поле `coverage` = `samples / expectedSamples` (доля валидных кадров). Учитель должен видеть разницу между бакетом из 12 кадров и из 1 кадра. Это **агрегатный скаляр**, инвариант приватности не нарушает;
- при `coverage < 0.5` — **не отправлять бакет вообще** (сейчас отправится бакет из одного кадра);
- UI: «нет данных» ≠ «0 %». Уже есть `liveAttentionStaleMs = 6000` — хорошо; убедиться, что плитка серая, а не красная;
- ❗ **`score.ts:engagementScore` возвращает `0` при `!facePresent`** — контракт функции противоречит политике null. Worker до неё не доходит, но это ловушка на будущее. Сделать возвращаемый тип `number | null`.

### 4.6. ❗ Ещё одна найденная ошибка: усреднение знаковых углов

`bucketing.ts:averageSample` усредняет `headYaw` и `headPitch` как **знаковые** величины. Ученик, попеременно смотрящий влево (−30°) и вправо (+30°), даёт среднее **0°** → `headState = 'in'` → «голова в допуске». Полная потеря сигнала.

**[ИНЖ] Исправление:** агрегировать `mean(|yaw|)` и `mean(|pitch|)`, либо (лучше) `outOfToleranceFraction` — долю кадров бакета, где голова вне допуска. Второе интерпретируемо и монотонно.

---

## 5. ВАЛИДНОСТЬ И ГРАНИЦЫ

### 5.1. Что реально доказано

| Утверждение | Величина | Условия | Источник |
|---|---|---|---|
| Синхронность движений глаз между студентами **предсказывает результаты теста** | значимо | онлайн-видеоуроки | [Madsen et al., PNAS 2021](https://www.pnas.org/doi/10.1073/pnas.2016980118) |
| Радужка по вебкамере даёт ту же синхронность, что research-grade трекер | **r(24) = 0.89** | N = 26 | [Ortubay et al. 2024](https://arxiv.org/pdf/2409.13084) |
| MediaPipe-признаки одного ученика → объективная мера внимания | **R² = 0.26–0.30** на новых людях/стимулах | N = 57 | там же |
| Детекция off-task поведения по видео в реальном классе | **AUC = 0.816** | до 30 учеников, шум, движение | [Bosch & D'Mello](https://dl.acm.org/doi/10.1145/2946837) |
| Детекция mind wandering по gaze | precision **0.722** / recall **0.674**; accuracy **67–72 %** | research-grade трекер, лаб | Mills et al.; Hutt et al. |
| On-task/off-task, мультимодально (лицо+логи+контекст) | **κ = 0.65** | реальные классы | Aslan et al., SEAT |
| Скука ↔ академическая успешность | **r = −0.24** | мета-анализ, 29 работ, **N = 19 052** | цит. в Booth et al. 2023 |
| Вмешательство по детекции MW → отсроченное понимание | **d = 0.352 / 0.307** через **неделю**; **немедленно — незначимо** | RCT, N = 35+35, лаб, чтение, IR-трекер | Eye-Mind Reader, цит. в Booth et al. 2023 |
| Детекция аффекта → снижение скуки и off-task | **оба на 50 %**; прирост знаний — «suggestive but **not significant**» | RCT, N = 77 | iTalk2Learn |
| Базовая частота mind wandering | **~30 % времени** при обучении с технологией | обзор | Booth et al. 2023 |

**Полный текст обзора:** Booth, Bosch & D'Mello (2023), «Engagement Detection and Its Applications in Learning: A Tutorial and Selective Review», Proceedings of the IEEE — https://www.colorado.edu/research/ai-institute/sites/default/files/attached-files/booth_et_al._-_2023_-_engagement_detection_and_its_applications_in_learn.pdf

### 5.2. Где начинается оверклейм — прямые цитаты

**[ДОК]** «**neutral facial expressions are limited proxies for focus and gaze is a limited proxy for visual attention**, and some behavioral proxies are nonspecific» (Booth et al. 2023)

**[ДОК]** «**To date, there is little to no evidence of discriminant validity… predictive validity… or external validity (i.e., generalizability)** [for ML-based engagement measures]. For instance, **none** of the reactively designed systems that we describe later… provide evidence of these additional types of validity.»

**[ДОК]** «**Since engagement is a latent construct and cannot be directly observed**, traditional measures rely on self-reports, observation/annotation, or proxies.»

**[ДОК]** «self and observer ratings of engagement and affect, in general, **tend to be very weakly correlated**… Attempts to mitigate these differences, such as frame-of-reference training… **do not seem to improve self-observer agreement**.» — то есть **не существует бесспорного ground truth**, против которого можно было бы «доказать точность».

**[ДОК]** «**scientists and practitioners should expect that generalizability measures are only applicable when both the populations and contexts are very similar**, and they should take caution when using automated ML systems outside of their intended contexts.» + «research is starting to highlight the **gap in performance** when an ML model trained in one context (e.g., lab studies) is used to make predictions in another (e.g., classroom engagement).»

**[ДОК]** «**Many ML models are not yet "self-aware"** to the extent that they can recognize when the features… are coming from a different context. An ML model may, thus, produce engagement scores to the best of its ability **without making its confidence… known to stakeholders**.»

**[ДОК]** «when learner engagement is predicted to be low, **it is uncertain whether the learner is disengaged or whether the model simply is inaccurate** in this case.»

**[ДОК] Нормативная рекомендация авторов — фактически ТЗ для нас:** «there is a **massive concern** about these automated models being used to **surveil students and for the purposes of disciplining and evaluating them**. Using models of student engagement to **evaluate teachers is similarly alarming and distressing**. …we recommend that these models be used for **research purposes, formative feedback (i.e., feedback for improvement not evaluation), or dynamic intervention and ideally in low-stakes settings. Users should have agency over the measures including the ability to turn them off.**»

**[ДОК]** «**ML models should only be deployed to measure learner engagement in contexts very similar to how they were trained and never used for evaluation purposes or in high-stakes scenarios.**»

### 5.3. Регуляторная граница

**[ДОК]** EU AI Act, ст. 5(1)(f): запрещены ИИ-системы, выводящие эмоции физического лица **на рабочем месте и в образовательных учреждениях** на основе биометрических данных (исключения — медицина и безопасность). Действует с **2 февраля 2025**. Штрафы — до **€35 млн или 7 % мирового оборота**. Recital 44 обосновывает запрет «lack of scientific basis… limited reliability, the lack of specificity and limited generalisability».
https://artificialintelligenceact.eu/article/5/ · https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/

**[ДОК]** Научная основа запрета: Barrett et al. (2019), «Emotional Expressions Reconsidered» — движения лица **не** отображаются надёжно в категории эмоций.
https://journals.sagepub.com/doi/10.1177/1529100619832930

**[ИНЖ]** Рынок Flamingo — РФ/СНГ, AI Act формально не применяется. Но: (а) это дефолтный бенчмарк для любого международного инвестора; (б) он блокирует выход в ЕС; (в) он научно обоснован. **Практическое правило: наши 52 blendshape не должны нигде фигурировать как «эмоции», «настроение», «интерес», «скука», «фрустрация».** Метрика `alertness` — на грани; переименовать в нейтральное описательное (`eyeClosedFraction`) или убрать.

**[ИНЖ] 152-ФЗ.** Обработка **на устройстве** без передачи — не обработка ПДн оператором в смысле закона; наружу уходят агрегированные скаляры, привязанные к `studentId`. Но: это всё равно данные о поведении несовершеннолетнего → нужно (а) явное родительское согласие с **отдельным** пунктом про CMF (не общий `consent152fz`), (б) описание в Политике **точного** перечня уходящих полей, (в) техническая возможность отказаться от CMF без потери доступа к уроку.

---

## 6. ПРОИЗВОДИТЕЛЬНОСТЬ

### 6.1. Проблема с `setTimeout` — подтверждается

**[ДОК]** Троттлинг фоновых вкладок в Chrome: таймеры < 100 мс зажимаются до **500 мс**, < 1 с → **2 с**, < 5 с → **5 с**; `requestAnimationFrame` в фоновых вкладках **приостанавливается**.
https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

Наш `frameIntervalMs = 200` в скрытой вкладке становится ≥ 500 мс → бакеты по 2.5 с наполняются 5 кадрами вместо 12, и `bucketStartFor` продолжает нарезать по стенным часам → **дрейф и «дырявые» бакеты без индикации**.

### 6.2. requestVideoFrameCallback

**[ДОК]** `HTMLVideoElement.requestVideoFrameCallback()` вызывается **на каждый реально декодированный кадр видео**, а не по таймеру; эффективная частота = min(частота видео, частота браузера); выполняется **непосредственно перед** `rAF`-колбэками; в метаданных даёт `mediaTime`, `presentedFrames`, `expectedDisplayTime`, `processingDuration`.
https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback · https://web.dev/articles/requestvideoframecallback-rvfc · спека: https://wicg.github.io/video-rvfc/

**Преимущества для нас:**
1. **Нет дрейфа** — тактируемся от источника, а не от таймера.
2. **Нет дублей** — `presentedFrames` позволяет заметить пропуск кадров и не считать один кадр дважды.
3. **Честная пауза** — когда вкладка скрыта, колбэк не вызывается → бакеты не создаются → на сервер уходит **пропуск**, а не фальшивые числа. Это ровно та семантика, которую мы хотим (§4.5).
4. `mediaTime` даёт **монотонное время источника** — незаменимо для воспроизводимых тестов на fake-камере (§7).

**[ИНЖ] Оговорки:** rVFC живёт на `HTMLVideoElement` в главном потоке (в Worker его нет). Схема: rVFC в main thread → счётчик децимации (брать каждый N-й кадр под целевые 5–10 Гц) → `createImageBitmap(video, {resizeWidth:256, resizeHeight:256})` → `postMessage(bitmap, [bitmap])`. Современная альтернатива — `MediaStreamTrackProcessor` (WebCodecs), даёт `ReadableStream<VideoFrame>`, который **можно передать в Worker** и обрабатывать без главного потока вообще — но только Chromium. Ставить как основной путь с fallback на rVFC.

### 6.3. Целевая частота

**[ДОК]** Ortubay et al. семплировали радужку на **4 Гц**, обосновав: релевантная модуляция ISC < 2 Гц, пик 0.1 Гц. Их модель дала R² = 0.30 на новых людях — то есть 4 Гц достаточно для задачи уровня «внимание».
**[ОГР]** Но для детекции фиксаций нужно ≥ 20 Гц, а для морганий — ≥ 15–30 Гц.

**[ИНЖ] Вывод: двухскоростная архитектура не нужна, нужен выбор.**
- Если мы **отказываемся** от blink/alertness (рекомендуется — §3): **5–8 Гц достаточно и научно обосновано**. Наши текущие 5 Гц — правильная величина, проблема только в способе тактирования.
- Если alertness оставляем: **минимум 15 Гц**, что втрое дороже по CPU и всё равно даёт метрику, не переносимую на учебный контекст. Не стоит того.

### 6.4. Нагрузка при видеоконференции на 8 участников

**[ИНЖ]** Разложение (точных публичных бенчмарков MediaPipe в браузере под конференц-нагрузкой найти не удалось — цифры ниже требуют собственного замера):

Что реально стоит CPU:
- **Декодирование 8 входящих потоков** — доминирующая статья. «The lower the total bitrate a device needs to deal with when it has to encode or decode — the lower the CPU use will be.» https://bloggeek.me/webrtc-cpu-group-calls/
- **Кодирование своего исходящего** потока.
- **MediaPipe**: бандл из **трёх** моделей — BlazeFace 192×192 + FaceMesh-V2 256×256 + Blendshape 1×146×2, float16. https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
- **Копирование кадров** main→worker.

**[ИНЖ] Быстрые выигрыши (по убыванию эффекта):**

1. **`outputFaceBlendshapes: false`** — убирает третью модель целиком. Возможно **только** после перехода на геометрический gaze (§1.5, вариант A). Оценочно −20…30 % времени инференса.
2. **Ресайз до 256×256 перед отправкой в worker.** Сейчас передаётся полный `ImageBitmap` (может быть 1280×720), MediaPipe всё равно ужмёт до 256. Делать это через `createImageBitmap(video, {resizeWidth:256, resizeHeight:256, resizeQuality:'low'})` — GPU-путь, почти бесплатно, и сокращает трафик main→worker в ~10 раз. **Бонус для приватности:** через границу потоков ходит уже 256×256, а не полное лицо.
3. **CMF только на своём локальном треке.** Никогда не анализировать удалённые потоки — это и приватность, и ×8 CPU.
4. **Явно задать делегат.** В `createFromOptions` мы не указываем `baseOptions.delegate` → в вебе по умолчанию CPU/WASM. Пробовать `'GPU'` с fallback на `'CPU'`, замерять — на слабых интегрированных GPU иногда медленнее.
5. **Адаптивная частота с обратной связью.** Измерять длительность `detectForVideo`; поддерживать duty cycle ≤ 20–25 %:

```
если p90(inferenceMs) > 0.25 * frameIntervalMs → frameIntervalMs *= 1.5 (до 500 мс = 2 Гц)
если p90(inferenceMs) < 0.10 * frameIntervalMs → frameIntervalMs /= 1.2 (до 125 мс = 8 Гц)
если frameIntervalMs достиг 500 мс и всё ещё не укладывается → перейти в 'degraded'
```

**[ИНЖ] Лестница деградации (4 ступени, каждая должна быть видима пользователю):**

| Ступень | Условие | Действие | Что видит пользователь |
|---|---|---|---|
| `full` | duty < 20 % | 5–8 Гц, все метрики | обычный индикатор |
| `reduced` | duty 20–40 % | 2–3 Гц, только gaze+head, blendshapes off | «упрощённый режим» |
| `minimal` | duty 40–60 % | 1 Гц, только `faceVisible` + `headInFrame` | «базовый режим» |
| `off` | duty > 60 %, или thermal, или ошибка загрузки WASM/модели | пайплайн остановлен, `null` на сервер | **«анализ недоступен на этом устройстве»** |

Уже реализованное `'unavailable'` вместо фейкового скора (`mediapipe.worker.ts`) — правильно; расширить на runtime-деградацию, а не только на ошибку инициализации.

6. **Обязательный пользовательский тумблер** — требование Booth et al. («Users should have agency over the measures including the ability to turn them off»), и одновременно аварийный клапан по производительности.
7. **`document.visibilitychange` → hard pause.** Не полагаться на троттлинг.

---

## 7. EVAL-HARNESS

### 7.1. Что вообще можно «доказать»

**[ДОК]** Ground truth внимания не существует: self-report и наблюдатель «very weakly correlated», и это не лечится тренировкой наблюдателей (Booth et al. 2023).

**[ИНЖ] Следствие — разделить три уровня, и мерить только первые два:**

| Уровень | Что измеряем | Ground truth | Можно ли доказать |
|---|---|---|---|
| **L1. Сенсорный** | «смотрит на экран», «лицо в кадре», «глаза закрыты», «голова повёрнута > 15°» | скриптованное видео + разметка двух независимых аннотаторов, κ между ними | **Да, строго** |
| **L2. Поведенческий** | «отвлёкся» как событие ≥ 5 с вне экрана | то же + BROMP-подобные 20-с окна | **Да, с оговорками** |
| **L3. Ментальный** | «внимателен / вовлечён / понимает» | нет | **Нет. Никогда не заявлять.** |

Весь eval-harness строится на **L1**, частично на L2. Улучшение алгоритма = улучшение на L1/L2.

### 7.2. Дизайн набора ground-truth видео

**[ИНЖ] Структура записи.** Актёр (не ребёнок — на MVP), информированное согласие с правом на публикацию датасета, скрипт с хлопушкой/QR-таймкодом в первом кадре для точной синхронизации разметки.

**Сценарии (каждый 20–30 с, помеченный сегмент):**
1. `attentive_still` — смотрит на экран, минимум движения
2. `attentive_reading` — смотрит на экран, саккады по тексту (**критично**: не должно детектироваться как отвлечение)
3. `attentive_notes` — пишет в тетради, голова опущена, периодически поднимает взгляд (**критично**: это внимание, а не отвлечение — тестирует политику null и штраф за голову)
4. `off_phone` — смотрит вниз-вбок на телефон
5. `off_side` — разговаривает с кем-то вне кадра
6. `off_window` — смотрит в сторону долго
7. `absent` — вышел из кадра
8. `occluded` — рука на лице, подпёр щёку
9. `eyes_closed` — глаза закрыты 3–5 с
10. `blinks` — нормальные моргания (тестирует, что моргание не роняет скор)
11. `head_turn_gaze_on_screen` — голова повёрнута на 25°, глаза на экране (**ключевой тест на конфляцию §1.5**)
12. `head_straight_gaze_off` — голова прямо, глаза вбок

**Оси вариации (каждый сценарий × комбинации):** тон кожи (≥ 4 градации по Fitzpatrick) · очки (нет / прозрачные / бликующие) · головной убор/платок · освещение (равномерное / контровой свет из окна / одна лампа сбоку / низкая освещённость) · дистанция (40 / 60 / 80 см) · высота камеры (над экраном / ноутбук снизу) · разрешение (640×480 / 1280×720) · аспект (4:3 / 16:9 — **обязательно, см. баг §3.2**).

Минимальный жизнеспособный набор: **12 сценариев × 8 условий × 6 актёров ≈ 60–90 минут видео.**

**Разметка:** два независимых аннотатора, покадровые сегменты, отчёт **Cohen's κ между аннотаторами**. Если κ < 0.7 — сценарий переформулировать, он неоднозначен. Публиковать κ вместе с метриками модели: **точность алгоритма не может превышать согласие людей.**

### 7.3. Chrome fake camera

**[ДОК] Флаги:**
```bash
--use-fake-device-for-media-stream        # без него флаг ниже игнорируется
--use-fake-ui-for-media-stream            # автоматически даёт permission
--use-file-for-fake-video-capture=/abs/path/clip.y4m
--use-file-for-fake-audio-capture=/abs/path/clip.wav   # при необходимости
```
Chrome **зациклит** файл. Поддерживаются `.y4m` и `.mjpeg`.
https://testingbot.com/resources/articles/fake-webcam-microphone-chrome

**[ДОК] Проблема C420mpeg2.** ffmpeg пишет в заголовок YUV4MPEG2 цветовое пространство `C420mpeg2`, которое парсер Chrome не принимает. Лечение:
```bash
ffmpeg -i src.mp4 -pix_fmt yuv420p -s 640x480 -r 15 -f yuv4mpegpipe out.y4m
sed -i '' '0,/C420mpeg2/s//C420/' out.y4m     # macOS; на Linux: sed -i '0,/.../s//.../'
```
Замена работает in-place потому, что `C420mpeg2` и `C420` — разной длины, но `sed` переписывает файл целиком; при ручной правке байтов длину нужно сохранять (дополнить пробелами до 9 символов). Формат: https://wiki.multimedia.cx/index.php/YUV4MPEG2 · рецепт: https://cyara.com/blog/y4m-video-chrome/

**[ОГР] Известные подводные камни:**
- Y4M **несжатый**: 640×480 @ 15 fps ≈ 6.9 МБ/с → 30 с ≈ 207 МБ. Держать клипы **короткими (20–30 с) и мелкими (320×240 или 640×480)**, хранить в Git LFS или собирать из mp4 на лету в CI-шаге. Альтернатива — `.mjpeg` (существенно меньше).
- Флаг ломался в отдельных версиях Chromium и в headless-режимах: https://issues.chromium.org/issues/41481476 → **пиновать версию Chromium в CI** и иметь smoke-тест «камера вообще отдаёт кадры».
- Только Chromium. Playwright: передавать args в `launchOptions`; Firefox/WebKit не поддерживают. https://daviddalbusco.com/blog/fake-video-capture-with-playwright/
- Динамическая подмена: Chrome перечитывает файл, поэтому можно менять клип по ходу теста, подменяя файл по пути. https://medium.com/@bshet768/dynamically-inject-webcam-data-in-playwright-tests-using-y4m-d96fdea2545c

### 7.4. Метрики

**[ИНЖ] Не используйте MAE как основную метрику.** MAE против *старой версии алгоритма* — это не точность, а мера расхождения. MAE против *человеческой разметки внимания* невозможна (нет непрерывного ground truth). MAE уместна только для L1-величин с физическим ground truth: угол головы против транспортира.

**Основной набор:**

| Метрика | На чём | Почему |
|---|---|---|
| **AUC-PR** (не ROC) для «off-screen» | покадрово / побакетно | базовая частота отвлечений ~30 % ([ДОК], Booth et al.) — ROC завышает при дисбалансе |
| **F1, precision, recall** при рабочем пороге | побакетно | precision важнее: ложное «отвлёкся» дороже (§4.4) |
| **Matthews CC** | побакетно | устойчива к дисбалансу, одно число |
| **Задержка детекции**: median и **p90** секунд от истинного начала до срабатывания | событийно | продуктовое требование: p90 ≤ 8 с |
| **False alarms / hour** внимательного времени | событийно | понятно продакту и учителю |
| **Miss rate** для событий ≥ 10 с | событийно | короткие отвлечения нам не нужны, длинные — нужны |
| **Flicker rate**: число смен состояния в минуту на *стабильном* сегменте | `attentive_still` | прямая проверка гистерезиса; целевое **< 0.5/мин** |
| **Jitter**: σ(focusIndex) на `attentive_still` | | прямая проверка One-Euro; целевое **σ < 5 пунктов** |
| **Coverage**: доля бакетов с валидным лицом | по каждому условию | если coverage падает на тёмной коже — это баг fairness, а не «плохая камера» |
| **Worst-subgroup F1** | по осям вариации | **главный гейт** — см. ниже |

**[ИНЖ] Событийное сопоставление.** Использовать подход из sound event detection: детекция засчитывается, если её начало попадает в **collar ±2 с** от истинного начала И IoU сегментов ≥ 0.5. Иначе покадровые метрики будут дико оптимистичны из-за автокорреляции.

**[ИНЖ] Сравнение v1 vs v2 — статистика.** Кадры **сильно автокоррелированы**; бутстрап по кадрам завысит значимость на порядки. Правильно: **парный бутстрап на уровне видеоклипов** (resample клипы с возвращением, 10 000 итераций), отчёт ΔAUC-PR с 95 % ДИ. Плюс парный тест Уилкоксона по клипам. При 60–90 клипах это даёт разумную мощность.

**[ИНЖ] Гейт для мержа:**
```
PASS если:
  ΔAUC-PR (v2 − v1) > 0, нижняя граница 95% ДИ > 0
  И worst-subgroup F1(v2) ≥ worst-subgroup F1(v1) − 0.02
  И coverage(v2) ≥ coverage(v1) − 0.01 в КАЖДОЙ подгруппе
  И flicker_rate(v2) ≤ flicker_rate(v1)
  И p90(inferenceMs) не вырос более чем на 15 %
```
Средняя метрика может расти при падении на худшей подгруппе — это регресс справедливости, и он должен блокировать мерж (Booth et al.: «researchers and practitioners must pay extra attention to potential disparities in the resulting trained ML model's performance across groups»).

### 7.5. Борьба с недетерминизмом

**[ДОК]** Источник недетерминизма — неассоциативность IEEE-754 и переупорядочивание редукций GPU-ядрами; одна и та же сеть на разном железе или при повторных запусках даёт слегка разные выходы. Детерминированные реализации могут стоить ~2× производительности.
https://arxiv.org/pdf/2408.05148 · https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/

**[ИНЖ] Трёхуровневая архитектура тестов — главная рекомендация раздела.**

**Уровень 1 — чистые функции (95 % тестов, полностью детерминированы, без браузера).**
`gazeOnScreen`, `eyeOpennessEAR`, `headEuler`, `engagementScore`, `Bucketer`, `AlertnessTracker`, One-Euro, гистерезис — все уже чистые и уже покрыты (`score.test.ts`, `metrics.test.ts`, …). Расширить синтетическими фикстурами лендмарков. Vitest, Node, ноль флейка.

**Уровень 2 — replay-фикстуры (⭐ ключевая идея).**
Прогнать MediaPipe по каждому эталонному видео **один раз** и записать сырые выходы (лендмарки, blendshapes, матрицы, timestamps) в JSON-фикстуру. Дальше **весь скоринговый пайплайн тестируется в Node без браузера, без GPU, полностью детерминированно**. Это отделяет вопрос «изменилась ли модель MediaPipe» от «изменился ли наш алгоритм» — а именно во втором мы и итерируем. Фикстура перегенерируется только при апгрейде версии MediaPipe, и тогда diff метрик — сам по себе полезный сигнал.

*Приватность:* фикстуры содержат лендмарки — то есть ровно то, что не должно покидать устройство пользователя. Поэтому: только **актёры с явным согласием на публикацию**, никогда не данные реальных учеников; фикстуры в отдельном dev-only каталоге, исключённом из production-бандла (проверять тестом на размер/содержимое бандла); документировать в CLAUDE.md.

**Уровень 3 — E2E golden video (3–5 тестов, с допусками).**
Playwright + Chromium + fake camera. Только smoke: «пайплайн запустился», «бакеты приходят с правильной каденцией», «payload содержит только whitelisted-поля», «при скрытой вкладке бакеты не идут».

**[ИНЖ] Правила детерминизма в CI:**
- **Форсировать `delegate: 'CPU'`** в CI-режиме. GPU-делегат никогда не использовать для golden-тестов.
- **Пиновать**: версию Chromium (Playwright), `@mediapipe/tasks-vision`, SHA-256 файла `.task`-модели, SHA-256 WASM-бандла. Любое изменение хеша → отдельный PR с перегенерацией фикстур и отчётом дельт метрик.
- **Допуски вместо равенства**: `|Δscore| ≤ 1` пункт; **метки состояний должны совпадать точно** (если метка флипается от FP-шума — гистерезис настроен слишком узко, и это баг, а не флейк).
- **Тактирование от `mediaTime`**, не от `performance.now()` — при fake camera `mediaTime` монотонен и воспроизводим, что делает нарезку бакетов побитово одинаковой между прогонами.
- **Никаких таймаутов-ожиданий**: `flush()` вызывать явно, ждать конкретных сообщений worker'а.

**[ИНЖ] Тесты инварианта приватности (обязательны, CLAUDE.md §9):**
1. Schema-assert на каждый `postMessage` из worker'а: множество ключей строго равно whitelist'у; ни одно значение не является массивом длины > 16.
2. Playwright + `page.route('**', …)`: перехватить **все** исходящие запросы за 60-секундную сессию, распарсить тела, assert — ни одно тело не содержит массива чисел длиной > 32 и ни одного base64-блоба > 4 КБ.
3. Backend: тест, что ни один GraphQL-резолвер/маршрут не принимает `Upload`/bytes/base64 для медиа (grep по схеме + explicit deny-list test).
4. Тест, что `reportAttention` отклоняет `studentId` из input (берётся из аутентифицированного пользователя).

---

## АНТИОВЕРКЛЕЙМ

### ❌ Формулировки, которые НЕЛЬЗЯ использовать (ни инвестору, ни в UI, ни в маркетинге)

| Запрещено | Почему |
|---|---|
| «Измеряем внимание / концентрацию ученика» | Внимание — латентный конструкт, ненаблюдаемый напрямую: «engagement is a latent construct and **cannot be directly observed**» (Booth et al. 2023) |
| «Определяем вовлечённость» | То же + «gaze is a **limited proxy** for visual attention» |
| «Распознаём эмоции / настроение / интерес / скуку / фрустрацию» | EU AI Act ст. 5(1)(f) — **прямой запрет в образовании**; Barrett et al. 2019 — научно необоснованно |
| «Точность 95 % / 97 %» | Нет ground truth, против которого такое можно измерить. Лучший опубликованный результат на нашем сенсоре — **R² ≈ 0.30** на новых людях |
| «На основе биометрии» | Юридически токсично; наши сигналы — производные скаляры, а не биометрические ПДн в смысле идентификации |
| «Выявляет, понял ли ученик материал» | Никакой связи. Мы не видим когнитивную обработку |
| «Позволяет сравнить учеников класса по вниманию» | Абсолютная шкала невалидна между людьми; self-report валиден только within-learner |
| «Оценка работы учителя по вниманию класса» | «Using models of student engagement to evaluate teachers is similarly **alarming and distressing**» (Booth et al.) |
| «Контроль дисциплины / прокторинг / выявление списывания» | «massive concern about these automated models being used to **surveil students and for the purposes of disciplining**» |
| «PERCLOS / технология из автомобильных систем контроля усталости» | PERCLOS не срабатывает при умеренной депривации, не работает у людей 50+, и авторы обзора прямо пишут, что он **не подходит для inattention/distraction** |
| «Работает у всех одинаково» | Face-детекторы хуже работают на тёмной коже и женских лицах; gaze деградирует в очках и при плохом свете |
| «Не требует калибровки» | Без персональной калибровки ошибка вдвое выше (5.02° → 2.22°) |
| «Наш ИИ понимает состояние ребёнка» | Антропоморфизация + подпадает под эмоциональный запрет |

### ✅ Формулировки, которые можно защитить

**Для инвестора (с цифрами и ссылками):**

> «Мы измеряем **поведенческий прокси зрительного внимания** — долю времени урока, в течение которой взгляд ученика направлен на экран, — вычисляемый полностью на устройстве. Мы не измеряем внимание напрямую: это латентный конструкт. Лучший опубликованный результат для такого класса сигналов на том же сенсоре (MediaPipe FaceLandmarker) — **R² = 0.26–0.30** против объективной меры внимания на **незнакомых** испытуемых (Ortubay, Parra & Madsen, 2024). Мы проектируем систему исходя из этого потолка, а не выше него.»

> «Доказательная база, на которую мы опираемся: (1) синхронность движений глаз предсказывает результаты теста в онлайн-обучении (Madsen et al., PNAS 2021); (2) вебкамера ловит эту синхронность не хуже профессионального трекера, **r = 0.89**; (3) детекция off-task поведения по видео в реальном классе достигает **AUC = 0.816** (Bosch & D'Mello); (4) единственная известная нам RCT, где вмешательство по детекции отвлечения улучшило обучение, дала **d = 0.35 через неделю** при отсутствии немедленного эффекта — то есть эффект есть, он умеренный и отсроченный.»

> «Мы сознательно не делаем распознавание эмоций. Оно запрещено в образовании в ЕС (AI Act ст. 5(1)(f), штраф до 7 % оборота) и научно необоснованно (Barrett et al., 2019). Наше архитектурное решение — только формативная обратная связь, никогда оценивание.»

> «Наш инвариант приватности сильнее регуляторного минимума: кадры, лендмарки и покадровые признаки **физически не покидают устройство**; на сервер уходит один агрегат в 2.5 с из восьми скаляров. Серверного эндпоинта, принимающего медиа, не существует — это проверяется тестом в CI.»

**Для UI (русский, готовые строки):**

| Ключ | Строка |
|---|---|
| `cmf.title` | Фокус на экране |
| `cmf.subtitle` | Ориентировочный показатель. Не оценка и не проверка знаний. |
| `cmf.metric.explain` | Показывает, какую долю времени взгляд был направлен на экран. |
| `cmf.limits` | Показатель приблизительный: очки, освещение и положение камеры влияют на результат. Он не измеряет, насколько вы поняли материал. |
| `cmf.privacy` | Видео анализируется прямо на вашем устройстве. Изображение никуда не отправляется. |
| `cmf.privacy.detail` | Каждые 2,5 секунды на сервер уходит только одно число — усреднённый показатель. Ни кадры, ни черты лица не передаются. |
| `cmf.baseline` | Показатель сравнивается только с вашими собственными предыдущими занятиями. |
| `cmf.nodata` | Нет данных |
| `cmf.nodata.hint` | Лицо не видно в кадре. Это не снижает показатель. |
| `cmf.unavailable` | Анализ недоступен на этом устройстве |
| `cmf.degraded` | Упрощённый режим — устройство сильно загружено |
| `cmf.off` | Анализ выключен |
| `cmf.teacher.hint` | Подсказка для вас, а не оценка ученика. Не используйте для выставления отметок. |
| `cmf.consent.title` | Анализ фокуса внимания |
| `cmf.consent.body` | Можно отключить в любой момент без потери доступа к урокам. |

---

## КОНКРЕТНЫЕ ИНЖЕНЕРНЫЕ РЕКОМЕНДАЦИИ

### A. Баги к немедленному исправлению

| # | Файл | Дефект | Исправление |
|---|---|---|---|
| **B1** | `metrics.ts:earOfEye` | `dist()` в анизотропном нормированном пространстве → EAR занижен на 25 % (4:3) / 44 % (16:9) | умножать Δx на `frameWidth/frameHeight`, либо считать EAR по metric-лендмаркам |
| **B2** | `metrics.ts:headEuler` | `pitch = atan2(fy, fz)` конфлатит с yaw, взрывается при `fz→0`; знаковая конвенция и порядок матрицы не верифицированы | `pitch = asin(-fy_norm)`, `yaw = atan2(fx_norm, fz_norm)`; добавить `roll`; **валидировать по транспортиру до релиза** |
| **B3** | `bucketing.ts:averageSample` | усреднение знаковых углов: −30° и +30° → 0° | агрегировать `mean(abs())` или `outOfToleranceFraction` |
| **B4** | `mediapipe.worker.ts` | в бакет идёт **некалиброванный** `signals.gazeOnScreen`, а в скор — калиброванный | одна нормализованная величина на оба пути |
| **B5** | `score.ts:engagementScore` | `if (!facePresent) return 0` — противоречит null-политике | тип `number \| null`, вернуть `null` |
| **B6** | `score.ts` | `headOut` проверяет `s.gazeOnScreen` (сырой), а произведение использует `gaze` (калиброванный) | использовать одну величину |
| **B7** | `bucketing.ts` | бакет из 1 кадра неотличим от бакета из 12 | добавить `coverage`; не отправлять при `coverage < 0.5` |
| **B8** | `cmfConfig.ts` + worker | 5 Гц через `setTimeout` → дрейф при троттлинге | `requestVideoFrameCallback` + `mediaTime`; hard pause по `visibilitychange` |
| **B9** | `calibration.ts` | READ/RELAX собираются и выбрасываются; в `Baseline` один скаляр | полный профиль (см. §D); добавить off-screen стадию |
| **B10** | `mediapipe.worker.ts` | полный `ImageBitmap` через границу потоков | `createImageBitmap(video, {resizeWidth:256, resizeHeight:256})` |

### B. Параметры фильтрации

```ts
// One-Euro, применять в worker'е ДО скоринга, покомпонентно
oneEuro: {
  headYaw:   { minCutoff: 0.8, beta: 0.02,  dCutoff: 1.0 },  // Гц, градусы
  headPitch: { minCutoff: 0.8, beta: 0.02,  dCutoff: 1.0 },
  headRoll:  { minCutoff: 0.8, beta: 0.02,  dCutoff: 1.0 },
  gazeX:     { minCutoff: 1.2, beta: 0.05,  dCutoff: 1.0 },  // нормированный -1..1
  gazeY:     { minCutoff: 1.2, beta: 0.05,  dCutoff: 1.0 },
  // EAR НЕ фильтровать: моргания — сигнал
}
```
Настройка по протоколу Casiez: сначала `beta = 0`, опускать `minCutoff` до приемлемого джиттера в покое; потом поднимать `beta` до приемлемого лага в движении. Валидировать на сценариях `attentive_still` (метрика: σ) и `head_turn_gaze_on_screen` (метрика: лаг).

### C. Пороги

```ts
export const CMF = {
  // --- каденция ---
  bucketMs: 2_500,
  targetFps: 6,                    // rVFC + децимация; адаптивно 2..8
  maxInferenceDutyCycle: 0.25,     // порог деградации

  // --- gaze (геометрический v2) ---
  gaze: {
    // порог выводится из геометрии, НЕ константа:
    // halfAngleDeg = atan(screenHalfWidthCm / distanceCm) * 180/PI
    // distanceCm — из iris-depth (ошибка ~4.3%, Google)
    screenMarginDeg: 5,            // запас на ошибку оценки взгляда
    minDistanceCm: 30, maxDistanceCm: 80,   // вне диапазона → 'unknown'
    calibrationPoints: 9,
    calibrationDwellMs: 1_200,
    offScreenCalibrationMs: 20_000,
    driftCheckIntervalMs: 15 * 60_000,
  },

  // --- head ---
  headYawToleranceDeg: 20,         // было 15; ±20 покрывает нормальную позу за партой
  headPitchToleranceDeg: 20,
  headRollToleranceDeg: 30,        // наклон к плечу мягче — часто просто поза
  headOffScreenPenalty: 0.6,       // было 0.5; смягчить, штраф и так условный

  // --- eyes ---
  ear: {
    // ПЕРСОНАЛЬНЫЕ, из калибровки. Дефолты — только fallback:
    closedPercentile: 5,           // 5-й перцентиль личного распределения EAR
    openPercentile: 75,            // 75-й перцентиль
    fallbackClosed: 0.15,          // ТОЛЬКО если калибровки нет
    fallbackOpen: 0.30,
    prolongedClosureMs: 2_000,     // > 2 с — это не моргание
  },
  // alertness / blink rate: УДАЛИТЬ на MVP (несовместимо с 6 Гц, не переносимо
  // на учебный контекст, легально рискованно — см. §3, §5)

  // --- гистерезис состояния ---
  hysteresis: {
    enterDistractedBelow: 35,
    exitDistractedAbove: 55,       // ширина 20 пунктов ≥ 2× шума
    enterDwellBuckets: 2,          // 5 с — медленно обвиняем
    exitDwellBuckets: 1,           // 2.5 с — быстро прощаем
  },
  ema: { alphaUp: 0.5, alphaDown: 0.2 },

  // --- качество данных ---
  minBucketCoverage: 0.5,
  liveAttentionStaleMs: 6_000,
} as const;
```

### D. Архитектура скоринга (целевая)

```
        rVFC (main) ──resize 256──> Worker
                                      │
                          FaceLandmarker (numFaces:1, blendshapes:OFF)
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
     iris + eye corners      transformation matrix        eyelid landmarks
            │                         │                         │
   gazeVec_head (2D)          R → yaw/pitch/roll            EAR (aspect-corrected)
            │                         │                         │
            └──── One-Euro ───────────┴──── One-Euro ───────────┘
                          │
              gazeVec_world = R · gazeVec_head        ← развязка головы и глаз
                          │
              + персональная аффинная поправка (9 точек)
                          │
                          ▼
   ┌──────────────── СЛОЙ L1: наблюдаемые состояния ────────────────┐
   │  faceVisible · gazeZone{screen|off|unknown} · headState        │
   │  eyesOpen · isBlink (короткое закрытие → игнор)                │
   └────────────────────────────────────────────────────────────────┘
                          │
                          ▼
   ┌──────────────── СЛОЙ L2: focusIndex за бакет ──────────────────┐
   │  onScreenTime = доля бакета с gazeZone == screen               │
   │  headFactor   = 1.0 | headOffScreenPenalty                     │
   │  focusIndex   = 100 · onScreenTime · headFactor                │
   │  (доля времени, НЕ произведение мгновенных величин)            │
   │  моргания исключены на L1, в focusIndex не входят              │
   └────────────────────────────────────────────────────────────────┘
                          │
              асимметричная EMA + гистерезис + dwell
                          │
                          ▼
   coverage < 0.5 ? SKIP (null) : emit bucket
                          │
                          ▼
   EGRESS (без изменений): { sessionId, bucketStart, avgAttention,
     gazeOnScreen, eyeOpenness, headYaw, headPitch, alertness }
     + coverage        ← новое поле, агрегатный скаляр
     - alertness       ← удалить (см. §3)
```

Инвариант приватности не меняется: наружу по-прежнему только per-bucket агрегатные скаляры, `studentId` — из аутентификации.

### E. Порядок работ

1. **Спринт 1 (неделя):** B1, B2, B3, B5, B6, B7 + протокол валидации знаков позы + расширить unit-тесты. Дешёво, устраняет заведомо неверные числа.
2. **Спринт 2 (неделя):** B8, B10 + rVFC + адаптивная частота + лестница деградации + hard pause. Устраняет дрейф и делает нагрузку предсказуемой.
3. **Спринт 3 (2 недели):** eval-harness — запись 60–90 мин эталонного видео, разметка двумя аннотаторами с κ, replay-фикстуры, метрики + гейт в CI. **До этого шага любое «улучшение алгоритма» недоказуемо.**
4. **Спринт 4 (2–3 недели):** геометрический gaze (§1.5 вариант A) + 9-точечная калибровка + off-screen стадия + `outputFaceBlendshapes: false`. Измерить на харнессе из шага 3.
5. **Позже:** оценить WebEyeTrack/BlazeGaze как замену — только если харнесс покажет, что вариант A не дотягивает.
6. **Параллельно, не блокируется инженерией:** переписать все продуктовые и UI-формулировки по §АНТИОВЕРКЛЕЙМ; удалить `alertness`; добавить пользовательский тумблер выключения CMF.

---

## Источники

**MediaPipe / официальное**
- https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
- https://research.google/blog/mediapipe-iris-real-time-iris-tracking-depth-estimation/
- https://developers.googleblog.com/en/mediapipe-3d-face-transform/

**Gaze**
- https://arxiv.org/pdf/2508.19544 — WebEyeTrack / BlazeGaze · https://github.com/RedForestAI/WebEyeTrack
- https://arxiv.org/pdf/1711.09017 — MPIIGaze
- https://openaccess.thecvf.com/content_WACV_2020/papers/Chen_Offset_Calibration_for_Appearance-Based_Gaze_Estimation_via_Gaze_Decomposition_WACV_2020_paper.pdf
- https://cs.brown.edu/people/apapouts/papers/ijcai2016webgazer.pdf — WebGazer
- https://arxiv.org/pdf/2007.15837 — ETH-XGaze
- https://www.frontiersin.org/journals/robotics-and-ai/articles/10.3389/frobt.2024.1369566/full — зонная точность
- https://www.sciencedirect.com/science/article/pii/S2772766125000655 — scoping review

**Head pose**
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9502716/ — клиническая валидация
- https://gery.casiez.net/1euro/ · https://github.com/casiez/OneEuroFilter

**Моргание / PERCLOS**
- https://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf — Soukupová & Čech, EAR
- https://academic.oup.com/sleepadvances/article/4/1/zpad006/7000589 — обзор PERCLOS 2023
- https://rosap.ntl.bts.gov/view/dot/113 — Dinges et al., валидация PERCLOS
- https://pubmed.ncbi.nlm.nih.gov/27555290/ · https://pubmed.ncbi.nlm.nih.gov/29133149/ — SEBR

**Внимание и обучение**
- https://arxiv.org/pdf/2409.13084 — Ortubay, Parra & Madsen 2024 (⭐ ключевая) · https://github.com/asortubay/timeISC
- https://www.pnas.org/doi/10.1073/pnas.2016980118 — Madsen et al., PNAS 2021
- https://www.colorado.edu/research/ai-institute/sites/default/files/attached-files/booth_et_al._-_2023_-_engagement_detection_and_its_applications_in_learn.pdf — Booth, Bosch & D'Mello 2023 (⭐ ключевая)
- https://dl.acm.org/doi/10.1145/2946837 — Bosch & D'Mello, off-task AUC 0.816
- https://link.springer.com/article/10.1007/s11257-015-9167-1 — gaze → mind wandering
- https://link.springer.com/chapter/10.1007/978-3-031-59717-6_3 — baseline-калибровка

**Регуляторика и этика**
- https://artificialintelligenceact.eu/article/5/
- https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/
- https://journals.sagepub.com/doi/10.1177/1529100619832930 — Barrett et al. 2019

**Производительность и тестирование**
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback · https://web.dev/articles/requestvideoframecallback-rvfc · https://wicg.github.io/video-rvfc/
- https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- https://bloggeek.me/webrtc-cpu-group-calls/
- https://cyara.com/blog/y4m-video-chrome/ · https://wiki.multimedia.cx/index.php/YUV4MPEG2 · https://issues.chromium.org/issues/41481476
- https://daviddalbusco.com/blog/fake-video-capture-with-playwright/
- https://arxiv.org/pdf/2408.05148 — floating-point non-associativity

