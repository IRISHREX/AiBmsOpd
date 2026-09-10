export function dobToAgeParts(dob: string | Date | undefined): { years: number; months: number; days: number } | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  if (isNaN(birth.getTime())) return null;

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  if (years < 0) return { years: 0, months: 0, days: 0 };

  return { years, months, days };
}

function plural(n: number, singular: string, pluralForm?: string) {
  if (n === 1) return `${n} ${singular}`;
  return `${n} ${pluralForm || singular + 's'}`;
}

export function formatAge(parts: { years: number; months: number; days: number } | null): string {
  if (!parts) return '';
  const { years = 0, months = 0, days = 0 } = parts;
  return `${plural(years, 'year', 'years')} ${plural(months, 'month', 'months')} ${plural(days, 'day', 'days')}`.trim();
}

export function dobToAge(dob: string | Date | undefined): string {
  const parts = dobToAgeParts(dob);
  return parts ? formatAge(parts) : '';
}

export function dobToAgeYears(dob: string | Date | undefined): number {
  const parts = dobToAgeParts(dob);
  return parts ? parts.years : 0;
}

export function ageToDob(age: number | string | undefined | null): string {
  if (age === undefined || age === null || isNaN(Number(age))) return '';
  const today = new Date();
  const birthYear = today.getFullYear() - Number(age);
  return new Date(birthYear, 6, 1).toISOString().split('T')[0];
}
