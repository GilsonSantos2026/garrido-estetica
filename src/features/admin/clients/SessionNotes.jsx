import { useState } from 'react';
import { NotebookPen, Trash2 } from 'lucide-react';
import { useStore, useLookup } from '../../../store/StoreContext.jsx';
import { PROTOCOLS } from '../../../domain/constants.js';
import { fmtBR, todayISO } from '../../../domain/time.js';
import { Button, Card, EmptyState, Field, Input, Modal, Select, Textarea } from '../../../components/ui.jsx';

/** Registro de evolução de cada sessão, com protocolos prontos (herdados do app v1). */
export default function SessionNotes({ clientId }) {
  const { db, tryAct } = useStore();
  const L = useLookup();
  const notes = db.sessionNotes.filter((n) => n.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date));
  const [f, setF] = useState(null);

  const fillProtocol = (k) => setF((s) => ({ ...s, protocol: k, text: k ? `Protocolo: ${k}\n${PROTOCOLS[k].map((x, i) => `${i + 1}. ${x}`).join('\n')}` : s.text }));
  const save = () => {
    if (tryAct('addSessionNote', { clientId, ...f }, 'Sessão registrada.')) setF(null);
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" icon={NotebookPen} onClick={() => setF({ serviceId: db.services[0]?.id, date: todayISO(), protocol: '', text: '', reactions: '' })}>Registrar sessão</Button>
      </div>
      {notes.length ? (
        <div className="space-y-3">
          {notes.map((n) => (
            <Card key={n.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-medium">{L.service(n.serviceId).name}</div><div className="text-xs text-graphite-500">{fmtBR(n.date)}</div></div>
                <button type="button" onClick={() => window.confirm('Excluir este registro?') && tryAct('removeRow', { table: 'sessionNotes', id: n.id })} className="rounded-full p-1.5 text-graphite-400 hover:bg-mist-100" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-graphite-700">{n.text}</p>
              {n.reactions && <p className="mt-2 text-sm text-graphite-500"><b className="font-medium">Pós-procedimento:</b> {n.reactions}</p>}
            </Card>
          ))}
        </div>
      ) : <Card><EmptyState icon={NotebookPen} title="Nenhuma sessão registrada" /></Card>}

      <Modal open={!!f} onClose={() => setF(null)} title="Registro de sessão"
        footer={<><Button variant="ghost" onClick={() => setF(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        {f && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Procedimento"><Select value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })} options={db.services.map((s) => ({ value: s.id, label: s.name }))} /></Field>
              <Field label="Data"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            </div>
            <Field label="Protocolo"><Select value={f.protocol} onChange={(e) => fillProtocol(e.target.value)} options={[{ value: '', label: '— sem protocolo —' }, ...Object.keys(PROTOCOLS)]} /></Field>
            <Field label="Descrição / evolução"><Textarea rows={7} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></Field>
            <Field label="Reações e observações pós-procedimento"><Input value={f.reactions} onChange={(e) => setF({ ...f, reactions: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
