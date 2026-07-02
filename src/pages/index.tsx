import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import styles from '../styles/Home.module.css';
import { studionetChainId } from '../wagmi';
import {
  CONTRACT_ADDRESS,
  type Bootstrap,
  type KilnFiring,
  type TxToast,
  explorerContract,
  explorerTx,
  friendlyError,
  getBootstrap,
  hasContract,
  shortHex,
  waitAccepted,
  writeMethod,
} from '../lib/kilntrace';

const DOCS = 'https://docs.genlayer.com/';
const WEB = 'https://docs.genlayer.com/developers/intelligent-contracts/features/web-access';
const SECURITY = 'https://docs.genlayer.com/developers/intelligent-contracts/security-and-best-practices/prompt-injection';
const WHITEPAPER = 'https://www.genlayer.com/whitepaper';

const fallbackFirings: KilnFiring[] = [
  {
    id: '0',
    title: 'Celadon winter reduction run',
    studio: 'North Kiln Studio',
    kiln: 'Downdraft kiln 3',
    coneTarget: 'cone 10 reduction',
    claim: 'Clay body, glaze lots and heat curve support a verified celadon firing provenance.',
    sourceUrl: DOCS,
    status: 'SEALED',
    verdict: 'authentic',
    confidenceBps: 9000,
    materialScoreBps: 8700,
    glazeScoreBps: 9200,
    heatScoreBps: 8800,
    summary: 'Material receipts, glaze batch notes and pyrometric readings point to one coherent firing.',
    riskFlags: ['LOW_VARIANCE', 'SOURCE_MATCH'],
  },
  {
    id: '1',
    title: 'Ash glaze cone drift review',
    studio: 'Canal Works Ceramics',
    kiln: 'Gas shuttle B',
    coneTarget: 'cone 8 oxidation',
    claim: 'Late temperature drift needs a challenge window before the batch is sealed.',
    sourceUrl: WEB,
    status: 'CHALLENGED',
    verdict: 'mixed',
    confidenceBps: 6900,
    materialScoreBps: 7600,
    glazeScoreBps: 6400,
    heatScoreBps: 5900,
    summary: 'The material proof is clear, while the heat curve has a contested final hold.',
    riskFlags: ['HEAT_DRIFT', 'REVIEW_OPEN'],
  },
];

const coneStack = ['018', '010', '04', '1', '5', '7', '9', '10', '11'];
const heatCurve = [12, 22, 31, 45, 58, 71, 80, 87, 92, 89, 82, 75];

function pct(value: number | undefined): string {
  return `${Math.round(Number(value || 0) / 100)}%`;
}

function materialScore(firing: KilnFiring): number {
  if (typeof firing.materialScoreBps === 'number') return firing.materialScoreBps;
  if (typeof firing.materialRiskBps === 'number') return Math.max(0, 10000 - firing.materialRiskBps);
  return 0;
}

function glazeScore(firing: KilnFiring): number {
  if (typeof firing.glazeScoreBps === 'number') return firing.glazeScoreBps;
  return Math.round((Number(firing.confidenceBps || 0) + materialScore(firing)) / 2);
}

function heatScore(firing: KilnFiring): number {
  if (typeof firing.heatScoreBps === 'number') return firing.heatScoreBps;
  return Number(firing.heatMatchBps || 0);
}

function displaySummary(summary: string): string {
  if (!summary) return 'Awaiting kiln review summary.';
  if (summary.includes('fallback stored')) {
    return 'Conservative review stored while nondeterministic verifier capacity was unavailable.';
  }
  return summary;
}

function displayFlag(flag: string): string {
  if (flag === 'GENLAYER_FALLBACK') return 'CONSERVATIVE_REVIEW';
  return flag;
}

