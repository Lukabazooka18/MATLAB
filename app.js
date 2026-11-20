const DAYS = [
  { id: "lundi", label: "Lundi" },
  { id: "mardi", label: "Mardi" },
  { id: "mercredi", label: "Mercredi" },
  { id: "jeudi", label: "Jeudi" },
  { id: "vendredi", label: "Vendredi" },
  { id: "samedi", label: "Samedi" },
  { id: "dimanche", label: "Dimanche" },
];

const CATEGORY_LABELS = {
  cours: "Cours",
  labo: "Laboratoire",
  sport: "Sport",
  travail: "Travail",
  libre: "Temps libre",
  autre: "Autre engagement",
};

const CATEGORY_ICONS = {
  cours: "▤",
  labo: "⌁",
  sport: "◌",
  travail: "▣",
  libre: "☼",
  autre: "◇",
  study: "✳",
};

const STORAGE_KEY = "tempo-study-planner-v1";
const TIMES = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
const END_TIMES = [...TIMES.slice(1), "24:00"];
const $ = (selector) => document.querySelector(selector);

function emptyState() {
  return {
    profile: { courseCount: 4, labCount: 1, wakeTime: "07:00", sleepTime: "23:00", dailyCap: 3 },
    preferences: {},
    events: [],
    studies: [],
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyState();
    const parsed = JSON.parse(saved);
    const defaults = emptyState();
    return {
      profile: { ...defaults.profile, ...(parsed.profile || {}) },
      preferences: parsed.preferences && typeof parsed.preferences === "object" ? parsed.preferences : {},
      events: Array.isArray(parsed.events) ? parsed.events : [],
      studies: Array.isArray(parsed.studies) ? parsed.studies : [],
    };
  } catch (error) {
    showNotice("Les données enregistrées n’ont pas pu être lues. Vous pouvez recommencer un horaire.");
    return emptyState();
  }
}

let state = loadState();
let noticeTimer;

function showNotice(message, success = false) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.classList.toggle("success", success);
  notice.hidden = false;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 5500);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    showNotice("Impossible d’enregistrer vos changements dans ce navigateur.", false);
  }
}

function fillSelect(select, options, selectedValue) {
  select.replaceChildren(...options.map(({ value, label }) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;
    return option;
  }));
  if (selectedValue !== undefined) select.value = String(selectedValue);
}

function numberOptions(min, max, step, suffix = "") {
  const options = [];
  for (let value = min; value <= max + 0.0001; value += step) {
    const normalized = Number(value.toFixed(1));
    options.push({ value: normalized, label: `${normalized.toLocaleString("fr-CA")} ${suffix}`.trim() });
  }
  return options;
}

function timeOptions(values) {
  return values.map((value) => ({ value, label: value }));
}

function courseKey(category, number) {
  return `${category}-${number}`;
}

function courseLabel(key) {
  const [category, number] = key.split("-");
  return `${CATEGORY_LABELS[category]} ${number}`;
}

function selectedCourseKey() {
  const category = $("#event-category").value;
  return courseKey(category, $("#course-id").value);
}

function isAcademic(category) {
  return category === "cours" || category === "labo";
}

function populateCourseOptions() {
  const category = $("#event-category").value;
  const count = category === "cours" ? state.profile.courseCount : state.profile.labCount;
  const options = Array.from({ length: Number(count) }, (_, index) => ({
    value: index + 1,
    label: `${CATEGORY_LABELS[category]} ${index + 1}`,
  }));
  fillSelect($("#course-id"), options);
  fillSelect($("#manual-course"), [
    ...Array.from({ length: Number(state.profile.courseCount) }, (_, index) => ({
      value: courseKey("cours", index + 1),
      label: courseLabel(courseKey("cours", index + 1)),
    })),
    ...Array.from({ length: Number(state.profile.labCount) }, (_, index) => ({
      value: courseKey("labo", index + 1),
      label: courseLabel(courseKey("labo", index + 1)),
    })),
  ]);
  $("#course-select-label").textContent = CATEGORY_LABELS[category];
  const academic = isAcademic(category);
  $("#course-fields").hidden = !academic;
  if (academic) updatePreferenceFields();
}

