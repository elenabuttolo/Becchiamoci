"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./styles/becchiamo.css";
import { toggleInArray, safeArray, generateCode } from "./utils/generic";
import { supabase as sb } from "./lib/supabase";
import {
  getCurrentMonth,
  formatFullDate,
  formatShortDate,
  isoDate,
} from "./utils/date_utils";
import {
  TIMESLOTS,
  PLACES,
  ACTIVITIES,
  AVATAR_COLORS,
  MONTHS,
  WD,
  STEPS,
} from "./utils/constants";

export default function BecchiamoCI() {
  const [screen, setScreen] = useState("home");
  const [eventId, setEventId] = useState(null);
  const [eventName, setEventName] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [participants, setParticipants] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [eventInput, setEventInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [userInput, setUserInput] = useState("");
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [eventActivities, setEventActivities] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [selectedTimeslots, setSelectedTimeslots] = useState([]);
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef(null);

  const monthInfo = useMemo(() => getCurrentMonth(), []);

  const joinByCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (code.length < 4) return;
    const { data, error } = await sb
      .from("events")
      .select("*")
      .eq("code", code)
      .single();
    if (error || !data) {
      showToast("Codice non trovato");
      return;
    }
    setEventId(data.id);
    setEventName(data.name);
    setEventCode(data.code);
    await loadParticipants(data.id);
    setScreen("lobby");
  };

  const loadParticipants = async (id = eventId) => {
    if (!id) return [];
    const { data } = await sb
      .from("responses")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true });
    const loaded = data || [];
    setParticipants(loaded);
    return loaded;
  };

  const createEvent = async () => {
    const name = eventInput.trim();
    if (!name) return;
    const code = generateCode();
    const { data, error } = await sb
      .from("events")
      .insert({ name, code })
      .select()
      .single();
    if (error) {
      showToast("Errore nella creazione");
      return;
    }
    setEventId(data.id);
    setEventName(data.name);
    setEventCode(data.code);
    setParticipants([]);
    setScreen("lobby");
  };

  const fetchEventActivities = async (id = eventId) => {
    if (!id) return [];
    const { data, error } = await sb
      .from("responses")
      .select("activities")
      .eq("event_id", id);
    if (error) {
      showToast("Errore nel caricamento delle attivita");
      return [];
    }
    const counts = {};
    (data || []).forEach((response) => {
      safeArray(response.activities).forEach((activity) => {
        counts[activity] = (counts[activity] || 0) + 1;
      });
    });
    // Add count data to the ACTIVITIES list
    const activitiesWithCounts = ACTIVITIES.map((activity) =>
      counts[activity.id]
        ? { count: counts[activity.id], ...activity }
        : { count: 0, ...activity },
    );
    setEventActivities(activitiesWithCounts);
  };

  const showToast = (message) => {
    setToast(message);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(eventCode);
    showToast("Codice copiato!");
  };

  const newEvent = () => {
    setEventId(null);
    setEventName("");
    setEventCode("");
    setParticipants([]);
    setCurrentUser(null);
    setSelectedDates([]);
    setSelectedActivities([]);
    setEventActivities([]);
    setSelectedPlaces([]);
    setSelectedTimeslots([]);
    setEventInput("");
    setCodeInput("");
    setUserInput("");
    setStep(1);
    setScreen("home");
  };

  const goHome = () => {
    setScreen(eventId ? "lobby" : "home");
  };

  const startFill = async () => {
    const name = userInput.trim();
    if (!name) return;
    const latestParticipants = await loadParticipants(eventId);
    const existing = latestParticipants.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      showToast(`Hai gia risposto ${name}!`);
      return;
    }
    const color =
      AVATAR_COLORS[latestParticipants.length % AVATAR_COLORS.length];
    setCurrentUser({ name, color });
    setSelectedDates([]);
    setSelectedActivities([]);
    setSelectedPlaces([]);
    setSelectedTimeslots([]);
    setStep(1);
    setScreen("fill");
  };

  const saveResponse = async () => {
    if (!currentUser || !eventId) return;
    setSaving(true);
    const { error } = await sb.from("responses").insert({
      event_id: eventId,
      name: currentUser.name,
      color: currentUser.color,
      dates: selectedDates,
      activities: selectedActivities,
      places: selectedPlaces,
      timeslots: selectedTimeslots,
    });
    setSaving(false);
    if (error) {
      showToast("Errore nel salvataggio");
      return;
    }
    showToast("Risposta salvata!");
    setUserInput("");
    await loadParticipants(eventId);
    setScreen("lobby");
  };

  const loadAndShowResults = async () => {
    await loadParticipants(eventId);
    setScreen("view");
  };

  const results = useMemo(() => {
    const n = participants.length;
    const dateMap = {};
    const actCount = {};
    const placeCount = {};
    const tsCount = {};
    participants.forEach((p) => {
      safeArray(p.dates).forEach((d) => {
        if (!dateMap[d]) dateMap[d] = [];
        dateMap[d].push(p.name);
      });
      safeArray(p.activities).forEach((a) => {
        actCount[a] = (actCount[a] || 0) + 1;
      });
      safeArray(p.places).forEach((place) => {
        placeCount[place] = (placeCount[place] || 0) + 1;
      });
      safeArray(p.timeslots).forEach((timeslot) => {
        tsCount[timeslot] = (tsCount[timeslot] || 0) + 1;
      });
    });
    const threshold = Math.ceil(n / 2);
    const commonActs = Object.entries(actCount)
      .filter((entry) => entry[1] >= threshold)
      .sort((a, b) => b[1] - a[1]);
    const commonPlaces = Object.entries(placeCount)
      .filter((entry) => entry[1] >= threshold)
      .sort((a, b) => b[1] - a[1]);
    const commonTs = Object.entries(tsCount)
      .filter((entry) => entry[1] >= threshold)
      .sort((a, b) => b[1] - a[1]);
    const bestDates = Object.entries(dateMap)
      .filter((entry) => entry[1].length === n)
      .map((entry) => entry[0])
      .sort();
    return { dateMap, commonActs, commonPlaces, commonTs, bestDates };
  }, [participants]);

  const homeSub =
    participants.length === 0
      ? "Evento creato! Condividi il codice."
      : `${participants.length} ${participants.length === 1 ? "persona ha" : "persone hanno"} gia risposto.`;

  return (
    <div className="app-shell">
      <div className="chicken-bg">
        <span className="ch ca ch-1">🐓</span>
        <span className="ch cb ch-2">🥚</span>
        <span className="ch cc ch-3">🥚</span>
        <span className="ch ca ch-4">🐓</span>
        <span className="ch cb ch-5">🐓</span>
        <span className="ch cc ch-6">🥚</span>
      </div>

      <header>
        <div className="logo" onClick={goHome}>
          🐓 <span>Becchiamoci</span>
        </div>
        <div className="header-actions">
          {participants.length > 0 && (
            <div className="pill">{participants.length} persone</div>
          )}
          {screen === "home" && (
            <div className="pill pill-btn" onClick={() => setScreen("info")}>
              come funziona?
            </div>
          )}
        </div>
      </header>

      <main>
        {screen === "home" && (
          <div>
            <h1>
              Quando ci
              <br />
              <span className="acc">becchiamo</span>? 🐓
            </h1>
            <p className="sub">
              Crea un evento, condividi il codice agli altri polli e trovate
              insieme il momento perfetto.
            </p>
            <div className="card">
              <p className="lbl">Crea un nuovo evento</p>
              <input
                type="text"
                placeholder="es. Weekend al lago"
                value={eventInput}
                onChange={(event) => setEventInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && createEvent()}
              />
              <button className="btn" onClick={createEvent}>
                Crea evento
              </button>
            </div>
            <div className="card card-spaced">
              <p className="lbl">Hai gia un codice?</p>
              <input
                type="text"
                placeholder="CODICE"
                className="join-code-input"
                maxLength={6}
                value={codeInput}
                onChange={(event) =>
                  setCodeInput(event.target.value.toUpperCase())
                }
                onKeyDown={(event) =>
                  event.key === "Enter" && joinByCode(codeInput)
                }
              />
              <button className="btn-sec" onClick={() => joinByCode(codeInput)}>
                Unisciti all evento
              </button>
            </div>
          </div>
        )}

        {screen === "lobby" && (
          <div>
            <h1 className="lobby-title">{eventName}</h1>
            <p className="sub">{homeSub}</p>
            <div className="card card-center">
              <p className="lbl">Codice evento</p>
              <div className="event-code">{eventCode}</div>
              <button className="btn-sec copy-code-btn" onClick={copyCode}>
                Copia codice
              </button>
            </div>
            <button className="btn" onClick={() => setScreen("join")}>
              Aggiungi la mia disponibilita
            </button>
            {participants.length >= 1 && (
              <button className="btn-sec" onClick={loadAndShowResults}>
                Vedi i risultati
              </button>
            )}
            <button className="btn-sec new-event-btn" onClick={newEvent}>
              Nuovo evento
            </button>
          </div>
        )}

        {screen === "join" && (
          <div>
            <div className="fill-head">
              <h1 className="lobby-title">{eventName}</h1>
            </div>
            <p className="lbl join-label">Chi sei?</p>
            <h1 className="join-title">Inserisci il tuo nome</h1>
            <p className="sub">
              Cosi gli altri polli sapranno chi ha risposto.
            </p>
            <div className="card">
              <input
                type="text"
                placeholder="Il tuo nome..."
                value={userInput}
                onChange={(event) => setUserInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && startFill()}
              />
              <button className="btn" onClick={startFill}>
                Continua
              </button>
              <button className="btn-sec" onClick={() => setScreen("lobby")}>
                Indietro
              </button>
            </div>
          </div>
        )}

        {screen === "fill" && currentUser && (
          <FillScreen
            eventName={eventName}
            currentUser={currentUser}
            monthInfo={monthInfo}
            selectedDates={selectedDates}
            selectedActivities={selectedActivities}
            eventActivities={eventActivities}
            selectedPlaces={selectedPlaces}
            selectedTimeslots={selectedTimeslots}
            step={step}
            saving={saving}
            setStep={setStep}
            setSelectedDates={setSelectedDates}
            setSelectedActivities={setSelectedActivities}
            setSelectedPlaces={setSelectedPlaces}
            setSelectedTimeslots={setSelectedTimeslots}
            fetchEventActivities={fetchEventActivities}
            saveResponse={saveResponse}
          />
        )}

        {screen === "view" && (
          <ResultsScreen
            eventName={eventName}
            eventCode={eventCode}
            participants={participants}
            results={results}
            monthInfo={monthInfo}
            showToast={showToast}
            setScreen={setScreen}
          />
        )}

        {screen === "info" && (
          <div>
            <h1 className="info-title">Come funziona?</h1>
            <div className="info-box">
              <h3>1. Crea l evento</h3>
              <p>Dai un nome e ricevi un codice univoco da condividere.</p>
            </div>
            <div className="info-box">
              <h3>2. Condividi il codice</h3>
              <p>
                Manda il codice agli amici su WhatsApp. Loro aprono il sito e
                inseriscono le loro preferenze.
              </p>
            </div>
            <div className="info-box">
              <h3>3. Vedi i risultati</h3>
              <p>
                Il calendario mostra per ogni giorno quante persone sono
                disponibili. Clicca un giorno per vedere i nomi.
              </p>
            </div>
            <button
              className="btn"
              onClick={() => setScreen(eventId ? "lobby" : "home")}
            >
              Torna all evento
            </button>
          </div>
        )}
      </main>

      <div className={`toast ${toastVisible ? "show" : ""}`}>{toast}</div>
    </div>
  );
}

