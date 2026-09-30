"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, BookOpen, Check, ChevronRight, CircleDot, Copy, ExternalLink, Feather, LockKeyhole, Menu, Radio, Sparkles, Wallet, X } from "lucide-react";
import { Transaction } from "@solana/web3.js";
import { actionCatalog, initialState, openingScene, type ActionType, type StoryEvent, type WorldState } from "@/lib/story";

const chapterText = openingScene.join("\n\n");

export default function Home() {
  const [state, setState] = useState<WorldState>(initialState);
  const [events, setEvents] = useState<StoryEvent[]>([]);
  const [scene, setScene] = useState(chapterText);
  const [action, setAction] = useState<ActionType>("witness");
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState(false);
  const [wallet, setWallet] = useState("");
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [hash, setHash] = useState("");
  const [currentTime, setCurrentTime] = useState<number>();

  useEffect(() => {
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(chapterText)).then((digest) => {
      setHash(Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join(""));
    });
    fetch("/api/state", { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Live story state unavailable");
      setState(result.state);
      setEvents(result.events);
      if (result.scenes.length) setScene(`${chapterText}\n\n${result.scenes.join("\n\n")}`);
    }).catch((error) => setNotice(error instanceof Error ? error.message : "Live story state unavailable"));
    const initialClock = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    const clock = window.setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => { window.clearTimeout(initialClock); window.clearInterval(clock); };
  }, []);

  const eventCount = useMemo(() => events.length, [events]);

  async function connectWallet() {
    const provider = (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana;
    if (!provider) { setNotice("Install a Solana wallet extension to take a story action."); return; }
    try { const result = await provider.connect(); setWallet(result.publicKey.toString()); setNotice("Wallet connected."); }
    catch { setNotice("Wallet connection cancelled."); }
  }

  async function submitAction() {
    setWorking(true); setNotice("");
    try {
      const provider = (window as Window & { solana?: { publicKey?: { toString: () => string }; connect: () => Promise<{ publicKey: { toString: () => string } }>; signTransaction: (transaction: Transaction) => Promise<Transaction> } }).solana;
      if (!provider) throw new Error("A Solana wallet is required.");
      let activeWallet = wallet;
      if (!activeWallet) {
        const connected = await provider.connect();
        activeWallet = connected.publicKey.toString();
        setWallet(activeWallet);
      }
      const transactionResponse = await fetch("/api/transaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet: activeWallet, action }) });
      const transactionData = await transactionResponse.json();
      if (!transactionResponse.ok) throw new Error(transactionData.error || "Could not prepare the Solana transaction");
      const bytes = Uint8Array.from(atob(transactionData.transaction), (character) => character.charCodeAt(0));
      const signed = await provider.signTransaction(Transaction.from(bytes));
      const signedBase64 = btoa(String.fromCharCode(...signed.serialize()));
      const submitResponse = await fetch("/api/transaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signedTransaction: signedBase64, blockhash: transactionData.blockhash, lastValidBlockHeight: transactionData.lastValidBlockHeight }) });
      const submitResult = await submitResponse.json();
      if (!submitResponse.ok) throw new Error(submitResult.error || "The Solana transaction failed");
      setNotice("Transaction confirmed. Writing the next scene…");
      const response = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, signature: submitResult.signature, wallet: activeWallet }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed");
      setState(result.state);
      setScene((current) => `${current}\n\n${result.scene}`);
      setEvents((current) => [result.event, ...current]);
      setModal(false); setNotice("Action verified. The story changed permanently.");
      setTimeout(() => document.querySelector("#reader")?.scrollIntoView({ behavior: "smooth" }), 120);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong"); }
    finally { setWorking(false); }
  }

  function openAction(next: ActionType) { setAction(next); setModal(true); setNotice(""); }

  function eventTime(value: string) {
    if (!value.includes("T")) return value;
    if (!currentTime) return "recently";
    const minutes = Math.max(0, Math.floor((currentTime - new Date(value).getTime()) / 60000));
    return minutes < 1 ? "now" : `${minutes}m ago`;
  }

  return (
    <main>
      <div className="grain" />
      <nav className="nav shell">
        <a className="brand" href="#top"><span className="brand-mark">P</span><span>PULP</span></a>
        <div className={`nav-links ${menu ? "open" : ""}`}>
          <a href="#reader" onClick={() => setMenu(false)}>Read</a><a href="#ledger" onClick={() => setMenu(false)}>Ledger</a><a href="#world" onClick={() => setMenu(false)}>World state</a>
        </div>
        <button className="wallet-btn" onClick={connectWallet}><Wallet size={15}/>{wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : "Connect wallet"}</button>
        <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label="Toggle menu">{menu ? <X/> : <Menu/>}</button>
      </nav>

      <header id="top" className="hero shell">
        <div className="eyebrow"><span className="live-dot"/>LIVE STORY · CHAPTER 01</div>
        <h1>The story is <em>alive.</em></h1>
        <p className="hero-copy">A public noir novel shaped by onchain events. Every action changes what happens next. Every finished chapter is sealed forever.</p>
        <div className="hero-actions"><a className="primary" href="#reader"><BookOpen size={17}/> Read the chapter</a><a className="text-link" href="#actions">Shape what happens <ChevronRight size={16}/></a></div>
        <div className="signal-card"><div><Radio size={18}/><span>STORY SIGNAL</span></div><strong>03:17:12</strong><p>The dead frequency is transmitting again.</p><div className="wave">{Array.from({length: 38}).map((_,i)=><i key={i} style={{height: `${10 + ((i*17)%32)}px`}}/>)}</div></div>
        <a className="scroll-cue" href="#reader">ENTER THE GLASS DISTRICT <ArrowDown size={15}/></a>
      </header>

      <section id="reader" className="reader-section">
        <div className="reader shell">
          <aside className="chapter-index"><span>CHAPTER</span><strong>01</strong><i/><small>UNSEALED<br/>LIVE DRAFT</small></aside>
          <article className="manuscript">
            <p className="kicker">THE DEAD FREQUENCY</p><h2>Last Train to<br/><em>Nowhere</em></h2>
            <div className="story-copy">{scene.split("\n\n").map((paragraph, index) => <p key={index} className={index === 0 ? "dropcap" : ""}>{paragraph}</p>)}</div>
            <div className="continue"><span/><Feather size={19}/><span/><p>The next scene is waiting for a signal.</p></div>
          </article>
          <aside className="margin-note"><CircleDot size={13}/><span>{events[0] ? "LATEST CHANGE" : "AWAITING SIGNAL"}</span><p>{events[0]?.detail || "The first verified reader action will alter the canon."}</p><small>{events[0] ? `${eventTime(events[0].time)} · ${events[0].actor}` : "ONCHAIN LEDGER READY"}</small></aside>
        </div>
      </section>

      <section id="world" className="world-section shell">
        <div className="section-heading"><div><span className="eyebrow">CANONICAL STATE</span><h2>The world <em>right now</em></h2></div><p>Every verified action produces a deterministic state change before the next scene is written.</p></div>
        <div className="state-grid">
          <div className="state-card wide"><span>NARRATIVE PRESSURE</span><strong>{state.pressure}<small>%</small></strong><div className="meter"><i style={{width:`${state.pressure}%`}}/></div><p>{state.pressure > 75 ? "Critical — the clock is running out." : "High — consequences are approaching."}</p></div>
          <div className="state-card"><span>TRUST · VALE ↔ ILYA</span><strong>{state.trust}<small>%</small></strong><div className="meter cool"><i style={{width:`${state.trust}%`}}/></div><p>{state.trust < 40 ? "Fracturing" : "Unsteady"}</p></div>
          <div className="state-card"><span>WORLD CLOCK</span><strong>{state.hour}</strong><p>{state.weather} · no sunrise expected</p></div>
          <div className="state-card"><span>CURRENT LOCATION</span><strong className="small-value">{state.location}</strong><p>Sector 7 · Transit level</p></div>
          <div className="state-card thread"><span>ACTIVE THREAD</span><strong className="small-value">“{state.activeThread}”</strong><p>Opened in Event #{eventCount.toString().padStart(3,"0")}</p></div>
        </div>
      </section>

      <section id="actions" className="actions-section">
          <div className="shell"><div className="section-heading light"><div><span className="eyebrow">YOUR MOVE</span><h2>Leave a mark on the story.</h2></div><p>One verified Solana action. One bounded consequence. The engine does the rest.</p></div>
          <div className="action-grid">{(Object.keys(actionCatalog) as ActionType[]).map((key, index) => <button className="action-card" key={key} onClick={() => openAction(key)}><span className="action-number">0{index+1}</span><Sparkles size={19}/><h3>{actionCatalog[key].label}</h3><p>{actionCatalog[key].prompt}</p><div><span>{actionCatalog[key].cost}</span><ChevronRight size={18}/></div></button>)}</div>
          <p className="action-note"><LockKeyhole size={13}/> Actions are constrained and moderated. $PULP carries no promise of financial return.</p>
        </div>
      </section>

      <section id="ledger" className="ledger-section shell">
        <div className="section-heading"><div><span className="eyebrow">PUBLIC PROOF LOOP</span><h2>Nothing happens <em>off the record.</em></h2></div><p>Trace each sentence back to the event that changed the world.</p></div>
        <div className="ledger-layout"><div className="timeline">{events.length ? events.map((event, index) => <div className="event" key={event.id}><div className="event-rail"><i className={index===0?"current":""}/><span/></div><div className="event-time">{eventTime(event.time)}</div><div className="event-copy"><span>{event.id.toUpperCase()}</span><h3>{event.label}</h3><p>{event.detail}</p><small><Check size={12}/> SOLANA VERIFIED · {event.actor}</small></div></div>) : <div className="empty-ledger"><Radio size={20}/><h3>Waiting for the first signal</h3><p>Verified reader actions will appear here with their Solana proof.</p></div>}</div>
          <div className="proof-card"><div className="proof-top"><LockKeyhole size={20}/><span>CHAPTER PROOF</span></div><p>Chapter 01</p><h3>Awaiting final seal</h3><div className="hash"><span>SHA-256 DRAFT HASH</span><code>{hash ? `${hash.slice(0,18)}…${hash.slice(-12)}` : "calculating…"}</code><button onClick={() => {navigator.clipboard.writeText(hash); setNotice("Draft hash copied.")}} aria-label="Copy hash"><Copy size={14}/></button></div><div className="proof-row"><span>EVENTS INCLUDED</span><strong>#{eventCount.toString().padStart(3,"0")}</strong></div><div className="proof-row"><span>STORAGE</span><strong>IPFS · READY</strong></div><button className="seal-btn" disabled><LockKeyhole size={15}/> Seal when chapter closes</button><small>Once sealed, this chapter cannot be silently changed.</small></div>
        </div>
      </section>

      <footer><div className="shell footer-inner"><div className="brand"><span className="brand-mark">P</span><span>PULP</span></div><p>A story owned by its history.</p><div><a href="#reader">Read</a><a href="#ledger">Proof</a><a href="https://explorer.solana.com/" target="_blank" rel="noreferrer">Solana <ExternalLink size={12}/></a></div></div></footer>
      {notice && <button className="toast" onClick={()=>setNotice("")}>{notice}<X size={14}/></button>}

      {modal && <div className="modal-backdrop" onMouseDown={() => !working && setModal(false)}><div className="modal" onMouseDown={(e)=>e.stopPropagation()}><button className="modal-close" onClick={()=>setModal(false)} disabled={working}><X/></button><span className="eyebrow">VERIFIED STORY ACTION</span><h2>{actionCatalog[action].label}</h2><p>{actionCatalog[action].prompt}</p><div className="transaction-summary"><span>ONCHAIN COST</span><strong>{actionCatalog[action].cost}</strong><small>plus the Solana network fee</small></div><button className="primary full" onClick={submitAction} disabled={working}>{working ? "Confirming on Solana…" : wallet ? "Pay & change the story" : "Connect wallet & continue"}</button><small>Your wallet will ask you to approve one transfer. After confirmation, the event is verified, stored, and converted into the next scene.</small></div></div>}
    </main>
  );
}