function updatePreferenceFields() {
  const preference = state.preferences[selectedCourseKey()] || { difficulty: 2, hours: 2 };
  $("#difficulty").value = String(preference.difficulty);
  $("#study-target").value = String(preference.hours);
}

function populateFormOptions() {
  fillSelect($("#course-count"), numberOptions(1, 8, 1), state.profile.courseCount);
  fillSelect($("#lab-count"), numberOptions(0, 6, 1), state.profile.labCount);
  fillSelect($("#wake-time"), timeOptions(TIMES), state.profile.wakeTime);
  fillSelect($("#sleep-time"), timeOptions(TIMES), state.profile.sleepTime);
  fillSelect($("#daily-cap"), numberOptions(1, 6, 0.5, "h"), state.profile.dailyCap);
  fillSelect($("#event-day"), DAYS.map(({ id, label }) => ({ value: id, label })), "lundi");
  fillSelect($("#manual-day"), DAYS.map(({ id, label }) => ({ value: id, label })), "lundi");
  fillSelect($("#event-start"), timeOptions(TIMES), "09:00");
  fillSelect($("#event-end"), timeOptions(END_TIMES), "10:00");
  fillSelect($("#manual-start"), timeOptions(TIMES), "14:00");
  fillSelect($("#manual-duration"), numberOptions(0.5, 2, 0.5, "h"), 1);
  fillSelect($("#study-target"), numberOptions(0.5, 8, 0.5, "h"), 2);
  populateCourseOptions();
}

function minutes(time) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function formatTime(value) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function dayName(id) {
  return DAYS.find((day) => day.id === id)?.label || id;
}

