import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, ShieldCheck } from 'lucide-react';
import { useStore, useLookup } from '../../store/StoreContext.jsx';
import { WEEKDAYS } from '../../domain/constants.js';
import { brl, fmtBR, fmtDuration, todayISO } from '../../domain/time.js';
import { Avatar, Badge, Button, Card, Chips, Field, Input, Modal, SectionTitle, Textarea, Tabs } from '../../components/ui.jsx';

export default function SettingsPage() {
  const [tab, setTab] = useState('clinica');
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Ajustes</h1>
      <Tabs value={tab} onChange={setTab} options={[
        { value: 'clinica', label: 'Clínica e regras' }, { value: 'horarios', label: 'Horário de funcionamento' },
        { value: 'servicos', label: 'Procedimentos' }, { value: 'equipe', label: 'Equipe e bloqueios' },
      ]} />
      <div className="pt-5">
        {tab === 'clinica' && <ClinicSettings />}
        {tab === 'horarios' && <Hours />}
        {tab === 'servicos' && <Services />}
        {tab === 'equipe' && <Team />}
      </div>
    </div>
  );
}

function ClinicSettings() {
  const { db, tryAct } = useStore();
  const [f, setF] = useState(db.settings);
  const num = (k) => ({ type: 'number', value: f[k], onChange: (e) => setF({ ...f, [k]: Number(e.target.value) }) });
  const save = () => tryAct('updateSettings', { clinicName: f.clinicName, whatsapp: f.whatsapp.replace(/\D/g, ''), address: f.address, slotStepMin: f.slotStepMin || 15, bufferMin: f.bufferMin, minCancelHours: f.minCancelHours, minAdvanceMin: f.minAdvanceMin, bookingWindowDays: f.bookingWindowDays || 30, consentText: f.consentText }, 'Ajustes salvos.');
  return (
    <Card className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nome da clínica"><Input value={f.clinicName} onChange={(e) => setF({ ...f, clinicName: e.target.value })} /></Field>
        <Field label="WhatsApp da clínica"><Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></Field>
        <Field label="Endereço"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      </div>
      <SectionTitle>Regras da agenda</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Field label="Grade (min)" hint="intervalo entre horários"><Input {...num('slotStepMin')} /></Field>
        <Field label="Folga (min)" hint="entre atendimentos"><Input {...num('bufferMin')} /></Field>
        <Field label="Antecedência (min)" hint="mínima p/ agendar online"><Input {...num('minAdvanceMin')} /></Field>
        <Field label="Cancelar até (h)" hint="antes, pelo portal"><Input {...num('minCancelHours')} /></Field>
        <Field label="Janela (dias)" hint="agendamento futuro"><Input {...num('bookingWindowDays')} /></Field>
      </div>
      <SectionTitle><span className="inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand-500" />Texto do termo de consentimento</span></SectionTitle>
      <Textarea rows={5} value={f.consentText} onChange={(e) => setF({ ...f, consentText: e.target.value })} />
      <div className="flex justify-end"><Button icon={Save} onClick={save}>Salvar</Button></div>
    </Card>
  );
}

function Hours() {
  const { db, tryAct } = useStore();
  const [h, setH] = useState(structuredClone(db.settings.businessHours));
  const upd = (d, k, v) => setH({ ...h, [d]: { ...h[d], [k]: v } });
  return (
    <Card className="p-5">
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <div key={d} className="grid grid-cols-[96px_1fr] items-center gap-3 rounded-xl border border-mist-100 p-2.5 sm:grid-cols-[110px_90px_1fr]">
            <span className="font-medium">{WEEKDAYS[d]}</span>
            <label className="inline-flex items-center gap-2 text-sm text-graphite-600"><input type="checkbox" className="accent-brand-500" checked={!h[d].closed} onChange={(e) => upd(d, 'closed', !e.target.checked)} />aberto</label>
            {!h[d].closed && (
              <div className="col-span-2 flex flex-wrap items-center gap-2 text-sm sm:col-span-1">
                <input type="time" className="rounded-lg border border-mist-300 px-2 py-1" value={h[d].open} onChange={(e) => upd(d, 'open', e.target.value)} aria-label="Abre" />
                até
                <input type="time" className="rounded-lg border border-mist-300 px-2 py-1" value={h[d].close} onChange={(e) => upd(d, 'close', e.target.value)} aria-label="Fecha" />
                <span className="text-graphite-400">· almoço</span>
                <input type="time" className="rounded-lg border border-mist-300 px-2 py-1" value={h[d].breakStart || ''} onChange={(e) => upd(d, 'breakStart', e.target.value)} aria-label="Início do intervalo" />
                –
                <input type="time" className="rounded-lg border border-mist-300 px-2 py-1" value={h[d].breakEnd || ''} onChange={(e) => upd(d, 'breakEnd', e.target.value)} aria-label="Fim do intervalo" />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-graphite-400">Deixe o almoço em branco para não ter intervalo. O portal recalcula os horários livres na hora.</p>
      <div className="mt-4 flex justify-end"><Button icon={Save} onClick={() => tryAct('updateSettings', { businessHours: h }, 'Horários salvos.')}>Salvar horários</Button></div>
    </Card>
  );
}

export function Services() {
  const { db, tryAct } = useStore();
  const [edit, setEdit] = useState(null);
  const save = () => {
    if (tryAct('saveService', edit, 'Procedimento salvo.')) setEdit(null);
  };
  return (
    <>
      <div className="mb-3 flex justify-end"><Button size="sm" icon={Plus} onClick={() => setEdit({ name: '', category: 'Facial', price: '', durationMin: 60, requiresConsent: false, active: true, description: '' })}>Novo procedimento</Button></div>
      <Card className="divide-y divide-mist-100">
        {db.services.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{s.name} {!s.active && <Badge>inativo</Badge>} {s.requiresConsent && <Badge tone="amber">requer termo</Badge>}</div>
              <div className="text-xs text-graphite-500">{s.category} · {fmtDuration(s.durationMin)}</div>
            </div>
            <span className="font-semibold tabular-nums">{brl(s.price)}</span>
            <button type="button" onClick={() => setEdit(s)} className="rounded-full p-1.5 text-graphite-400 hover:bg-mist-100" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
          </div>
        ))}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar procedimento' : 'Novo procedimento'} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        {edit && (
          <div className="space-y-3">
            <Field label="Nome"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Categoria"><Input value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} /></Field>
              <Field label="Preço (R$)"><Input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} /></Field>
              <Field label="Duração (min)"><Input type="number" value={edit.durationMin} onChange={(e) => setEdit({ ...edit, durationMin: e.target.value })} /></Field>
            </div>
            <Field label="Descrição (aparece no portal)"><Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-500" checked={edit.requiresConsent} onChange={(e) => setEdit({ ...edit, requiresConsent: e.target.checked })} />Procedimento invasivo: exige termo de consentimento</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-500" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Ativo (aparece no portal)</label>
          </div>
        )}
      </Modal>
    </>
  );
}

