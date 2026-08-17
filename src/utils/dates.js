/**
 * Date and time helper utilities
 */

/**
 * Returns today's date as YYYY-MM-DD string.
 */
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Formats a date string (YYYY-MM-DD) to Brazilian format (DD/MM/YYYY).
 */
export function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Returns relative days label: "Hoje", "Amanhã", "Em X dias", "X dias atrás"
 */
export function relativeDays(dateStr) {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  if (diff > 0) return `Em ${diff} dias`;
  return `Há ${Math.abs(diff)} dias`;
}

/**
 * Check if a date string is within N days from today.
 */
export function isWithinDays(dateStr, n) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= n;
}

/**
 * Check if a date is overdue (before today)
 */
export function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return target < today;
}

/**
 * Returns an array of Date objects for a given month/year
 */
export function getMonthDays(year, month) {
  const days = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Fill leading empty days (start week on Sunday)
  const startPad = firstDay.getDay();
  for (let i = 0; i < startPad; i++) {
    days.push(null);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

/**
 * Formats minutes to "Xh Ymin"
 */
export function formatMinutes(totalMinutes) {
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * Formats seconds as MM:SS
 */
export function formatTimer(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Short weekday names in Portuguese
 */
export const SHORT_WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
