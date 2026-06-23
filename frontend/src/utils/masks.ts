export const maskCnpj = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (v.length > 14) v = v.slice(0, 14);
  if (v.length > 12) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
  if (v.length > 8) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, '$1.$2.$3/$4');
  if (v.length > 5) return v.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
  if (v.length > 2) return v.replace(/^(\d{2})(\d{1,3}).*/, '$1.$2');
  return v;
};

export const maskCpf = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 9) return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4');
  if (v.length > 6) return v.replace(/^(\d{3})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
  if (v.length > 3) return v.replace(/^(\d{3})(\d{1,3}).*/, '$1.$2');
  return v;
};

export const maskPhone = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  if (v.length > 0) return v.replace(/^(\d{1,2})/, '($1');
  return v;
};

export const maskCep = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (v.length > 8) v = v.slice(0, 8);
  if (v.length > 5) return v.replace(/^(\d{5})(\d{3}).*/, '$1-$2');
  return v;
};
