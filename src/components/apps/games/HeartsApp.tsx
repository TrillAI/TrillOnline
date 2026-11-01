import React, { useState, useEffect } from 'react';
import { useOS } from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';

type Suit = '♣' | '♦' | '♠' | '♥';
interface HCard {
  id: string;
  suit: Suit;
  rank: number; // 2..14 (14 = Ace)
}

const SUIT_ORDER: Record<Suit, number> = { '♣': 0, '♦': 1, '♠': 2, '♥': 3 };
const RANK_STR: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};
const isRed = (s: Suit) => s === '♥' || s === '♦';
const cardPoints = (c: HCard) => (c.suit === '♥' ? 1 : c.suit === '♠' && c.rank === 12 ? 13 : 0);

function sortHand(hand: HCard[]): HCard[] {
  return [...hand].sort((a, b) =>
    SUIT_ORDER[a.suit] !== SUIT_ORDER[b.suit] ? SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] : a.rank - b.rank
  );
}

export const HeartsApp: React.FC = () => {
  const { username } = useOS();
  const { playSound } = useSound();

  const players = [username || 'You', 'Pauline', 'Michele', 'Ben'];
  const [hands, setHands] = useState<HCard[][]>([[], [], [], []]);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0]);
  const [handPoints, setHandPoints] = useState<number[]>([0, 0, 0, 0]);
  const [trick, setTrick] = useState<Array<{ player: number; card: HCard }>>([]);
  const [turn, setTurn] = useState<number>(0);
  const [leadSuit, setLeadSuit] = useState<Suit | null>(null);
  const [heartsBroken, setHeartsBroken] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Welcome to Microsoft Hearts!');
  const [busy, setBusy] = useState(false);

  const dealRound = (resetScores = false) => {
    const deck: HCard[] = [];
    (['♣', '♦', '♠', '♥'] as Suit[]).forEach((s) => {
      for (let r = 2; r <= 14; r++) {
        deck.push({ id: `${r}${s}`, suit: s, rank: r });
      }
    });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const nextHands: HCard[][] = [
      sortHand(deck.slice(0, 13)),
      sortHand(deck.slice(13, 26)),
      sortHand(deck.slice(26, 39)),
      sortHand(deck.slice(39, 52)),
    ];
    if (resetScores) setScores([0, 0, 0, 0]);
    setHandPoints([0, 0, 0, 0]);
    setHands(nextHands);
    setTrick([]);
    setLeadSuit(null);
    setHeartsBroken(false);
    setBusy(false);

    const starter = nextHands.findIndex((h) => h.some((c) => c.suit === '♣' && c.rank === 2));
    setTurn(starter >= 0 ? starter : 0);
    setStatusMsg(`${players[starter]} has the 2♣ and leads!`);
  };

  useEffect(() => {
    dealRound(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getValidCards = (hand: HCard[], isFirstTrick: boolean, currentLead: Suit | null): HCard[] => {
    if (isFirstTrick && !currentLead) {
      const twoC = hand.find((c) => c.suit === '♣' && c.rank === 2);
      if (twoC) return [twoC];
    }
    if (currentLead) {
      const follow = hand.filter((c) => c.suit === currentLead);
      if (follow.length > 0) return follow;
      if (isFirstTrick) {
        const nonPenalty = hand.filter((c) => cardPoints(c) === 0);
        if (nonPenalty.length > 0) return nonPenalty;
      }
      return hand;
    }
    if (!heartsBroken) {
      const nonHearts = hand.filter((c) => c.suit !== '♥');
      if (nonHearts.length > 0) return nonHearts;
    }
    return hand;
  };

  // AI turn handler
  useEffect(() => {
    if (busy || turn === 0 || hands[turn]?.length === 0) return;
    if (trick.length >= 4) return;

    const timer = window.setTimeout(() => {
      const aiHand = hands[turn];
      const isFirstTrick = aiHand.length === 13 && trick.length === 0 ? true : hands.some((h) => h.length === 13) && handPoints.every((p) => p === 0);
      const valid = getValidCards(aiHand, isFirstTrick, leadSuit);
      // AI picks lowest safe card
      const chosen = valid.sort((a, b) => a.rank - b.rank)[0];
      playCard(turn, chosen);
    }, 520);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, trick, hands, busy]);

  const playCard = (playerIdx: number, card: HCard) => {
    const nextLead = trick.length === 0 ? card.suit : leadSuit;
    if (trick.length === 0) setLeadSuit(card.suit);
    if (card.suit === '♥') setHeartsBroken(true);

    const nextTrick = [...trick, { player: playerIdx, card }];
    const nextHands = hands.map((h, i) => (i === playerIdx ? h.filter((c) => c.id !== card.id) : h));
    setHands(nextHands);
    setTrick(nextTrick);

    if (nextTrick.length < 4) {
      setTurn((playerIdx + 1) % 4);
      return;
    }

    // Evaluate trick winner
    setBusy(true);
    let winEntry = nextTrick[0];
    nextTrick.forEach((entry) => {
      if (entry.card.suit === nextLead && entry.card.rank > winEntry.card.rank) {
        winEntry = entry;
      }
    });
    const pts = nextTrick.reduce((sum, e) => sum + cardPoints(e.card), 0);
    if (nextTrick.some((e) => e.card.suit === '♠' && e.card.rank === 12)) {
      playSound('exclamation');
    }

    window.setTimeout(() => {
      const updatedHandPts = handPoints.map((p, i) => (i === winEntry.player ? p + pts : p));
      setHandPoints(updatedHandPts);
      setTrick([]);
      setLeadSuit(null);
      setBusy(false);

      // Check end of 13 tricks
      if (nextHands.every((h) => h.length === 0)) {
        const shooter = updatedHandPts.findIndex((p) => p === 26);
        const nextTotalScores = scores.map((s, idx) => {
          if (shooter >= 0) {
            return idx === shooter ? s : s + 26;
          }
          return s + updatedHandPts[idx];
        });
        setScores(nextTotalScores);
        playSound('notify');
        setStatusMsg(
          shooter >= 0
            ? `🌙 ${players[shooter]} SHOT THE MOON! Click "Deal Next Hand" to continue.`
            : 'Hand complete! Click "Deal Next Hand" to continue.'
        );
      } else {
        setTurn(winEntry.player);
        setStatusMsg(`${players[winEntry.player]} took the trick (${pts} pts).`);
      }
    }, 900);
  };

  const isFirstTrick = hands[0].length === 13 && handPoints.every((p) => p === 0);
  const myValidIds = new Set(
    turn === 0 && !busy ? getValidCards(hands[0], isFirstTrick, leadSuit).map((c) => c.id) : []
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#007a00', minHeight: 0 }}>
      <div className="xp-menubar">
        <span className="xp-menu-item" onClick={() => dealRound(true)}>
          New Match (F2)
        </span>
        {hands.every((h) => h.length === 0) && (
          <span className="xp-menu-item" style={{ fontWeight: 700 }} onClick={() => dealRound(false)}>
            ▶ Deal Next Hand
          </span>
        )}
      </div>

      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '10px 18px',
          color: '#fff',
        }}
      >
        {/* North: Michele + Scoreboard */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div
            style={{
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: 5,
              padding: '6px 10px',
              fontSize: 11,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 3, color: '#fde047' }}>Scoreboard (Hand / Total)</div>
            {players.map((p, idx) => (
              <div key={p}>
                {p}: <b>{handPoints[idx]}</b> / <b>{scores[idx]}</b>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 12 }}>Michele ({hands[2].length} cards)</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
              {hands[2].slice(0, 7).map((c) => (
                <div
                  key={c.id}
                  style={{
                    width: 24,
                    height: 34,
                    marginLeft: -8,
                    background: '#1e40af',
                    border: '1px solid #fff',
                    borderRadius: 3,
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ fontSize: 11, background: 'rgba(0,0,0,0.3)', padding: '5px 10px', borderRadius: 4, maxWidth: 195 }}>
            {statusMsg}
            {heartsBroken && <div style={{ color: '#fca5a5', fontWeight: 700 }}>♥ Hearts Broken</div>}
          </div>
        </div>

        {/* Center Trick Table + West (Pauline) & East (Ben) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 8 } as React.CSSProperties}>
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
            Pauline
            <div style={{ fontSize: 10, fontWeight: 400 }}>{hands[1].length} cards</div>
          </div>

          {/* 4-Card Trick Mat */}
          <div
            style={{
              width: 240,
              height: 155,
              borderRadius: 12,
              background: 'rgba(0, 50, 0, 0.42)',
              border: '1px solid rgba(255,255,255,0.25)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {trick.map((entry) => {
              const offsets: Array<React.CSSProperties> = [
                { bottom: 8, left: '50%', transform: 'translateX(-50%)' },
                { left: 14, top: '50%', transform: 'translateY(-50%)' },
                { top: 8, left: '50%', transform: 'translateX(-50%)' },
                { right: 14, top: '50%', transform: 'translateY(-50%)' },
              ];
              return (
                <div
                  key={entry.card.id}
                  style={{
                    position: 'absolute',
                    ...offsets[entry.player],
                    width: 54,
                    height: 76,
                    background: '#fff',
                    borderRadius: 4,
                    border: '1px solid #111',
                    color: isRed(entry.card.suit) ? '#dc2626' : '#111',
                    padding: 4,
                    fontWeight: 700,
                    fontSize: 12,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
                  }}
                >
                  <div>
                    {RANK_STR[entry.card.rank]}
                    {entry.card.suit}
                  </div>
                  <div style={{ fontSize: 20, textAlign: 'center', marginTop: 8 }}>{entry.card.suit}</div>
                </div>
              );
            })}
            {hands.every((h) => h.length === 0) && (
              <button className="xp-btn xp-btn-primary" onClick={() => dealRound(false)}>
                Deal Next Hand
              </button>
            )}
          </div>

          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
            Ben
            <div style={{ fontSize: 10, fontWeight: 400 }}>{hands[3].length} cards</div>
          </div>
        </div>

        {/* South: Player Hand */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            {players[0]} {turn === 0 && !busy && hands[0].length > 0 ? '— Your Turn!' : ''}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'nowrap' }}>
            {hands[0].map((card, i) => {
              const playable = myValidIds.has(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (playable) playCard(0, card);
                  }}
                  style={{
                    width: 58,
                    height: 84,
                    marginLeft: i === 0 ? 0 : -14,
                    background: '#fff',
                    borderRadius: 5,
                    border: playable ? '2px solid #facc15' : '1px solid #111',
                    transform: playable ? 'translateY(-8px)' : 'none',
                    opacity: turn === 0 && !playable ? 0.72 : 1,
                    color: isRed(card.suit) ? '#dc2626' : '#111',
                    padding: '3px 5px',
                    fontWeight: 700,
                    fontSize: 12,
                    textAlign: 'left',
                    cursor: playable ? 'pointer' : 'default',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.45)',
                    transition: 'transform 0.12s ease',
                  }}
                >
                  <div>
                    {RANK_STR[card.rank]}
                    {card.suit}
                  </div>
                  <div style={{ fontSize: 20, textAlign: 'center', marginTop: 10 }}>{card.suit}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
