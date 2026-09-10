export function makeNIC(phone: string | undefined, age: number | string | undefined): string {
  if (!phone || phone.length !== 11 || !age) return '';
  const now = new Date();
  const birthYear = (now.getFullYear() - Number(age)).toString().slice(-2);
  return phone + birthYear;
}