function eventName(event) {
  return isAcademic(event.category)
    ? courseLabel(courseKey(event.category, event.courseNumber))
    : CATEGORY_LABELS[event.category];
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function isAwake(start, end) {
  const wake = minutes(state.profile.wakeTime);
  const sleep = minutes(state.profile.sleepTime);
  if (wake === sleep) return false;
  if (sleep > wake) return start >= wake && end <= sleep;
  return (start >= wake && end <= 1440) || (start >= 0 && end <= sleep);
}

function eventConflict(day, start, end, excludedEventId = null) {
  return state.events.some((event) =>
    event.id !== excludedEventId && event.day === day &&
    overlaps(start, end, minutes(event.start), minutes(event.end)));
}

function studyConflict(day, start, end, excludedStudyId = null) {
  return state.studies.some((study) =>
    study.id !== excludedStudyId && study.day === day &&
    overlaps(start, end, minutes(study.start), minutes(study.end)));
}

function renderEvents() {
  const list = $("#event-list");
  list.replaceChildren();
  $("#event-total").textContent = String(state.events.length);
  $("#commitment-count").textContent = String(state.events.length);
  $("#empty-events").hidden = state.events.length > 0;
  for (const event of [...state.events].sort((a, b) =>
    DAYS.findIndex((day) => day.id === a.day) - DAYS.findIndex((day) => day.id === b.day) ||
    minutes(a.start) - minutes(b.start))) {
    const item = document.createElement("li");
    item.className = "event-row";
    const main = document.createElement("div");
    main.className = "event-main";
    const icon = document.createElement("span");
    icon.className = "event-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = CATEGORY_ICONS[event.category] || "◇";
    const text = document.createElement("div");
    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = eventName(event);
    const meta = document.createElement("div");
    meta.className = "event-meta";
    meta.textContent = `${dayName(event.day)} · ${event.start}–${event.end}`;
    text.append(title, meta);
    main.append(icon, text);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.dataset.removeEvent = event.id;
    remove.setAttribute("aria-label", `Retirer ${eventName(event)} du ${dayName(event.day)}`);
    remove.textContent = "×";
    item.append(main, remove);
    list.append(item);
  }
}

function renderSchedule() {
  const grid = $("#schedule-grid");
  grid.replaceChildren();
  const allItems = [
    ...state.events.map((event) => ({ ...event, kind: event.category, title: eventName(event) })),
    ...state.studies.map((study) => ({ ...study, kind: "study", title: courseLabel(study.courseKey) })),
  ];
  $("#empty-schedule").hidden = allItems.length > 0;
  grid.hidden = allItems.length === 0;
  for (const day of DAYS) {
    const dayItems = allItems.filter((item) => item.day === day.id)
      .sort((a, b) => minutes(a.start) - minutes(b.start));
    const card = document.createElement("article");
    card.className = "day-card";
    const header = document.createElement("div");
    header.className = "day-header";
    const name = document.createElement("strong");
    name.textContent = day.label;
    const count = document.createElement("span");
    count.textContent = dayItems.length ? `${dayItems.length} act.` : "—";
    header.append(name, count);
    const items = document.createElement("div");
    items.className = "day-events";
    if (!dayItems.length) {
      const empty = document.createElement("div");
      empty.className = "day-empty";
      empty.textContent = "Journée libre";
      items.append(empty);
    }
    for (const item of dayItems) {
      const entry = document.createElement("div");
      entry.className = `day-event${item.kind === "study" ? " study" : ""}`;
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = CATEGORY_ICONS[item.kind] || "◇";
      const text = document.createElement("div");
      const time = document.createElement("div");
      time.className = "day-event-time";
      time.textContent = `${item.start}–${item.end}`;
      const title = document.createElement("div");
      title.className = "day-event-title";
      title.textContent = item.title;
      text.append(time, title);
      entry.append(icon, text);
      items.append(entry);
    }
    card.append(header, items);
    grid.append(card);
  }
}

function renderStudies() {
  const list = $("#study-list");
  list.replaceChildren();
  $("#empty-studies").hidden = state.studies.length > 0;
  const totalMinutes = state.studies.reduce((sum, study) => sum + minutes(study.end) - minutes(study.start), 0);
  const hours = totalMinutes / 60;
  $("#study-hours").textContent = `${hours.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} h`;
  for (const study of state.studies) {
    const card = document.createElement("article");
    card.className = "study-card";
    const head = document.createElement("div");
    head.className = "study-card-head";
    const title = document.createElement("strong");
    title.textContent = courseLabel(study.courseKey);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.dataset.removeStudy = study.id;
    remove.setAttribute("aria-label", `Retirer la séance de ${courseLabel(study.courseKey)}`);
    remove.textContent = "×";
    head.append(title, remove);

    const fields = document.createElement("div");
    fields.className = "study-card-fields";
    const dayField = makeStudyField("Jour", "day", study.id);
    fillSelect(dayField.select, DAYS.map(({ id, label }) => ({ value: id, label })), study.day);
    const startField = makeStudyField("Début", "start", study.id);
    fillSelect(startField.select, timeOptions(TIMES), study.start);
    const durationField = makeStudyField("Durée", "duration", study.id);
    fillSelect(durationField.select, numberOptions(0.5, 2, 0.5, "h"), (minutes(study.end) - minutes(study.start)) / 60);
    fields.append(dayField.wrapper, startField.wrapper, durationField.wrapper);

    const actions = document.createElement("div");
    actions.className = "study-actions";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "tiny-button";
    save.dataset.saveStudy = study.id;
    save.textContent = "Enregistrer";
    actions.append(save);
    card.append(head, fields, actions);
    list.append(card);
  }
}

function makeStudyField(label, name, studyId) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const caption = document.createElement("span");
  caption.textContent = label;
  const select = document.createElement("select");
  select.dataset.studyId = studyId;
  select.dataset.studyField = name;
  wrapper.append(caption, select);
  return { wrapper, select };
}

function renderAll() {
  renderEvents();
  renderStudies();
  renderSchedule();
}

