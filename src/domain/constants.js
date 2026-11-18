export const STATUS = {
  agendado: { label: 'Agendado', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  confirmado: { label: 'Confirmado', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  em_atendimento: { label: 'Em atendimento', cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  concluido: { label: 'Concluído', cls: 'bg-mist-100 text-graphite-700 ring-mist-300' },
  faltou: { label: 'Faltou', cls: 'bg-red-50 text-red-700 ring-red-200' },
  cancelado: { label: 'Cancelado', cls: 'bg-mist-100 text-graphite-500 ring-mist-300 line-through' },
};

/** Fluxo normal de um atendimento. Faltou/cancelado são saídas laterais. */
export const STATUS_FLOW = ['agendado', 'confirmado', 'em_atendimento', 'concluido'];

/** Status que ocupam horário na agenda. */
export const ACTIVE_STATUS = ['agendado', 'confirmado', 'em_atendimento', 'concluido'];

export const SOURCE = {
  online: { label: 'Online (portal)', dot: 'bg-brand-500', block: 'bg-brand-100 border-brand-400 text-brand-800' },
  interno: { label: 'Interno (clínica)', dot: 'bg-graphite-600', block: 'bg-mist-100 border-graphite-500 text-graphite-800' },
};

export const PAYMENT_METHODS = {
  pix: 'Pix',
  credito: 'Crédito',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
  pacote: 'Abater de pacote',
};

export const EXPENSE_CATEGORIES = ['Insumos', 'Aluguel', 'Comissões', 'Energia e água', 'Marketing', 'Equipamentos', 'Impostos', 'Outros'];

export const INCOME_CATEGORIES = { atendimento: 'Atendimento', pacote: 'Venda de pacote', outros: 'Outros' };

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const PERIODS = ['Qualquer horário', 'Manhã', 'Tarde', 'Noite'];

// Listas da anamnese (herdadas do app v1 e ampliadas)
export const HEALTH_CONDITIONS = [
  'Diabetes', 'Hipertensão', 'Gestante', 'Lactante', 'Marca-passo', 'Cardiopatia', 'Epilepsia',
  'Tireoide', 'Herpes', 'Oncológico', 'Queloide', 'Anticoagulante', 'Isotretinoína', 'Implante metálico',
  'Distúrbio circulatório', 'Doença autoimune',
];
export const FACIAL_COMPLAINTS = ['Manchas', 'Acne', 'Rosácea', 'Melasma', 'Rugas', 'Flacidez facial', 'Poros dilatados', 'Olheiras', 'Oleosidade'];
export const BODY_COMPLAINTS = ['Celulite', 'Gordura localizada', 'Estrias', 'Flacidez corporal', 'Retenção de líquido', 'Pós-operatório'];
export const SKIN_TYPES = ['Normal', 'Seca', 'Oleosa', 'Mista', 'Sensível'];
export const PHOTOTYPES = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export const PROTOCOLS = {
  'Limpeza de pele': ['Higienização e demaquilagem', 'Avaliação da pele e esfoliação suave', 'Vapor de ozônio (3–5 min)', 'Extração, se necessário', 'Alta frequência', 'Máscara calmante e protetor solar'],
  'Drenagem linfática': ['Avaliação e medidas', 'Ativação dos linfonodos principais', 'Manobras de bombeamento e rotação', 'Finalização com deslizamento suave', 'Orientar hidratação e repouso'],
  Peeling: ['Checar contraindicações e fototipo', 'Higienização e desengorduramento', 'Aplicação do ácido e controle de tempo', 'Neutralização e remoção', 'Calmante e protetor solar FPS 50+'],
  Microagulhamento: ['Assepsia e anestésico tópico', 'Definir profundidade da agulha por área', 'Deslizamentos em várias direções', 'Ativos pós-procedimento', 'Orientar cuidados e evitar sol por 7 dias'],
  'Massagem modeladora': ['Avaliação corporal e medidas', 'Óleo ou creme de deslizamento', 'Manobras profundas nas áreas-alvo', 'Finalização relaxante', 'Orientar hidratação'],
};

export const DEFAULT_CONSENT_TEXT =
  'Declaro que as informações prestadas na ficha de anamnese são verdadeiras. Fui informado(a) sobre o procedimento, ' +
  'seus objetivos, riscos, possíveis reações e cuidados pré e pós-procedimento, e tive a oportunidade de esclarecer minhas dúvidas. ' +
  'Autorizo a realização do procedimento e o registro fotográfico para acompanhamento da evolução, de uso exclusivo do prontuário.';
