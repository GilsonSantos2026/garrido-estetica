// Dados fictícios pré-carregados. Nomes, telefones e e-mails são inventados.
import { DEFAULT_CONSENT_TEXT } from '../domain/constants.js';
import { getFreeSlots, endTime } from '../domain/availability.js';
import { addDays, todayISO, weekday, nowMinutes, toMin } from '../domain/time.js';

export const DB_VERSION = 2;

/** Estrutura vazia: cada chave é uma tabela do banco (ver docs/01-modelagem-banco.md). */
export const emptyDb = () => ({
  version: DB_VERSION,
  settings: defaultSettings(),
  users: [],
  professionals: [],
  services: [],
  packagePlans: [],
  timeBlocks: [],
  clients: [],
  appointments: [],
  clientPackages: [],
  waitlist: [],
  anamneses: [],
  sessionNotes: [],
  evolutionPhotos: [],
  consentTerms: [],
  transactions: [],
});

export function defaultSettings() {
  const day = (open, close, breakStart = '12:00', breakEnd = '13:00') => ({ closed: false, open, close, breakStart, breakEnd });
  return {
    clinicName: 'Garrido Estética',
    whatsapp: '14990000000',
    address: 'Rua das Acácias, 120 – Centro',
    slotStepMin: 15,
    bufferMin: 10,
    minCancelHours: 24,
    minAdvanceMin: 60,
    bookingWindowDays: 60,
    consentText: DEFAULT_CONSENT_TEXT,
    businessHours: {
      0: { closed: true, open: '09:00', close: '13:00', breakStart: '', breakEnd: '' },
      1: day('09:00', '19:00'), 2: day('09:00', '19:00'), 3: day('09:00', '19:00'),
      4: day('09:00', '19:00'), 5: day('09:00', '19:00'),
      6: { closed: false, open: '09:00', close: '14:00', breakStart: '', breakEnd: '' },
    },
  };
}