function FillScreen({
  eventName,
  currentUser,
  monthInfo,
  selectedDates,
  selectedActivities,
  eventActivities,
  selectedPlaces,
  selectedTimeslots,
  step,
  saving,
  setStep,
  setSelectedDates,
  setSelectedActivities,
  setSelectedPlaces,
  setSelectedTimeslots,
  fetchEventActivities,
  saveResponse,
}) {
  useEffect(() => {
    fetchEventActivities();
  }, []);

  return (
    <div>
      <div className="fill-head">
        <h1 className="lobby-title">{eventName}</h1>
        <div className="fill-user">
          <div className="avatar" style={{ background: currentUser.color }}>
            {currentUser.name[0].toUpperCase()}
          </div>
          <div>
            <p className="fill-name">{currentUser.name}</p>
          </div>
        </div>
      </div>
      <p className="fill-step">step {step} di 4</p>
      <div className="step-bar">
        {STEPS.map((dot) => (
          <div key={dot.step} className="step-container">
            <p
              className={`step-label ${dot.step < step ? "done" : dot.step === step ? "active" : ""}`}
            >
              {dot.label}
            </p>
            <div
              className={`step-dot ${dot.step < step ? "done" : dot.step === step ? "active" : ""}`}
            />
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="step-title">Quando sei libero?</h2>
          <p className="sub">Tocca i giorni in cui sei disponibile</p>
          <CalendarPicker
            monthInfo={monthInfo}
            selectedDates={selectedDates}
            toggleDate={(dateKey) =>
              setSelectedDates((items) => toggleInArray(items, dateKey))
            }
          />
          <button className="btn" onClick={() => setStep(2)}>
            Continua
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="step-title">Cosa ti va di fare?</h2>
          <p className="sub">Seleziona una o piu attivita</p>
          <div className="card">
            <div className="act-grid">
              {eventActivities
                .sort((a, b) => b.count - a.count)
                .map((activity) => (
                  <div
                    key={activity.id}
                    className={`act-item ${selectedActivities.includes(activity.id) ? "sel" : ""}`}
                    onClick={() =>
                      setSelectedActivities((items) =>
                        toggleInArray(items, activity.id),
                      )
                    }
                  >
                    <span className="item-emoji">{activity.emoji}</span>
                    <span>{activity.label}</span>
                    {activity.count ? (
                      <span className="badge" style={{ marginLeft: "auto" }}>
                        {activity.count}
                      </span>
                    ) : null}
                  </div>
                ))}
            </div>
          </div>
          <button className="btn" onClick={() => setStep(3)}>
            Continua
          </button>
          <button className="btn-sec" onClick={() => setStep(1)}>
            Indietro
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="step-title">Dove ti va di andare?</h2>
          <p className="sub">Seleziona le zone che preferisci</p>
          <div className="card">
            <div className="place-wrap">
              {PLACES.map((place) => (
                <div
                  key={place}
                  className={`place-chip ${selectedPlaces.includes(place) ? "sel" : ""}`}
                  onClick={() =>
                    setSelectedPlaces((items) => toggleInArray(items, place))
                  }
                >
                  {place}
                </div>
              ))}
            </div>
          </div>
          <button className="btn" onClick={() => setStep(4)}>
            Continua
          </button>
          <button className="btn-sec" onClick={() => setStep(2)}>
            Indietro
          </button>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="step-title">Che orari preferisci?</h2>
          <p className="sub">
            Seleziona le fasce orarie in cui sei disponibile
          </p>
          <div className="card">
            <div className="act-grid">
              {TIMESLOTS.map((timeslot) => (
                <div
                  key={timeslot.id}
                  className={`act-item ${selectedTimeslots.includes(timeslot.id) ? "sel" : ""}`}
                  onClick={() =>
                    setSelectedTimeslots((items) =>
                      toggleInArray(items, timeslot.id),
                    )
                  }
                >
                  <span className="item-emoji">{timeslot.emoji}</span>
                  <span>{timeslot.label}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="btn" disabled={saving} onClick={saveResponse}>
            {saving ? "Salvataggio..." : "Salva la mia risposta"}
          </button>
          <button className="btn-sec" onClick={() => setStep(3)}>
            Indietro
          </button>
        </div>
      )}
    </div>
  );
}

function CalendarPicker({ monthInfo, selectedDates, toggleDate }) {
  const blanks = Array.from({ length: monthInfo.startDow });
  const days = Array.from(
    { length: monthInfo.daysInMonth },
    (_, index) => index + 1,
  );
  return (
    <div className="card">
      <p className="month-title">
        {MONTHS[monthInfo.month]} {monthInfo.year}
      </p>
      <div className="day-grid">
        {WD.map((label) => (
          <div className="day-hdr" key={label}>
            {label}
          </div>
        ))}
      </div>
      <div className="day-grid">
        {blanks.map((_, index) => (
          <div key={`blank-${index}`} />
        ))}
        {days.map((day, _) => {
          const date = new Date(monthInfo.year, monthInfo.month, day);
          const dateKey = isoDate(date);
          const isPast = date < monthInfo.today;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <div
              key={dateKey}
              className={`day-cell ${isPast ? "past" : ""} ${isWeekend ? "wknd" : ""} ${selectedDates.includes(dateKey) ? "sel" : ""}`}
              onClick={() => !isPast && toggleDate(dateKey)}
            >
              <span className="dc-num">{day}</span>
            </div>
          );
        })}
      </div>
      <p className="date-count">
        {selectedDates.length} {selectedDates.length === 1 ? "data" : "date"}{" "}
        selezionate
      </p>
    </div>
  );
}

function ResultsScreen({
  eventName,
  eventCode,
  participants,
  results,
  monthInfo,
  showToast,
  setScreen,
}) {
  const n = participants.length;
  const topDate = results.bestDates[0] || null;
  const topAct = results.commonActs.length
    ? ACTIVITIES.find((activity) => activity.id === results.commonActs[0][0])
    : null;
  const topPlace = results.commonPlaces.length
    ? results.commonPlaces[0][0]
    : null;
  const topTs = results.commonTs.length
    ? TIMESLOTS.find((timeslot) => timeslot.id === results.commonTs[0][0])
    : null;
  const casaMiaNames = participants
    .filter((participant) => safeArray(participant.places).includes("Casa mia"))
    .map((participant) => participant.name);
  const topPlaceLabel =
    topPlace === "Casa mia" ? `Casa di ${casaMiaNames.join(" o ")}` : topPlace;

  return (
    <div>
      <div className="view-head">
        <div>
          <h1 className="view-title">{eventName}</h1>
          <p className="view-count">
            {n} {n === 1 ? "risposta" : "risposte"}
          </p>
        </div>
        <button className="btn btn-inline" onClick={() => setScreen("join")}>
          + Aggiungiti
        </button>
      </div>
      <div className="card">
        <p className="lbl">Chi viene</p>
        {participants.map((participant) => (
          <div className="p-row" key={participant.id || participant.name}>
            <div className="avatar" style={{ background: participant.color }}>
              {participant.name[0].toUpperCase()}
            </div>
            <div className="p-name">{participant.name}</div>
            <span className="p-days">
              {safeArray(participant.dates).length} giorni
            </span>
          </div>
        ))}
      </div>

      {n < 2 ? (
        <div className="card empty-results">
          <p className="empty-icon">🐔</p>
          <p className="empty-title">Serve almeno un altra persona</p>
          <p className="empty-copy">
            Condividi il codice{" "}
            <strong className="empty-code">{eventCode}</strong>
          </p>
        </div>
      ) : (
        <div>
          <p className="section-ttl">Risultati</p>
          {(topDate || topAct || topPlace || topTs) && (
            <div className="perfect-card">
              <p className="perfect-title">Il momento perfetto</p>
              {topDate && (
                <p className="perfect-date">{formatFullDate(topDate)}</p>
              )}
              {topTs && <p className="perfect-line">{topTs.label}</p>}
              {topAct && <p className="perfect-line">{topAct.label}</p>}
              {topPlaceLabel && <p className="perfect-line">{topPlaceLabel}</p>}
            </div>
          )}
          <ResultsCalendar
            results={results}
            monthInfo={monthInfo}
            total={n}
            showToast={showToast}
          />
          <VoteSection
            title="Attivita piu votate"
            entries={results.commonActs}
            total={n}
            type="activity"
          />
          <VoteSection
            title="Luoghi preferiti"
            entries={results.commonPlaces}
            total={n}
            type="place"
            participants={participants}
          />
          <VoteSection
            title="Orari preferiti"
            entries={results.commonTs}
            total={n}
            type="timeslot"
          />
        </div>
      )}

      <button className="btn-sec" onClick={() => setScreen("lobby")}>
        Torna all evento
      </button>
    </div>
  );
}

function ResultsCalendar({ results, monthInfo, total, showToast }) {
  const blanks = Array.from({ length: monthInfo.startDow });
  const days = Array.from(
    { length: monthInfo.daysInMonth },
    (_, index) => index + 1,
  );
  return (
    <div className="match-card">
      <p className="match-title">
        Disponibilita per giorno — tocca per vedere chi
      </p>
      <p className="month-title">
        {MONTHS[monthInfo.month]} {monthInfo.year}
      </p>
      <div className="day-grid">
        {WD.map((label) => (
          <div className="day-hdr" key={label}>
            {label}
          </div>
        ))}
      </div>
      <div className="day-grid">
        {blanks.map((_, index) => (
          <div className="res-day empty" key={`blank-${index}`} />
        ))}
        {days.map((day) => {
          const date = new Date(monthInfo.year, monthInfo.month, day);
          const dateKey = isoDate(date);
          const isPast = date < monthInfo.today;
          const voters = results.dateMap[dateKey] || [];
          const count = voters.length;
          const className = `res-day ${isPast ? "past" : ""} ${count > 0 ? "has-votes" : ""} ${count === total ? "all-votes" : ""}`;
          const voterText = count > 0 ? voters.join(", ") : "Nessuno libero";
          return (
            <div
              className={className}
              key={dateKey}
              onClick={() =>
                !isPast && showToast(`${formatShortDate(date)}: ${voterText}`)
              }
            >
              <span className="rd-num">{day}</span>
              {count > 0 && (
                <span className="rd-count">
                  {count}/{total}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span className="legend-item">
          <span className="legend-dot legend-full" />
          tutti liberi
        </span>
        <span className="legend-item">
          <span className="legend-dot legend-some" />
          alcuni liberi
        </span>
        <span className="legend-item">
          <span className="legend-dot legend-none" />
          nessuno
        </span>
      </div>
    </div>
  );
}

function VoteSection({ title, entries, total, type, participants = [] }) {
  const emptyText = {
    activity: "Nessuna attivita in comune.",
    place: "Nessun luogo in comune.",
    timeslot: "Nessun orario in comune.",
  }[type];

  const getLabel = (id) => {
    if (type === "activity")
      return ACTIVITIES.find((activity) => activity.id === id)?.label;
    if (type === "timeslot")
      return TIMESLOTS.find((timeslot) => timeslot.id === id)?.label;
    if (id === "Casa mia") {
      const names = participants
        .filter((participant) =>
          safeArray(participant.places).includes("Casa mia"),
        )
        .map((participant) => participant.name);
      return `Casa di ${names.join(" o ")} (chi ha votato)`;
    }
    return id;
  };

  return (
    <div className="match-card">
      <p className="match-title">{title}</p>
      {entries.length ? (
        entries.map(([id, count]) => {
          const label = getLabel(id);
          if (!label) return null;
          return (
            <div className="match-row" key={id}>
              <span className="match-lbl">{label}</span>
              <span className={`badge ${count === total ? "full" : ""}`}>
                {count}/{total}
              </span>
            </div>
          );
        })
      ) : (
        <p className="muted-row">{emptyText}</p>
      )}
    </div>
  );
}
