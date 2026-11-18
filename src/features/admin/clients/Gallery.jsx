import { useRef, useState } from 'react';
import { Camera, Columns2, Trash2, X } from 'lucide-react';
import { useStore } from '../../../store/StoreContext.jsx';
import { fmtBR, todayISO } from '../../../domain/time.js';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Segmented, cx } from '../../../components/ui.jsx';

/** Reduz a foto (máx. 1000 px, JPEG 80%) para caber no armazenamento do aparelho. */
function compress(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    img.src = url;
  });
}

export default function Gallery({ clientId }) {
  const { db, tryAct, notify } = useStore();
  const photos = db.evolutionPhotos.filter((p) => p.clientId === clientId).sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  const fileRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const [selected, setSelected] = useState([]);
  const [compare, setCompare] = useState(false);
  const [zoom, setZoom] = useState(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('Escolha um arquivo de imagem.', 'error');
    try {
      const dataUrl = await compress(file);
      setDraft({ dataUrl, takenAt: todayISO(), kind: photos.length ? 'depois' : 'antes', area: photos[0]?.area || '', notes: '' });
    } catch (err) {
      notify(err.message, 'error');
    }
  };
  const save = () => {
    if (tryAct('addEvolutionPhoto', { clientId, ...draft }, 'Foto adicionada à evolução.')) setDraft(null);
  };
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.slice(-1), id]));

  const byDate = photos.reduce((g, p) => ({ ...g, [p.takenAt]: [...(g[p.takenAt] || []), p] }), {});
  const pair = selected.map((id) => photos.find((p) => p.id === id)).filter(Boolean).sort((a, b) => a.takenAt.localeCompare(b.takenAt));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-graphite-500">Selecione 2 fotos para comparar a evolução.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={Columns2} disabled={pair.length !== 2} onClick={() => setCompare(true)}>Comparar ({pair.length}/2)</Button>
          <Button size="sm" icon={Camera} onClick={() => fileRef.current?.click()}>Adicionar foto</Button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        </div>
      </div>

      {!photos.length && <Card><EmptyState icon={Camera} title="Nenhuma foto ainda">Registre o “antes” na primeira sessão para acompanhar a evolução.</EmptyState></Card>}

      {Object.entries(byDate).map(([d, list]) => (
        <div key={d} className="mb-5">
          <div className="label mb-2">{fmtBR(d)}</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((p) => (
              <div key={p.id} className={cx('card overflow-hidden', selected.includes(p.id) && 'ring-2 ring-brand-400')}>
                <button type="button" className="block aspect-[4/5] w-full bg-mist-100" onClick={() => setZoom(p)}>
                  <img src={p.dataUrl} alt={`${p.kind} ${p.area}`} className="h-full w-full object-cover" />
                </button>
                <div className="p-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <Badge tone={p.kind === 'antes' ? 'nude' : 'rose'}>{p.kind}</Badge>
                    <label className="inline-flex items-center gap-1 text-xs text-graphite-500"><input type="checkbox" className="accent-brand-500" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />comparar</label>
                  </div>
                  <div className="mt-1 truncate text-xs text-graphite-600">{p.area}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Modal open={!!draft} onClose={() => setDraft(null)} title="Nova foto de evolução"
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        {draft && (
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <img src={draft.dataUrl} alt="Pré-visualização" className="aspect-[4/5] w-full rounded-xl object-cover" />
            <div className="space-y-3">
              <Segmented value={draft.kind} onChange={(kind) => setDraft({ ...draft, kind })} options={[{ value: 'antes', label: 'Antes' }, { value: 'depois', label: 'Depois' }]} />
              <Field label="Data da sessão"><Input type="date" value={draft.takenAt} onChange={(e) => setDraft({ ...draft, takenAt: e.target.value })} /></Field>
              <Field label="Área"><Input placeholder="Ex.: face, abdômen, glúteo" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} /></Field>
              <Field label="Observação"><Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={compare && pair.length === 2} onClose={() => setCompare(false)} wide title="Comparar evolução" subtitle={pair.length === 2 ? `${fmtBR(pair[0].takenAt)} → ${fmtBR(pair[1].takenAt)}` : ''}>
        {pair.length === 2 && <CompareSlider before={pair[0]} after={pair[1]} />}
      </Modal>

      <Modal open={!!zoom} onClose={() => setZoom(null)} title={zoom ? `${zoom.kind === 'antes' ? 'Antes' : 'Depois'} · ${fmtBR(zoom.takenAt)}` : ''} subtitle={zoom?.area}
        footer={zoom && <Button variant="danger" size="sm" icon={Trash2} onClick={() => { if (window.confirm('Excluir esta foto?')) { tryAct('removeRow', { table: 'evolutionPhotos', id: zoom.id }, 'Foto excluída.'); setSelected((s) => s.filter((x) => x !== zoom.id)); setZoom(null); } }}>Excluir</Button>}>
        {zoom && <><img src={zoom.dataUrl} alt="" className="mx-auto max-h-[60vh] rounded-xl" />{zoom.notes && <p className="mt-3 text-sm text-graphite-600">{zoom.notes}</p>}</>}
      </Modal>
    </div>
  );
}

/** Lado a lado com divisor arrastável. */
function CompareSlider({ before, after }) {
  const [pos, setPos] = useState(50);
  const [mode, setMode] = useState('slider');
  return (
    <div>
      <Segmented className="mb-3" size="sm" value={mode} onChange={setMode} options={[{ value: 'slider', label: 'Deslizar' }, { value: 'side', label: 'Lado a lado' }]} />
      {mode === 'side' ? (
        <div className="grid grid-cols-2 gap-3">
          {[before, after].map((p, i) => (
            <figure key={p.id}><img src={p.dataUrl} alt="" className="aspect-[4/5] w-full rounded-xl object-cover" /><figcaption className="mt-1 text-center text-xs text-graphite-500">{i ? 'Depois' : 'Antes'} · {fmtBR(p.takenAt)}</figcaption></figure>
          ))}
        </div>
      ) : (
        <div className="relative mx-auto aspect-[4/5] max-h-[60vh] select-none overflow-hidden rounded-xl">
          <img src={after.dataUrl} alt="Depois" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <img src={before.dataUrl} alt="Antes" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
          <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-xs">Antes · {fmtBR(before.takenAt)}</span>
          <span className="absolute right-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-xs">Depois · {fmtBR(after.takenAt)}</span>
          <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} className="absolute inset-x-4 bottom-3 accent-brand-500" aria-label="Divisor antes e depois" />
        </div>
      )}
    </div>
  );
}