// Gerador pseudoaleatório com semente fixa: os dados de exemplo são sempre os mesmos.
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Foto ilustrativa (SVG) para a galeria de exemplo. */
function demoPhoto(label, tone) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">
<defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="${tone[0]}"/><stop offset="1" stop-color="${tone[1]}"/></radialGradient></defs>
<rect width="600" height="750" fill="url(#g)"/>
<ellipse cx="300" cy="330" rx="170" ry="220" fill="${tone[2]}" opacity=".55"/>
${label === 'Antes' ? '<g fill="#a86a5a" opacity=".35"><circle cx="230" cy="300" r="14"/><circle cx="370" cy="320" r="10"/><circle cx="260" cy="400" r="12"/><circle cx="350" cy="420" r="16"/><circle cx="310" cy="260" r="8"/></g>' : '<g fill="#a86a5a" opacity=".12"><circle cx="350" cy="420" r="9"/></g>'}
<text x="300" y="700" font-family="Georgia,serif" font-size="40" fill="#5a3d35" text-anchor="middle" opacity=".7">${label} · ilustração</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildSeed(today = todayISO(), nowMin = nowMinutes()) {
  const db = emptyDb();
  const rand = rng(20261117);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const nowStamp = new Date().toISOString();

  db.professionals = [
    { id: 'p1', name: 'Larissa Mendes', title: 'Esteticista facial', color: '#1e3a6e', serviceIds: ['s1', 's3', 's4', 's5', 's7'], active: true },
    { id: 'p2', name: 'Bianca Rocha', title: 'Terapeuta corporal', color: '#5f6875', serviceIds: ['s2', 's6', 's7'], active: true },
  ];

  db.services = [
    { id: 's1', name: 'Limpeza de pele profunda', category: 'Facial', price: 150, durationMin: 60, requiresConsent: false, active: true, description: 'Higienização, extração e máscara calmante.' },
    { id: 's2', name: 'Drenagem linfática', category: 'Corporal', price: 120, durationMin: 50, requiresConsent: false, active: true, description: 'Reduz retenção de líquido e inchaço.' },
    { id: 's3', name: 'Design de sobrancelha', category: 'Facial', price: 60, durationMin: 30, requiresConsent: false, active: true, description: 'Mapeamento e design com pinça e linha.' },
    { id: 's4', name: 'Peeling químico', category: 'Facial', price: 220, durationMin: 45, requiresConsent: true, active: true, description: 'Renovação celular para manchas e textura.' },
    { id: 's5', name: 'Microagulhamento', category: 'Facial', price: 350, durationMin: 75, requiresConsent: true, active: true, description: 'Estímulo de colágeno para cicatrizes e poros.' },
    { id: 's6', name: 'Massagem modeladora', category: 'Corporal', price: 130, durationMin: 50, requiresConsent: false, active: true, description: 'Manobras intensas para contorno corporal.' },
    { id: 's7', name: 'Radiofrequência facial', category: 'Facial', price: 180, durationMin: 40, requiresConsent: false, active: true, description: 'Firmeza e combate à flacidez.' },
  ];

  db.packagePlans = [
    { id: 'pp1', serviceId: 's2', name: 'Drenagem – 10 sessões', sessions: 10, price: 1000, validityDays: 120, active: true },
    { id: 'pp2', serviceId: 's6', name: 'Modeladora – 5 sessões', sessions: 5, price: 590, validityDays: 90, active: true },
    { id: 'pp3', serviceId: 's5', name: 'Microagulhamento – 4 sessões', sessions: 4, price: 1200, validityDays: 180, active: true },
  ];

  const people = [
    ['c1', 'Marina Souza', '14991112233', 'marina.souza@exemplo.com', '1992-03-14', 'Prefere horários à tarde. Pele sensível.'],
    ['c2', 'Camila Ribeiro', '14992223344', 'camila.ribeiro@exemplo.com', '1988-07-02', 'Faz drenagem semanal.'],
    ['c3', 'Juliana Prado', '14993334455', 'juliana.prado@exemplo.com', '1996-11-21', ''],
    ['c4', 'Patrícia Alves', '14995556677', 'patricia.alves@exemplo.com', '1979-01-30', 'Indicação da Camila.'],
    ['c5', 'Renata Costa', '14996667788', 'renata.costa@exemplo.com', '1990-05-09', ''],
    ['c6', 'Beatriz Nogueira', '14997778899', 'beatriz.n@exemplo.com', '2000-09-17', 'Estudante, prefere sábados.'],
    ['c7', 'Luana Martins', '14998889900', 'luana.martins@exemplo.com', '1985-12-04', ''],
    ['c8', 'Fernanda Lima', '14994445566', 'fernanda.lima@exemplo.com', '1994-04-26', ''],
    ['c9', 'Gabriela Torres', '14991230001', 'gabriela.t@exemplo.com', '1991-02-11', ''],
    ['c10', 'Helena Duarte', '14991230002', 'helena.duarte@exemplo.com', '1983-08-23', 'Prefere manhãs.'],
    ['c11', 'Isabela Freitas', '14991230003', 'isabela.f@exemplo.com', '1998-10-05', ''],
    ['c12', 'Jéssica Moraes', '14991230004', 'jessica.moraes@exemplo.com', '1993-06-18', ''],
    ['c13', 'Karina Lopes', '14991230005', 'karina.lopes@exemplo.com', '1987-03-29', ''],
    ['c14', 'Larissa Pinto', '14991230006', 'larissa.pinto@exemplo.com', '1995-12-12', ''],
    ['c15', 'Mariana Teixeira', '14991230007', 'mariana.t@exemplo.com', '1989-09-01', ''],
    ['c16', 'Natália Barros', '14991230008', 'natalia.barros@exemplo.com', '2001-01-20', ''],
    ['c17', 'Olívia Cardoso', '14991230009', 'olivia.c@exemplo.com', '1976-07-07', ''],
    ['c18', 'Priscila Melo', '14991230010', 'priscila.melo@exemplo.com', '1992-11-30', ''],
    ['c19', 'Raquel Vieira', '14991230011', 'raquel.v@exemplo.com', '1984-04-14', ''],
    ['c20', 'Sabrina Rocha', '14991230012', 'sabrina.r@exemplo.com', '1997-05-22', ''],
  ];
  db.clients = people.map(([id, name, whatsapp, email, birthDate, notes]) => ({ id, name, whatsapp, email, birthDate, notes, createdAt: addDays(today, -90) }));

  // Conta de demonstração do portal (entra pelo botão "cliente de demonstração", sem senha).
  db.users = [{ id: 'u1', role: 'client', email: 'marina.souza@exemplo.com', clientId: 'c1', demo: true, passwordHash: null, salt: null }];

  db.timeBlocks = [{ id: 'tb1', professionalId: 'p1', date: nextWeekday(today, 4), start: '14:00', end: '16:00', reason: 'Curso de atualização' }];

  // Pacotes vendidos (sessões usadas são contadas abaixo, conforme os atendimentos concluídos)
  db.clientPackages = [
    { id: 'cp1', clientId: 'c2', packagePlanId: 'pp1', serviceId: 's2', totalSessions: 10, usedSessions: 0, pricePaid: 1000, paymentMethod: 'pix', soldAt: addDays(today, -28), expiresAt: addDays(today, 92) },
    { id: 'cp2', clientId: 'c1', packagePlanId: 'pp3', serviceId: 's5', totalSessions: 4, usedSessions: 0, pricePaid: 1200, paymentMethod: 'credito', soldAt: addDays(today, -20), expiresAt: addDays(today, 160) },
    { id: 'cp3', clientId: 'c4', packagePlanId: 'pp2', serviceId: 's6', totalSessions: 5, usedSessions: 0, pricePaid: 590, paymentMethod: 'debito', soldAt: addDays(today, -15), expiresAt: addDays(today, 75) },
  ];
  for (const p of db.clientPackages) {
    db.transactions.push({ id: `t-${p.id}`, type: 'entrada', category: 'pacote', description: `Pacote ${db.packagePlans.find((x) => x.id === p.packagePlanId).name}`, amount: p.pricePaid, method: p.paymentMethod, status: 'pago', dueDate: p.soldAt, paidAt: p.soldAt, clientPackageId: p.id, appointmentId: null, createdAt: nowStamp });
  }

  // Agendamentos: preferências fixas de alguns clientes + aleatórios encaixados nos horários livres
  const fixed = [
    // [cliente, serviço, profissional, dia relativo, pacote?]
    ['c2', 's2', 'p2', -21, 'cp1'], ['c2', 's2', 'p2', -14, 'cp1'], ['c2', 's2', 'p2', -7, 'cp1'], ['c2', 's2', 'p2', 0, 'cp1'], ['c2', 's2', 'p2', 7, 'cp1'],
    ['c1', 's5', 'p1', -18, 'cp2'], ['c1', 's4', 'p1', -40, null], ['c1', 's5', 'p1', 3, 'cp2'],
    ['c4', 's6', 'p2', -10, 'cp3'], ['c4', 's6', 'p2', -3, 'cp3'], ['c4', 's6', 'p2', 4, 'cp3'],
  ];
  const svc = (id) => db.services.find((s) => s.id === id);
  let n = 0;
  const place = (clientId, serviceId, professionalId, date, packageId, preferAfternoon) => {
    const s = svc(serviceId);
    const free = getFreeSlots({ date, durationMin: s.durationMin, professionalId, settings: db.settings, appointments: db.appointments, timeBlocks: db.timeBlocks });
    if (!free.length) return null;
    const pool = preferAfternoon ? free.filter((t) => t >= '13:00') : free;
    const start = pick(pool.length ? pool : free);
    const rel = Math.round((new Date(`${date}T12:00`) - new Date(`${today}T12:00`)) / 864e5);
    let status;
    if (rel < 0) status = rand() < 0.86 ? 'concluido' : pick(['faltou', 'cancelado']);
    else if (rel === 0) {
      // Hoje: o que já passou foi concluído, o que está acontecendo agora está em atendimento
      const st = toMin(start);
      const en = st + s.durationMin;
      status = en <= nowMin ? 'concluido' : st <= nowMin ? 'em_atendimento' : pick(['agendado', 'confirmado', 'confirmado']);
    }
    else status = rand() < 0.45 ? 'confirmado' : 'agendado';
    if (packageId && status !== 'concluido' && rel < 0) status = 'concluido';
    const a = {
      id: `a${++n}`, clientId, professionalId, serviceId, date, start, end: endTime(start, s.durationMin), status,
      source: rand() < 0.4 ? 'online' : 'interno', price: s.price, clientPackageId: null, paymentMethod: null,
      notes: '', createdAt: nowStamp, cancelledAt: status === 'cancelado' ? nowStamp : null,
    };
    if (status === 'concluido') {
      if (packageId) {
        a.clientPackageId = packageId;
        a.paymentMethod = 'pacote';
        db.clientPackages.find((p) => p.id === packageId).usedSessions += 1;
      } else {
        a.paymentMethod = pick(['pix', 'pix', 'credito', 'debito', 'dinheiro']);
        db.transactions.push({ id: `t-${a.id}`, type: 'entrada', category: 'atendimento', description: s.name, amount: s.price, method: a.paymentMethod, status: 'pago', dueDate: date, paidAt: date, appointmentId: a.id, clientPackageId: null, professionalId, createdAt: nowStamp });
      }
    }
    db.appointments.push(a);
    return a;
  };

  for (const [c, s, p, rel, pk] of fixed) {
    const date = addDays(today, rel);
    if (db.settings.businessHours[weekday(date)].closed) continue;
    place(c, s, p, date, pk, c === 'c1');
  }
  const online = db.appointments.find((a) => a.clientId === 'c1' && a.date > today);
  if (online) online.source = 'online';

  const casual = db.clients.map((c) => c.id).filter((id) => !['c2', 'c4'].includes(id));
  for (let rel = -35; rel <= 14; rel++) {
    const date = addDays(today, rel);
    if (db.settings.businessHours[weekday(date)].closed) continue;
    for (const prof of db.professionals) {
      const count = rel <= 0 ? 2 + Math.floor(rand() * 3) : Math.floor(rand() * 3);
      for (let i = 0; i < count; i++) {
        const free = casual.filter((c) => !db.appointments.some((a) => a.clientId === c && a.date === date));
        if (free.length) place(pick(free), pick(prof.serviceIds), prof.id, date, null, false);
      }
    }
  }
  db.appointments.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  // Despesas: contas pagas e a pagar
  const exp = (id, description, category, amount, rel, paid) => {
    const due = addDays(today, rel);
    db.transactions.push({ id, type: 'saida', category, description, amount, method: paid ? 'pix' : null, status: paid ? 'pago' : 'pendente', dueDate: due, paidAt: paid ? due : null, appointmentId: null, clientPackageId: null, createdAt: nowStamp });
  };
  exp('x1', 'Aluguel da sala', 'Aluguel', 2200, -12, true);
  exp('x2', 'Ácidos e cosméticos (fornecedor)', 'Insumos', 640, -9, true);
  exp('x3', 'Descartáveis e luvas', 'Insumos', 180, -2, true);
  exp('x4', 'Comissão Bianca – quinzena', 'Comissões', 950, -5, true);
  exp('x5', 'Energia elétrica', 'Energia e água', 310, 3, false);
  exp('x6', 'Comissão Larissa – quinzena', 'Comissões', 1150, 6, false);
  exp('x7', 'Impulsionamento Instagram', 'Marketing', 150, 10, false);
  exp('x8', 'Aluguel da sala (mês anterior)', 'Aluguel', 2200, -42, true);

  db.waitlist = [
    { id: 'w1', clientId: 'c8', name: 'Fernanda Lima', whatsapp: '14994445566', serviceId: 's4', preferredPeriod: 'Manhã', notes: 'Pode sair do trabalho com 1 h de aviso', createdAt: nowStamp },
    { id: 'w2', clientId: null, name: 'Aline Torres', whatsapp: '14990001122', serviceId: 's2', preferredPeriod: 'Tarde', notes: 'Cliente nova, veio pelo Instagram', createdAt: nowStamp },
  ];

  db.anamneses = [
    {
      id: 'an1', clientId: 'c1', updatedAt: addDays(today, -40),
      mainComplaint: 'Manchas e textura irregular na bochecha', goal: 'Uniformizar o tom da pele',
      health: { conditions: [], surgeries: 'Nenhuma', pregnant: 'Não', notes: '' },
      allergies: 'Sensibilidade a ácido glicólico', medications: 'Anticoncepcional oral',
      habits: { smoke: 'Não', alcohol: 'Social', water: '1 a 2 L', activity: '1–2×/semana', sleep: '6 a 8 h', sunscreen: 'Às vezes', homeCare: 'Sabonete facial e hidratante', previousProcedures: 'Limpeza de pele (2025)' },
      facialEval: { skinType: 'Sensível', phototype: 'III', complaints: ['Manchas', 'Poros dilatados'], notes: 'Hiperpigmentação pós-inflamatória em malar.' },
      bodyEval: { weight: '', height: '', waist: '', hip: '', abdomen: '', complaints: [], notes: '' },
    },
    {
      id: 'an2', clientId: 'c3', updatedAt: addDays(today, -60),
      mainComplaint: 'Sobrancelhas falhadas', goal: 'Desenho mais natural',
      health: { conditions: [], surgeries: '', pregnant: 'Não', notes: '' },
      allergies: 'Látex', medications: '',
      habits: { smoke: 'Não', alcohol: 'Não', water: 'Mais de 2 L', activity: '3×/semana ou mais', sleep: 'Mais de 8 h', sunscreen: 'Diariamente', homeCare: '', previousProcedures: '' },
      facialEval: { skinType: 'Mista', phototype: 'IV', complaints: [], notes: '' },
      bodyEval: { weight: '', height: '', waist: '', hip: '', abdomen: '', complaints: [], notes: '' },
    },
    {
      id: 'an3', clientId: 'c2', updatedAt: addDays(today, -28),
      mainComplaint: 'Inchaço nas pernas no fim do dia', goal: 'Reduzir retenção',
      health: { conditions: ['Hipertensão'], surgeries: 'Cesárea (2019)', pregnant: 'Não', notes: 'Pressão controlada com medicação.' },
      allergies: '', medications: 'Losartana 50 mg',
      habits: { smoke: 'Não', alcohol: 'Não', water: 'Menos de 1 L', activity: 'Sedentário', sleep: '6 a 8 h', sunscreen: 'Às vezes', homeCare: '', previousProcedures: 'Drenagem (2024)' },
      facialEval: { skinType: 'Normal', phototype: 'II', complaints: [], notes: '' },
      bodyEval: { weight: '68', height: '1,64', waist: '78', hip: '102', abdomen: '86', complaints: ['Retenção de líquido', 'Celulite'], notes: 'Edema em membros inferiores.' },
    },
  ];

  const firstMicro = db.appointments.find((a) => a.clientId === 'c1' && a.serviceId === 's5' && a.status === 'concluido');
  const peel = db.appointments.find((a) => a.clientId === 'c1' && a.serviceId === 's4' && a.status === 'concluido');
  db.consentTerms = [
    peel && { id: 'ct1', clientId: 'c1', serviceId: 's4', appointmentId: peel.id, termText: db.settings.consentText, signature: null, acceptedAt: `${peel.date}T${peel.start}:00`, acceptedVia: 'clinica' },
    firstMicro && { id: 'ct2', clientId: 'c1', serviceId: 's5', appointmentId: firstMicro.id, termText: db.settings.consentText, signature: null, acceptedAt: `${firstMicro.date}T${firstMicro.start}:00`, acceptedVia: 'portal' },
  ].filter(Boolean);

  const toneA = ['#f3d9cf', '#d9a896', '#e8bfae'];
  const toneB = ['#f8e7df', '#e6c2b2', '#f0d3c6'];
  db.evolutionPhotos = [
    { id: 'ph1', clientId: 'c1', appointmentId: peel?.id ?? null, takenAt: peel?.date ?? addDays(today, -40), kind: 'antes', area: 'Face – bochecha direita', dataUrl: demoPhoto('Antes', toneA), notes: 'Início do tratamento' },
    { id: 'ph2', clientId: 'c1', appointmentId: firstMicro?.id ?? null, takenAt: firstMicro?.date ?? addDays(today, -18), kind: 'depois', area: 'Face – bochecha direita', dataUrl: demoPhoto('Depois', toneB), notes: 'Após peeling + 1ª sessão de microagulhamento' },
  ];

  db.sessionNotes = [
    peel && { id: 'sn1', clientId: 'c1', appointmentId: peel.id, serviceId: 's4', date: peel.date, protocol: 'Peeling', text: 'Protocolo: Peeling\n1. Checar contraindicações e fototipo\n2. Ácido mandélico 30% por 4 min\n3. Neutralização e calmante', reactions: 'Eritema leve, resolvido em 2 h' },
  ].filter(Boolean);

  return db;
}

function nextWeekday(today, wd) {
  let d = addDays(today, 1);
  while (weekday(d) !== wd) d = addDays(d, 1);
  return d;
}