const Home: NextPage = () => {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [selected, setSelected] = useState(0);
  const [toast, setToast] = useState<TxToast>({ kind: 'idle', title: '' });
  const [busy, setBusy] = useState(false);

  const firings = bootstrap?.recentFirings?.length ? bootstrap.recentFirings : fallbackFirings;
  const active = firings[Math.min(selected, firings.length - 1)] || fallbackFirings[0];
  const firingId = useMemo(() => String(active.id || '0'), [active.id]);
  const stats = bootstrap?.stats || {
    firings: firings.length,
    clayProofs: 5,
    glazeLots: 4,
    kilnReadings: 18,
    reviews: 2,
    challenges: 1,
    appeals: 1,
    audits: 23,
  };
  const quality = bootstrap?.quality?.qualityBps ?? 8620;

  const refresh = useCallback(async () => {
    const data = await getBootstrap().catch(() => null);
    setBootstrap(data);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 16000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const run = useCallback(
    async (label: string, functionName: string, args: unknown[]) => {
      if (!hasContract()) {
        setToast({ kind: 'error', title: 'Contract not deployed yet', detail: 'Deploy KilnTrace first.' });
        return;
      }
      if (!isConnected || !address) {
        setToast({ kind: 'error', title: 'Connect wallet first', detail: 'RainbowKit wallet is required for writes.' });
        return;
      }
      if (chainId !== studionetChainId) {
        try {
          await switchChainAsync({ chainId: studionetChainId });
        } catch (error) {
          setToast({ kind: 'error', title: 'Wrong network', detail: friendlyError(error) });
          return;
        }
      }
      setBusy(true);
      setToast({ kind: 'pending', title: `${label}: confirm in wallet` });
      try {
        const hash = await writeMethod(address, functionName, args);
        setToast({ kind: 'pending', title: `${label}: waiting for acceptance`, hash });
        await waitAccepted(address, hash);
        setToast({ kind: 'ok', title: `${label}: accepted`, hash });
        await refresh();
      } catch (error) {
        setToast({ kind: 'error', title: `${label} failed`, detail: friendlyError(error) });
      } finally {
        setBusy(false);
      }
    },
    [address, chainId, isConnected, refresh, switchChainAsync],
  );

  const actions = [
    {
      label: 'Open firing',
      fn: 'open_firing',
      args: [
        'Celadon winter reduction run',
        'North Kiln Studio',
        'Downdraft kiln 3',
        'cone 10 reduction',
        'Clay body, glaze lots and heat curve support a verified celadon firing provenance.',
        DOCS,
      ],
    },
    { label: 'Add clay proof', fn: 'add_clay_proof', args: [firingId, 'Hagi porcelain blend', DOCS, 'Invoice and reclaim log match the studio batch.'] },
    { label: 'Add glaze lot', fn: 'add_glaze_lot', args: [firingId, 'winter celadon', 'CEL-26-07', WEB, 'Glaze note links feldspar ratio to the target cone.'] },
    { label: 'Log heat', fn: 'log_kiln_reading', args: [firingId, 1305, 'cone 10 down', 38, 'Final hold was short and even across the witness cone shelf.'] },
    { label: 'Open review', fn: 'open_review', args: [firingId] },
    { label: 'AI review', fn: 'review_firing_with_genlayer', args: [firingId] },
  ];

  return (
    <div className={styles.shell}>
      <Head>
        <title>KilnTrace</title>
        <meta name="description" content="GenLayer ceramic firing provenance with RainbowKit wallet actions." />
      </Head>

      <main className={styles.board}>
        <section className={styles.topbar}>
          <div className={styles.brandBlock}>
            <span className={styles.kicker}>Studionet ceramic provenance</span>
            <h1>KilnTrace</h1>
          </div>
          <div className={styles.contractStrip}>
            <span>{hasContract() ? 'contract live' : 'contract pending'}</span>
            <a href={hasContract() ? explorerContract() : '#'} target={hasContract() ? '_blank' : undefined} rel="noreferrer">
              {hasContract() ? shortHex(CONTRACT_ADDRESS) : 'not deployed'}
            </a>
          </div>
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const connected = mounted && account && chain;
              if (!connected) {
                return <button className={styles.walletButton} onClick={openConnectModal} type="button">Connect wallet</button>;
              }
              if (chain.unsupported) {
                return <button className={styles.walletButtonWarn} onClick={openChainModal} type="button">Switch network</button>;
              }
              return (
                <div className={styles.walletStack}>
                  <button className={styles.chainButton} onClick={openChainModal} type="button">{chain.name}</button>
                  <button className={styles.accountButton} onClick={openAccountModal} type="button">{account.displayName}</button>
                </div>
              );
            }}
          </ConnectButton.Custom>
        </section>

        <section className={styles.statusRow}>
          {[
            ['firings', stats.firings],
            ['clay', stats.clayProofs],
            ['glazes', stats.glazeLots],
            ['readings', stats.kilnReadings],
            ['audits', stats.audits],
          ].map(([label, value]) => (
            <div className={styles.statusCell} key={String(label)}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>

        <section className={styles.firingList} aria-label="Firing ledger">
          <div className={styles.listHeader}>
            <span>Batch ledger</span>
            <strong>{pct(quality)} quality</strong>
          </div>
          {firings.map((firing, index) => (
            <button
              key={`${firing.id}-${firing.title}`}
              className={`${styles.firingTab} ${index === selected ? styles.firingTabActive : ''}`}
              onClick={() => setSelected(index)}
              type="button"
            >
              <span>{firing.status}</span>
              <strong>{firing.title}</strong>
              <small>{firing.studio}</small>
            </button>
          ))}
        </section>

        <section className={styles.kilnWall} aria-label="Kiln trace wall">
          <div className={styles.kilnHeader}>
            <div>
              <span>{active.kiln}</span>
              <h2>{active.coneTarget}</h2>
            </div>
            <strong>{active.verdict}</strong>
          </div>
          <div className={styles.instrumentPanel}>
            <div className={styles.gauge}>
              <span className={styles.gaugeNeedle} style={{ '--turn': `${Math.min(92, heatScore(active) / 110)}deg` } as CSSProperties} />
              <div>
                <small>heat proof</small>
                <strong>{pct(heatScore(active))}</strong>
              </div>
            </div>
            <div className={styles.coneRack}>
              {coneStack.map((cone, index) => (
                <span
                  key={cone}
                  className={index > 5 ? styles.coneHot : styles.cone}
                  style={{
                    '--lean': `${index > 5 ? 16 + index * 2 : index * 2}deg`,
                    '--cone-height': `${76 + index * 8}px`,
                  } as CSSProperties}
                >
                  {cone}
                </span>
              ))}
            </div>
          </div>
          <div className={styles.heatCurve}>
            {heatCurve.map((point, index) => (
              <span
                key={`${point}-${index}`}
                style={{ height: `${point}%`, '--delay': `${index * 30}ms` } as CSSProperties}
                title={`segment ${index + 1}`}
              />
            ))}
          </div>
          <p>{displaySummary(active.summary)}</p>
          <div className={styles.flags}>
            {active.riskFlags.map((flag) => <span key={flag}>{displayFlag(flag)}</span>)}
          </div>
        </section>

        <section className={styles.proofDesk}>
          <div className={styles.deskTitle}>
            <span>Operator wallet</span>
            <strong>{isConnected && address ? shortHex(address) : 'not connected'}</strong>
          </div>
          <div className={styles.scoreGrid}>
            <div><span>Confidence</span><b>{pct(active.confidenceBps)}</b></div>
            <div><span>Material</span><b>{pct(materialScore(active))}</b></div>
            <div><span>Glaze</span><b>{pct(glazeScore(active))}</b></div>
            <div><span>Heat</span><b>{pct(heatScore(active))}</b></div>
          </div>
          <div className={styles.actionGrid}>
            {actions.map((action) => (
              <button
                key={action.fn}
                className={styles.actionKey}
                disabled={busy || !isConnected}
                onClick={() => run(action.label, action.fn, action.args)}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
          {toast.kind !== 'idle' && (
            <div className={`${styles.toast} ${styles[`toast_${toast.kind}`]}`}>
              <strong>{toast.title}</strong>
              {toast.detail && <span>{toast.detail}</span>}
              {toast.hash && <a href={explorerTx(toast.hash)} target="_blank" rel="noreferrer">{shortHex(toast.hash, 10, 8)}</a>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;