function updateProfile(field, value) {
  const previous = state.profile[field];
  const next = field === "wakeTime" || field === "sleepTime" ? value : Number(value);
  state.profile[field] = next;
  if (field === "wakeTime" || field === "sleepTime") {
    const invalidHours = minutes(state.profile.wakeTime) === minutes(state.profile.sleepTime);
    const conflictsWithCommitment = state.events.some((event) =>
      !isAwake(minutes(event.start), minutes(event.end)));
    const conflictsWithStudy = state.studies.some((study) =>
      !isAwake(minutes(study.start), minutes(study.end)));
    if (invalidHours || conflictsWithCommitment || conflictsWithStudy) {
      state.profile[field] = previous;
      $(`#${field === "wakeTime" ? "wake-time" : "sleep-time"}`).value = previous;
      showNotice(invalidHours
        ? "Choisissez des heures de lever et de coucher différentes."
        : "Ces heures rendraient une activité ou une séance existante incompatible avec votre période d’éveil.");
      return;
    }
  }
  if (field === "dailyCap") {
    const exceedsLimit = DAYS.some(({ id }) => {
      const dailyMinutes = state.studies
        .filter((study) => study.day === id)
        .reduce((sum, study) => sum + minutes(study.end) - minutes(study.start), 0);
      return dailyMinutes > next * 60;
    });
    if (exceedsLimit) {
      state.profile[field] = previous;
      $("#daily-cap").value = String(previous);
      showNotice("Ce maximum est plus bas que le temps déjà planifié pour une journée. Ajustez vos séances d’abord.");
      return;
    }
  }
  saveState();
  if (field === "courseCount" || field === "labCount") {
    populateCourseOptions();
    renderStudies();
  }
}

function addEvent(event) {
  const category = $("#event-category").value;
  const day = $("#event-day").value;
  const start = $("#event-start").value;
  const end = $("#event-end").value;
  const startMinutes = minutes(start);
  const endMinutes = minutes(end);
  if (endMinutes <= startMinutes) {
    showNotice("L’heure de fin doit être après l’heure de début.");
    return;
  }
  if (!isAwake(startMinutes, endMinutes)) {
    showNotice("Cet engagement se trouve en dehors de votre période d’éveil. Vérifiez vos heures de lever et de coucher.");
    return;
  }
  if (eventConflict(day, startMinutes, endMinutes)) {
    showNotice("Cet horaire chevauche déjà un autre engagement cette journée-là.");
    return;
  }
  if (studyConflict(day, startMinutes, endMinutes)) {
    showNotice("Cet horaire chevauche une séance d’étude. Déplacez-la ou retirez-la avant d’ajouter l’activité.");
    return;
  }

  const newEvent = { id: crypto.randomUUID(), category, day, start, end };
  if (isAcademic(category)) {
    const number = Number($("#course-id").value);
    const key = courseKey(category, number);
    newEvent.courseNumber = number;
    state.preferences[key] = {
      difficulty: Number($("#difficulty").value),
      hours: Number($("#study-target").value),
    };
  }
  state.events.push(newEvent);
  saveState();
  renderAll();
  showNotice("Engagement ajouté à votre semaine.", true);
}

function availableStudySlots() {
  const blocked = DAYS.map(() => Array(48).fill(false));
  for (const event of state.events) {
    const dayIndex = DAYS.findIndex((day) => day.id === event.day);
    const start = minutes(event.start);
    const end = minutes(event.end);
    for (let slot = 0; slot < 48; slot += 1) {
      const slotStart = slot * 30;
      const slotEnd = slotStart + 30;
      if (overlaps(slotStart, slotEnd, start - 30, end + 30) ||
          !isAwake(slotStart, slotEnd)) blocked[dayIndex][slot] = true;
    }
  }
  return blocked;
}

