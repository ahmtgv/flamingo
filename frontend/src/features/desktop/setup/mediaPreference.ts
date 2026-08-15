/**
 * Какие камеру и микрофон выбрал преподаватель на шаге 4 — и что берётся на уроке.
 *
 * 🔴 Требование владельца (промпт 21 §3.2 п.5): «выбор запоминается и используется на уроке».
 * Без этого проверка на шаге 4 — вежливый вопрос без последствий: человек выбирает внешнюю
 * камеру, а урок всё равно открывает встроенную.
 *
 * Хранится на машине и никуда не отправляется: это настройка железа, а не данные о человеке.
 */

const CAMERA_KEY = 'flamingo.device.camera';
const MIC_KEY = 'flamingo.device.mic';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* хранилище недоступно — урок всё равно откроет устройства по умолчанию */
  }
}

export function rememberDevices(cameraId: string | null, micId: string | null): void {
  write(CAMERA_KEY, cameraId);
  write(MIC_KEY, micId);
}

/**
 * Ограничения для `getUserMedia` на уроке — с выбранными устройствами, если они выбраны.
 *
 * ⚠️ `ideal`, а не `exact`: выбранная камера может быть отключена к моменту урока, и в этом
 * случае занятие должно начаться с той, что есть, а не отказать. Отказ здесь стоил бы урока.
 */
export function preferredConstraints(): MediaStreamConstraints {
  const camera = read(CAMERA_KEY);
  const mic = read(MIC_KEY);
  return {
    video: camera ? { deviceId: { ideal: camera } } : true,
    audio: mic ? { deviceId: { ideal: mic } } : true,
  };
}
