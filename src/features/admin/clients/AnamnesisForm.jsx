import { useState } from 'react';
import { HeartPulse, Pill, Coffee, Smile, PersonStanding, Save } from 'lucide-react';
import { useStore } from '../../../store/StoreContext.jsx';
import { BODY_COMPLAINTS, FACIAL_COMPLAINTS, HEALTH_CONDITIONS, PHOTOTYPES, SKIN_TYPES } from '../../../domain/constants.js';
import { fmtBR } from '../../../domain/time.js';
import { Button, Card, Chips, Field, Input, Select, Textarea, cx } from '../../../components/ui.jsx';

const EMPTY = {
  mainComplaint: '', goal: '',
  health: { conditions: [], surgeries: '', pregnant: 'Não', notes: '' },
  allergies: '', medications: '',
  habits: { smoke: '', alcohol: '', water: '', activity: '', sleep: '', sunscreen: '', homeCare: '', previousProcedures: '' },
  facialEval: { skinType: '', phototype: '', complaints: [], notes: '' },
  bodyEval: { weight: '', height: '', waist: '', hip: '', abdomen: '', complaints: [], notes: '' },
};

const SECTIONS = [
  { id: 'saude', label: 'Histórico de saúde', icon: HeartPulse },
  { id: 'alergias', label: 'Alergias e medicamentos', icon: Pill },
  { id: 'habitos', label: 'Hábitos diários', icon: Coffee },
  { id: 'facial', label: 'Avaliação facial', icon: Smile },
  { id: 'corporal', label: 'Avaliação corporal', icon: PersonStanding },
];

/** Ficha de anamnese estruturada em seções (abas internas). */
export default function AnamnesisForm({ clientId }) {
  const { db, tryAct } = useStore();
  const saved = db.anamneses.find((a) => a.clientId === clientId);
  const [f, setF] = useState(() => structuredClone({ ...EMPTY, ...(saved || {}) }));
  const [sec, setSec] = useState('saude');
  const set = (path, v) => setF((s) => {
    const n = structuredClone(s);
    const keys = path.split('.');
    let o = n;
    keys.slice(0, -1).forEach((k) => { o = o[k]; });
    o[keys.at(-1)] = v;
    return n;
  });
  const bind = (path) => ({ value: path.split('.').reduce((o, k) => o?.[k], f) ?? '', onChange: (e) => set(path, e.target.value) });
  const opt = (arr) => ['', ...arr].map((x) => ({ value: x, label: x || '—' }));

  const save = () => {
    const { id, clientId: _c, updatedAt, ...data } = f;
    tryAct('saveAnamnesis', { clientId, data }, 'Anamnese salva.');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div className="flex gap-2 overflow-x-auto lg:flex-col">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" onClick={() => setSec(s.id)}
            className={cx('flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium', sec === s.id ? 'bg-brand-100 text-brand-800' : 'text-graphite-600 hover:bg-mist-100')}>
            <s.icon className="h-4 w-4" strokeWidth={1.8} />{s.label}
          </button>
        ))}
        <p className="hidden px-3 pt-2 text-xs text-graphite-400 lg:block">{saved ? `Atualizada em ${fmtBR(saved.updatedAt)}` : 'Ainda não preenchida'}</p>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="space-y-4">
          {sec === 'saude' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Queixa principal"><Input {...bind('mainComplaint')} /></Field>
                <Field label="Objetivo do tratamento"><Input {...bind('goal')} /></Field>
              </div>
              <Field label="Condições de saúde"><Chips options={HEALTH_CONDITIONS} value={f.health.conditions} onChange={(v) => set('health.conditions', v)} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Gestante / lactante"><Select {...bind('health.pregnant')} options={opt(['Não', 'Gestante', 'Lactante'])} /></Field>
                <Field label="Cirurgias anteriores"><Input {...bind('health.surgeries')} /></Field>
              </div>
              <Field label="Observações de saúde"><Textarea {...bind('health.notes')} /></Field>
            </>
          )}
          {sec === 'alergias' && (
            <>
              <Field label="Alergias (cosméticos, ácidos, látex, anestésicos…)"><Textarea {...bind('allergies')} /></Field>
              <Field label="Medicamentos em uso"><Textarea {...bind('medications')} /></Field>
            </>
          )}
          {sec === 'habitos' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Fuma"><Select {...bind('habits.smoke')} options={opt(['Não', 'Sim', 'Ex-fumante'])} /></Field>
                <Field label="Álcool"><Select {...bind('habits.alcohol')} options={opt(['Não', 'Social', 'Frequente'])} /></Field>
                <Field label="Água por dia"><Select {...bind('habits.water')} options={opt(['Menos de 1 L', '1 a 2 L', 'Mais de 2 L'])} /></Field>
                <Field label="Atividade física"><Select {...bind('habits.activity')} options={opt(['Sedentário', '1–2×/semana', '3×/semana ou mais'])} /></Field>
                <Field label="Sono"><Select {...bind('habits.sleep')} options={opt(['Menos de 6 h', '6 a 8 h', 'Mais de 8 h'])} /></Field>
                <Field label="Protetor solar"><Select {...bind('habits.sunscreen')} options={opt(['Diariamente', 'Às vezes', 'Nunca'])} /></Field>
              </div>
              <Field label="Cuidados em casa (produtos)"><Textarea {...bind('habits.homeCare')} /></Field>
              <Field label="Procedimentos estéticos anteriores"><Textarea {...bind('habits.previousProcedures')} /></Field>
            </>
          )}
          {sec === 'facial' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tipo de pele"><Select {...bind('facialEval.skinType')} options={opt(SKIN_TYPES)} /></Field>
                <Field label="Fototipo (Fitzpatrick)"><Select {...bind('facialEval.phototype')} options={opt(PHOTOTYPES)} /></Field>
              </div>
              <Field label="Queixas faciais"><Chips options={FACIAL_COMPLAINTS} value={f.facialEval.complaints} onChange={(v) => set('facialEval.complaints', v)} /></Field>
              <Field label="Avaliação / observações"><Textarea {...bind('facialEval.notes')} /></Field>
            </>
          )}
          {sec === 'corporal' && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Field label="Peso (kg)"><Input inputMode="decimal" {...bind('bodyEval.weight')} /></Field>
                <Field label="Altura (m)"><Input inputMode="decimal" {...bind('bodyEval.height')} /></Field>
                <Field label="Cintura (cm)"><Input inputMode="decimal" {...bind('bodyEval.waist')} /></Field>
                <Field label="Quadril (cm)"><Input inputMode="decimal" {...bind('bodyEval.hip')} /></Field>
                <Field label="Abdômen (cm)"><Input inputMode="decimal" {...bind('bodyEval.abdomen')} /></Field>
              </div>
              <Field label="Queixas corporais"><Chips options={BODY_COMPLAINTS} value={f.bodyEval.complaints} onChange={(v) => set('bodyEval.complaints', v)} /></Field>
              <Field label="Avaliação / observações"><Textarea {...bind('bodyEval.notes')} /></Field>
            </>
          )}
        </div>
        <div className="mt-5 flex justify-end border-t border-mist-100 pt-4"><Button icon={Save} onClick={save}>Salvar anamnese</Button></div>
      </Card>
    </div>
  );
}