function chooseStudySlot(blocked, countByDay, dailyCapMinutes, requiredSlots) {
  const candidates = [];
  for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex += 1) {
    const proposedMinutes = requiredSlots * 30;
    if (countByDay[dayIndex] + proposedMinutes > dailyCapMinutes) continue;
    for (let start = 0; start <= 48 - requiredSlots; start += 1) {
      let free = true;
      for (let offset = 0; offset < requiredSlots; offset += 1) {
        if (blocked[dayIndex][start + offset]) {
          free = false;
          break;
        }
      }
      if (free) {
        candidates.push({
          dayIndex,
          start,
          allocated: countByDay[dayIndex],
          preferredTime: Math.abs(start * 30 - 16 * 60),
        });
      }
    }
  }
  candidates.sort((a, b) =>
    a.allocated - b.allocated ||
    a.preferredTime - b.preferredTime ||
    a.dayIndex - b.dayIndex);
  return candidates[0] || null;
}

function generatePlan() {
  if (minutes(state.profile.wakeTime) === minutes(state.profile.sleepTime)) {
    showNotice("Choisissez des heures de lever et de coucher différentes.");
    return;
  }

  const courses = new Map();
  for (const event of state.events) {
    if (!isAcademic(event.category)) continue;
    const key = courseKey(event.category, event.courseNumber);
    const preference = state.preferences[key] || { difficulty: 2, hours: 2 };
    if (!courses.has(key)) courses.set(key, { key, difficulty: preference.difficulty, remaining: Math.round(preference.hours * 2) });
  }
  if (!courses.size) {
    showNotice("Ajoutez au moins un cours ou un laboratoire pour créer un plan d’étude.");
    return;
  }

  const blocked = availableStudySlots();
  const countByDay = Array(DAYS.length).fill(0);
  const dailyCapMinutes = Number(state.profile.dailyCap) * 60;
  const studies = [];
  const sortedCourses = [...courses.values()].sort((a, b) =>
    b.difficulty - a.difficulty || a.key.localeCompare(b.key));

  for (const course of sortedCourses) {
    while (course.remaining > 0) {
      const chunk = course.remaining >= 2 ? 2 : 1;
      let slot = chooseStudySlot(blocked, countByDay, dailyCapMinutes, chunk);
      let durationSlots = chunk;
      if (!slot && chunk === 2) {
        slot = chooseStudySlot(blocked, countByDay, dailyCapMinutes, 1);
        durationSlots = 1;
      }
      if (!slot) break;

      const start = slot.start * 30;
      const end = start + durationSlots * 30;
      const dayIndex = slot.dayIndex;
      studies.push({
        id: crypto.randomUUID(),
        courseKey: course.key,
        day: DAYS[dayIndex].id,
        start: formatTime(start),
        end: formatTime(end),
      });
      countByDay[dayIndex] += durationSlots * 30;
      for (let offset = -1; offset <= durationSlots; offset += 1) {
        const index = slot.start + offset;
        if (index >= 0 && index < 48) blocked[dayIndex][index] = true;
      }
      course.remaining -= durationSlots;
    }
  }

  state.studies = studies;
  saveState();
  renderAll();
  const planned = studies.reduce((sum, study) => sum + minutes(study.end) - minutes(study.start), 0);
  const requested = [...courses.values()].reduce((sum, course) => sum + course.remaining, 0);
  if (requested > 0) {
    const unplacedHours = requested / 2;
    showNotice(`Horaire créé avec ${planned / 60} h d’étude. ${unplacedHours.toLocaleString("fr-CA")} h souhaitées n’ont pas pu être placées; vous pouvez ajuster votre maximum quotidien.`);
  } else {
    showNotice(`Votre horaire est prêt : ${planned / 60} h d’étude réparties dans la semaine.`, true);
  }
}