function Team() {
  const { db, tryAct } = useStore();
  const L = useLookup();
  const [edit, setEdit] = useState(null);
  const [block, setBlock] = useState(null);
  const blocks = db.timeBlocks.filter((b) => b.date >= todayISO()).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const nameToId = Object.fromEntries(db.services.map((s) => [s.name, s.id]));
  return (
    <>
      <div className="mb-3 flex justify-end"><Button size="sm" icon={Plus} onClick={() => setEdit({ name: '', title: '', whatsapp: '', color: '#2f5597', serviceIds: [] })}>Novo profissional</Button></div>
      <div className="grid gap-3 md:grid-cols-2">
        {db.professionals.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={p.name} color={p.color} size={42} />
              <div className="min-w-0 flex-1"><div className="font-medium">{p.name}</div><div className="text-xs text-graphite-500">{p.title}</div></div>
              <button type="button" onClick={() => setEdit(p)} className="rounded-full p-1.5 text-graphite-400 hover:bg-mist-100" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">{p.serviceIds.map((id) => <Badge key={id}>{L.service(id).name}</Badge>)}</div>
          </Card>
        ))}
      </div>

      <SectionTitle action={<Button size="sm" variant="soft" icon={Plus} onClick={() => setBlock({ professionalId: db.professionals[0]?.id, date: todayISO(), start: '14:00', end: '16:00', reason: '' })}>Bloquear horário</Button>}>Folgas e bloqueios</SectionTitle>
      <Card className="divide-y divide-mist-100">
        {blocks.length ? blocks.map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <div className="flex-1"><b className="font-medium">{L.professional(b.professionalId).name}</b> · {fmtBR(b.date)} {b.start}–{b.end}<div className="text-xs text-graphite-500">{b.reason}</div></div>
            <button type="button" onClick={() => tryAct('removeRow', { table: 'timeBlocks', id: b.id }, 'Bloqueio removido.')} className="rounded-full p-1.5 text-graphite-400 hover:bg-mist-100" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
          </div>
        )) : <p className="px-4 py-3 text-sm text-graphite-500">Nenhum bloqueio futuro.</p>}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar profissional' : 'Novo profissional'}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={() => tryAct('saveProfessional', edit, 'Profissional salvo.') && setEdit(null)}>Salvar</Button></>}>
        {edit && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_70px] gap-3">
              <Field label="Nome"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Especialidade"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
              <Field label="Cor"><input type="color" className="h-[42px] w-full rounded-xl border border-mist-300" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} /></Field>
            </div>
            <Field label="WhatsApp da profissional (opcional)" hint="Recebe o aviso de quem agendou pelo link. Sem ele, vai para o WhatsApp da clínica.">
              <Input inputMode="tel" value={edit.whatsapp || ''} onChange={(e) => setEdit({ ...edit, whatsapp: e.target.value.replace(/D/g, '') })} placeholder="14999999999" />
            </Field>
            <Field label="Procedimentos que realiza">
              <Chips options={db.services.map((s) => s.name)} value={edit.serviceIds.map((id) => L.service(id).name)} onChange={(names) => setEdit({ ...edit, serviceIds: names.map((n) => nameToId[n]) })} />
            </Field>
          </div>
        )}
      </Modal>

      <Modal open={!!block} onClose={() => setBlock(null)} title="Bloquear horário"
        footer={<><Button variant="ghost" onClick={() => setBlock(null)}>Cancelar</Button><Button onClick={() => tryAct('addTimeBlock', block, 'Horário bloqueado.') && setBlock(null)}>Salvar</Button></>}>
        {block && (
          <div className="space-y-3">
            <Field label="Profissional">
              <select className="input" value={block.professionalId} onChange={(e) => setBlock({ ...block, professionalId: e.target.value })}>{db.professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Data"><Input type="date" value={block.date} onChange={(e) => setBlock({ ...block, date: e.target.value })} /></Field>
              <Field label="Início"><Input type="time" value={block.start} onChange={(e) => setBlock({ ...block, start: e.target.value })} /></Field>
              <Field label="Fim"><Input type="time" value={block.end} onChange={(e) => setBlock({ ...block, end: e.target.value })} /></Field>
            </div>
            <Field label="Motivo"><Input value={block.reason} onChange={(e) => setBlock({ ...block, reason: e.target.value })} placeholder="Folga, curso, consulta médica…" /></Field>
          </div>
        )}
      </Modal>
    </>
  );
}
