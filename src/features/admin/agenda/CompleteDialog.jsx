import { useState } from 'react';
import { QrCode, CreditCard, Landmark, Banknote, Package, ShieldAlert } from 'lucide-react';
import { useStore, useLookup } from '../../../store/StoreContext.jsx';
import { hasConsent, usablePackages } from '../../../store/actions.js';
import { PAYMENT_METHODS } from '../../../domain/constants.js';
import { brl } from '../../../domain/time.js';
import { packageBalance } from '../../../domain/finance.js';
import { Button, Field, Input, Modal, cx } from '../../../components/ui.jsx';

const ICONS = { pix: QrCode, credito: CreditCard, debito: Landmark, dinheiro: Banknote, pacote: Package };

/** Baixa automática: escolhe a forma de pagamento e lança no caixa ao concluir. */
export default function CompleteDialog({ id, onClose }) {
  const { db, tryAct, notify } = useStore();
  const L = useLookup();
  const a = db.appointments.find((x) => x.id === id);
  const pkgs = a ? usablePackages(db, a) : [];
  const [method, setMethod] = useState(pkgs.length ? 'pacote' : 'pix');
  const [amount, setAmount] = useState(a?.price ?? 0);
  const [pkgId, setPkgId] = useState(pkgs[0]?.id);
  if (!a) return null;
  const s = L.service(a.serviceId);
  const missingConsent = s.requiresConsent && !hasConsent(db, a.clientId, a.serviceId);

  const submit = () => {
    const okRes = tryAct('completeAppointment', { id, method, amount, clientPackageId: pkgId });
    if (!okRes) return;
    if (method === 'pacote') {
      const p = db.clientPackages.find((x) => x.id === pkgId);
      notify(`Sessão abatida do pacote. Restam ${p ? packageBalance(p) - 1 : 0}.`);
    } else {
      notify(`${brl(amount)} lançado no caixa (${PAYMENT_METHODS[method]}).`);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Concluir atendimento" subtitle={`${L.client(a.clientId).name} · ${s.name}`}
      footer={<><Button variant="ghost" onClick={onClose}>Voltar</Button><Button variant="dark" onClick={submit}>Concluir e lançar</Button></>}>
      {missingConsent && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />Atenção: não há termo de consentimento registrado para este procedimento.
        </div>
      )}
      <div className="label mb-2">Forma de pagamento</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Object.entries(PAYMENT_METHODS).map(([k, label]) => {
          const Icon = ICONS[k];
          const disabled = k === 'pacote' && !pkgs.length;
          return (
            <button key={k} type="button" disabled={disabled} onClick={() => setMethod(k)}
              className={cx('flex flex-col items-center gap-1 rounded-2xl border p-3 text-sm font-medium transition disabled:opacity-35',
                method === k ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-nude-300 bg-white text-graphite-600 hover:border-rose-300')}>
              <Icon className="h-5 w-5" strokeWidth={1.7} />{label}
              {k === 'pacote' && <span className="text-[11px] font-normal">{pkgs.length ? `${packageBalance(pkgs[0])} sessões` : 'sem saldo'}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {method === 'pacote' ? (
          pkgs.length > 1 ? (
            <Field label="Pacote">
              <select className="input" value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
                {pkgs.map((p) => <option key={p.id} value={p.id}>{L.service(p.serviceId).name} · {packageBalance(p)} restantes</option>)}
              </select>
            </Field>
          ) : (
            <p className="rounded-xl bg-nude-50 p-3 text-sm text-graphite-600">Será baixada 1 sessão do pacote. Nada entra no caixa agora, porque o pacote já foi pago na venda.</p>
          )
        ) : (
          <Field label="Valor recebido (R$)" hint={`Preço de tabela: ${brl(s.price)}`}>
            <Input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        )}
      </div>
    </Modal>
  );
}