function addManualStudy(event) {
  event.preventDefault();
  const courseKeyValue = $("#manual-course").value;
  if (!courseKeyValue) {
    showNotice("Choisissez un cours à étudier.");
    return;
  }
  const day = $("#manual-day").value;
  const start = minutes($("#manual-start").value);
  const duration = Number($("#manual-duration").value) * 60;
  const end = start + duration;
  if (end > 1440 || !isAwake(start, end)) {
    showNotice("Cette séance se trouve en dehors de votre période d’éveil.");
    return;
  }
  if (eventConflict(day, start, end) || studyConflict(day, start, end)) {
    showNotice("Cette séance chevauche déjà une activité ou une autre séance.");
    return;
  }
  const dailyMinutes = state.studies
    .filter((study) => study.day === day)
    .reduce((sum, study) => sum + minutes(study.end) - minutes(study.start), 0);
  if (dailyMinutes + duration > Number(state.profile.dailyCap) * 60) {
    showNotice("Cette séance dépasserait votre maximum d’étude quotidien.");
    return;
  }
  state.studies.push({
    id: crypto.randomUUID(),
    courseKey: courseKeyValue,
    day,
    start: formatTime(start),
    end: formatTime(end),
  });
  saveState();
  renderAll();
  showNotice("Séance d’étude ajoutée.", true);
}

function saveStudyEdit(button) {
  const study = state.studies.find((item) => item.id === button.dataset.saveStudy);
  if (!study) return;
  const fields = [...document.querySelectorAll(`[data-study-id="${CSS.escape(study.id)}"]`)];
  const values = Object.fromEntries(fields.map((field) => [field.dataset.studyField, field.value]));
  const start = minutes(values.start);
  const duration = Number(values.duration) * 60;
  const end = start + duration;
  if (end > 1440 || !isAwake(start, end)) {
    showNotice("Cette séance se trouve en dehors de votre période d’éveil.");
    return;
  }
  if (eventConflict(values.day, start, end) || studyConflict(values.day, start, end, study.id)) {
    showNotice("Cette séance chevauche une activité ou une autre séance.");
    return;
  }
  const otherDailyMinutes = state.studies
    .filter((item) => item.id !== study.id && item.day === values.day)
    .reduce((sum, item) => sum + minutes(item.end) - minutes(item.start), 0);
  if (otherDailyMinutes + duration > Number(state.profile.dailyCap) * 60) {
    showNotice("Cette séance dépasserait votre maximum d’étude quotidien.");
    return;
  }
  study.day = values.day;
  study.start = formatTime(start);
  study.end = formatTime(end);
  saveState();
  renderAll();
  showNotice("Séance mise à jour.", true);
}

function bindEvents() {
  $("#event-category").addEventListener("change", populateCourseOptions);
  $("#course-id").addEventListener("change", updatePreferenceFields);
  $("#event-form").addEventListener("submit", (event) => {
    event.preventDefault();
    addEvent(event);
  });
  $("#manual-form").addEventListener("submit", addManualStudy);
  $("#generate-button").addEventListener("click", generatePlan);

  for (const field of ["courseCount", "labCount", "wakeTime", "sleepTime", "dailyCap"]) {
    const controlId = {
      courseCount: "course-count",
      labCount: "lab-count",
      wakeTime: "wake-time",
      sleepTime: "sleep-time",
      dailyCap: "daily-cap",
    }[field];
    $(`#${controlId}`).addEventListener("change", (event) => updateProfile(field, event.target.value));
  }

  $("#difficulty").addEventListener("change", saveCurrentPreference);
  $("#study-target").addEventListener("change", saveCurrentPreference);
  document.addEventListener("click", (event) => {
    const removeEventButton = event.target.closest("[data-remove-event]");
    if (removeEventButton) {
      state.events = state.events.filter((item) => item.id !== removeEventButton.dataset.removeEvent);
      saveState();
      renderAll();
      return;
    }
    const removeStudyButton = event.target.closest("[data-remove-study]");
    if (removeStudyButton) {
      state.studies = state.studies.filter((item) => item.id !== removeStudyButton.dataset.removeStudy);
      saveState();
      renderAll();
      return;
    }
    const saveButton = event.target.closest("[data-save-study]");
    if (saveButton) saveStudyEdit(saveButton);
  });
}

function saveCurrentPreference() {
  const category = $("#event-category").value;
  if (!isAcademic(category)) return;
  state.preferences[selectedCourseKey()] = {
    difficulty: Number($("#difficulty").value),
    hours: Number($("#study-target").value),
  };
  saveState();
}

populateFormOptions();
bindEvents();
renderAll();
